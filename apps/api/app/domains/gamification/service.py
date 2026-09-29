import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.gamification.schemas import (
    PracticeSessionCreate,
    PracticeSessionOut,
    UserProgressOut,
)
from app.infrastructure.database.models import PracticeSession, UserProgress


class GamificationService:
    XP_PER_LEVEL = 100

    @classmethod
    async def get_user_progress(cls, db: AsyncSession, user_id: uuid.UUID) -> UserProgressOut:
        stmt = select(UserProgress).where(UserProgress.user_id == user_id)
        result = await db.execute(stmt)
        progress = result.scalar_one_or_none()

        if not progress:
            # Create default progress
            progress = UserProgress(user_id=user_id)
            db.add(progress)
            await db.commit()
            await db.refresh(progress)

        return UserProgressOut(
            total_xp=progress.total_xp,
            current_level=progress.current_level,
            current_streak=progress.current_streak,
            last_practice_date=progress.last_practice_date,
        )

    @classmethod
    async def record_practice_session(
        cls, db: AsyncSession, user_id: uuid.UUID, session_in: PracticeSessionCreate
    ) -> PracticeSessionOut:
        # Create practice session record
        session = PracticeSession(
            user_id=user_id,
            project_id=session_in.project_id,
            score=session_in.score,
            accuracy_percent=session_in.accuracy_percent,
        )
        db.add(session)

        # Calculate XP gained
        xp_gained = int(session_in.score * (session_in.accuracy_percent / 100.0))

        # Update user progress
        stmt = select(UserProgress).where(UserProgress.user_id == user_id)
        result = await db.execute(stmt)
        progress = result.scalar_one_or_none()

        if not progress:
            progress = UserProgress(user_id=user_id)
            db.add(progress)

        # Streak logic
        today = datetime.now(UTC).date()
        if progress.last_practice_date:
            delta_days: int = (today - progress.last_practice_date).days
            if delta_days == 1:
                progress.current_streak += 1
            elif delta_days > 1:
                progress.current_streak = 1
        else:
            progress.current_streak = 1

        progress.last_practice_date = today  # type: ignore
        progress.total_xp += xp_gained

        # Level up logic
        old_level = progress.current_level
        new_level = (progress.total_xp // cls.XP_PER_LEVEL) + 1
        level_up = new_level > old_level
        if level_up:
            progress.current_level = new_level

        await db.commit()
        await db.refresh(session)

        return PracticeSessionOut(
            id=session.id,
            project_id=session.project_id,
            score=session.score,
            accuracy_percent=session.accuracy_percent,
            xp_gained=xp_gained,
            level_up=level_up,
            current_level=progress.current_level,
            total_xp=progress.total_xp,
            current_streak=progress.current_streak,
        )
