"""Current-user dependency.

AUTH_MODE=dev  → fixed local user (no token needed).
AUTH_MODE=supabase → verifies Supabase JWT, syncs user to local DB.
"""

from dataclasses import dataclass
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


@dataclass(frozen=True)
class CurrentUser:
    id: UUID
    email: str


def _verify_supabase_token(token: str) -> dict:
    settings = get_settings()
    if not settings.supabase_jwt_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SUPABASE_JWT_SECRET not configured.",
        )
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired.",
        ) from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token.",
        ) from exc
    return payload


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
