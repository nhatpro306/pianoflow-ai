from datetime import date
from uuid import UUID

from pydantic import BaseModel


class UserProgressOut(BaseModel):
    total_xp: int
    current_level: int
    current_streak: int
    last_practice_date: date | None = None


class PracticeSessionCreate(BaseModel):
    project_id: UUID
    score: int
    accuracy_percent: float


class PracticeSessionOut(BaseModel):
    id: UUID
    project_id: UUID
    score: int
    accuracy_percent: float
    xp_gained: int
    level_up: bool
    current_level: int
    total_xp: int
    current_streak: int
