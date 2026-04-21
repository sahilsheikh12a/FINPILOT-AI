from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import date

from app.models.emi import EMIStatus


class EMICreate(BaseModel):
    loan_name: str = Field(..., min_length=2)
    lender: Optional[str] = None
    principal: float = Field(..., gt=0)
    emi_amount: float = Field(..., gt=0)
    interest_rate: float = Field(..., ge=0, le=50)
    tenure_months: int = Field(..., gt=0)
    start_date: date
    due_day: int = Field(default=5, ge=1, le=31)


class EMIResponse(BaseModel):
    id: UUID
    loan_name: str
    lender: Optional[str]
    principal: float
    emi_amount: float
    interest_rate: float
    tenure_months: int
    paid_months: int
    remaining_months: int
    start_date: date
    end_date: Optional[date]
    due_day: int
    status: EMIStatus
    total_interest_payable: float
    outstanding_principal: float

    class Config:
        from_attributes = True


class EMIStressAnalysis(BaseModel):
    total_emi_monthly: float
    debt_to_income_ratio: float
    stress_score: float  # 0-10
    stress_label: str   # "Low" | "Medium" | "High" | "Critical"
    recommendation: str
    emis: list[EMIResponse]
