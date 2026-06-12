"""Current-user dependency.

AUTH_MODE=dev: a fixed local user (no token needed) so the whole API is
exercisable without Supabase. AUTH_MODE=supabase: verifies the Supabase
Auth JWT (HS256, shared secret) from the Authorization header and mirrors
the identity into the app users table on first request (DATABASE.md §3).
"""

from dataclasses import dataclass
from uuid import UUID

import jwt
from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import UnauthorizedError
from app.infrastructure.database.repositories import UserRepository
from app.infrastructure.database.session import get_db

DEV_USER_EMAIL = "dev@pianoflow.local"

SUPABASE_AUDIENCE = "authenticated"


@dataclass(frozen=True)
class CurrentUser:
    id: UUID
    email: str


def _decode_supabase_token(token: str, secret: str) -> tuple[UUID, str]:
    try:
        claims = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            audience=SUPABASE_AUDIENCE,
            options={"require": ["exp", "sub"]},
        )
    except jwt.ExpiredSignatureError as exc:
        raise UnauthorizedError("Session expired — sign in again.", code="TOKEN_EXPIRED") from exc
    except jwt.InvalidTokenError as exc:
        raise UnauthorizedError("Invalid authentication token.", code="TOKEN_INVALID") from exc

    try:
        user_id = UUID(str(claims["sub"]))
    except ValueError as exc:
        raise UnauthorizedError("Invalid authentication token.", code="TOKEN_INVALID") from exc

    email = str(claims.get("email") or "")
    if not email:
        raise UnauthorizedError("Token is missing an email claim.", code="TOKEN_INVALID")
    return user_id, email


def get_current_user(request: Request, db: Session = Depends(get_db)) -> CurrentUser:
    settings = get_settings()

    if settings.auth_mode == "dev":
        user = UserRepository(db).get_or_create_by_email(DEV_USER_EMAIL, "Dev User")
        return CurrentUser(id=user.id, email=user.email)

    # AUTH_MODE=supabase — refuse to run unauthenticated rather than fall back.
    if not settings.supabase_jwt_secret:
        raise UnauthorizedError(
            "Server auth is misconfigured (missing JWT secret).", code="AUTH_MISCONFIGURED"
        )

    authorization = request.headers.get("Authorization", "")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise UnauthorizedError("Missing bearer token.", code="TOKEN_MISSING")

    user_id, email = _decode_supabase_token(token, settings.supabase_jwt_secret)
    user = UserRepository(db).sync_supabase_user(user_id, email)
    return CurrentUser(id=user.id, email=user.email)
