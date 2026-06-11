"""Current-user dependency.

AUTH_MODE=dev: a fixed local user (no token needed) so the whole API is
exercisable before Supabase Auth lands in Phase 9. AUTH_MODE=supabase:
JWT verification — implemented in Phase 9; until then it refuses to boot
rather than silently allowing anonymous access.
"""

from dataclasses import dataclass
from uuid import UUID

from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.infrastructure.database.repositories import UserRepository
from app.infrastructure.database.session import get_db

DEV_USER_EMAIL = "dev@pianoflow.local"


@dataclass(frozen=True)
class CurrentUser:
    id: UUID
    email: str


def get_current_user(db: Session = Depends(get_db)) -> CurrentUser:
    settings = get_settings()
    if settings.auth_mode == "dev":
        user = UserRepository(db).get_or_create_by_email(DEV_USER_EMAIL, "Dev User")
        return CurrentUser(id=user.id, email=user.email)
    raise NotImplementedError("AUTH_MODE=supabase arrives in Phase 9")
