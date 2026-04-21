from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


class BudgetCreate(BaseModel):
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2024)
    total_budget: float = Field(..., gt=0)
    category_limits: dict[str, float] = {}
    savings_target: Optional[float] = None


class BudgetGenerateRequest(BaseModel):
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2024)


class BudgetResponse(BaseModel):
    id: UUID
    month: int
    year: int
    total_budget: float
    category_limits: dict
    savings_target: Optional[float]
    ai_generated: bool
    spent_so_far: Optional[float] = None
    remaining: Optional[float] = None
    overspend_probability: Optional[float] = None

    class Config:
        from_attributes = True
