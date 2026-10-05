import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domains.gamification.schemas import (
    PracticeSessionCreate,
    PracticeSessionOut,
    UserProgressOut,
)
from app.infrastructure.database.models import PracticeSession, UserProgress


class GamificationService:
    XP_PER_LEVEL = 100

    @classmethod
    def get_user_progress(cls, db: Session, user_id: uuid.UUID) -> UserProgressOut:
        stmt = select(UserProgress).where(UserProgress.user_id == user_id)
        progress = db.scalars(stmt).one_or_none()

        if not progress:
            # Create default progress
            progress = UserProgress(
                user_id=user_id,
                total_xp=0,
                current_level=1,
                current_streak=0,
            )
            db.add(progress)
            db.commit()
            db.refresh(progress)

        return UserProgressOut(
            total_xp=progress.total_xp or 0,
            current_level=progress.current_level or 1,
            current_streak=progress.current_streak or 0,
            last_practice_date=progress.last_practice_date,
        )

    @classmethod
    def record_practice_session(
        cls, db: Session, user_id: uuid.UUID, session_in: PracticeSessionCreate
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
        progress = db.scalars(stmt).one_or_none()

        if not progress:
            progress = UserProgress(
                user_id=user_id,
                total_xp=0,
                current_level=1,
                current_streak=0,
            )
            db.add(progress)

        current_streak = progress.current_streak or 0

        # Streak logic
        today = datetime.now(UTC).date()
        if progress.last_practice_date:
            delta_days: int = (today - progress.last_practice_date).days
            if delta_days == 1:
                progress.current_streak = current_streak + 1
            elif delta_days > 1:
                progress.current_streak = 1
            else:
                progress.current_streak = max(1, current_streak)
        else:
            progress.current_streak = 1

        progress.last_practice_date = today  # type: ignore
        progress.total_xp = (progress.total_xp or 0) + xp_gained

        # Level up logic
        old_level = progress.current_level or 1
        new_level = (progress.total_xp // cls.XP_PER_LEVEL) + 1
        level_up = new_level > old_level
        if level_up:
            progress.current_level = new_level

        db.commit()
        db.refresh(session)

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
