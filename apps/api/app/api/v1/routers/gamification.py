from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.domains.gamification.schemas import (
    PracticeSessionCreate,
    PracticeSessionOut,
    UserProgressOut,
)
from app.domains.gamification.service import GamificationService
from app.infrastructure.database.models import User
from app.infrastructure.database.session import get_db

router = APIRouter(prefix="/api/v1", tags=["gamification"])


@router.get("/user/progress", response_model=UserProgressOut)
async def get_user_progress(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await GamificationService.get_user_progress(db, current_user.id)


@router.post("/practice-sessions", response_model=PracticeSessionOut)
async def create_practice_session(
    session_in: PracticeSessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await GamificationService.record_practice_session(db, current_user.id, session_in)
