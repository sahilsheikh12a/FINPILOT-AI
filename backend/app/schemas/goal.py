from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import date, datetime

from app.models.goal import GoalStatus


class GoalCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    target_amount: float = Field(..., gt=0)
    target_date: Optional[date] = None


class GoalUpdate(BaseModel):
    saved_amount: Optional[float] = None
    status: Optional[GoalStatus] = None


class GoalResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    target_amount: float
    saved_amount: float
    monthly_saving_required: Optional[float]
    target_date: Optional[date]
    status: GoalStatus
    progress_pct: Optional[float] = None
    months_remaining: Optional[int] = None

    class Config:
        from_attributes = True
