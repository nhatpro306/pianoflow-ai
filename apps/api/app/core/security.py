"""Current-user dependency.

AUTH_MODE=dev  → fixed local user (no token needed).
AUTH_MODE=supabase → verifies Supabase JWT, syncs user to local DB.

Token verification supports both Supabase signing schemes:
- New projects sign with asymmetric keys (ES256/RS256) — verified via the
  project's JWKS endpoint ({SUPABASE_URL}/auth/v1/.well-known/jwks.json).
- Legacy projects sign HS256 with the shared SUPABASE_JWT_SECRET.
The token's alg header picks the path; at least one must be configured.
"""

from dataclasses import dataclass
from functools import lru_cache
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.infrastructure.database.repositories import UserRepository
from app.infrastructure.database.session import get_db

DEV_USER_EMAIL = "dev@pianoflow.local"

_bearer_scheme = HTTPBearer(auto_error=False)

_ASYMMETRIC_ALGS = ("ES256", "RS256")


@dataclass(frozen=True)
class CurrentUser:
    id: UUID
    email: str


@lru_cache
def _jwks_client(supabase_url: str) -> jwt.PyJWKClient:
    return jwt.PyJWKClient(
        f"{supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json",
        cache_keys=True,
        lifespan=3600,
    )


def _decode(token: str) -> dict:
    """Pick the verification path from the token's alg header."""
    settings = get_settings()
    header = jwt.get_unverified_header(token)
    alg = header.get("alg", "")

    if alg in _ASYMMETRIC_ALGS:
        if not settings.supabase_url:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="SUPABASE_URL not configured (needed for JWKS verification).",
            )
        signing_key = _jwks_client(settings.supabase_url).get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=list(_ASYMMETRIC_ALGS),
            audience="authenticated",
        )

    if not settings.supabase_jwt_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SUPABASE_JWT_SECRET not configured.",
        )
    return jwt.decode(
        token,
        settings.supabase_jwt_secret,
        algorithms=["HS256"],
        audience="authenticated",
    )


def _verify_supabase_token(token: str) -> dict:
    try:
        return _decode(token)
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired.",
        ) from exc
    except jwt.PyJWKClientError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token.",
        ) from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token.",
        ) from exc


def get_current_user(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> CurrentUser:
    settings = get_settings()

    if settings.auth_mode == "dev":
        user = UserRepository(db).get_or_create_by_email(DEV_USER_EMAIL, "Dev User")
        db.commit()
        return CurrentUser(id=user.id, email=user.email)

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = _verify_supabase_token(credentials.credentials)
    sub = payload.get("sub")
    email = payload.get("email", "")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing sub claim.",
        )

    user = UserRepository(db).get_or_create_by_email(
        email, payload.get("user_metadata", {}).get("display_name")
    )
    if str(user.id) != sub:
        user.id = UUID(sub)
        db.flush()
    db.commit()
    return CurrentUser(id=user.id, email=email)
