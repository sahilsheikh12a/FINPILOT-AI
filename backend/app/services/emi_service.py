import math
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.emi import EMI, EMIStatus
from app.schemas.emi import EMIStressAnalysis, EMIResponse


def _calc_outstanding(principal: float, rate: float, tenure: int, paid: int) -> float:
    """Outstanding principal using reducing balance method."""
    monthly_rate = rate / 12 / 100
    if monthly_rate == 0:
        return principal * (tenure - paid) / tenure
    factor = (1 + monthly_rate) ** tenure
    emi = principal * monthly_rate * factor / (factor - 1)
    remaining = tenure - paid
    r_factor = (1 + monthly_rate) ** remaining
    return emi * (r_factor - 1) / (monthly_rate * r_factor)


def _stress_score(dti_ratio: float) -> tuple[float, str]:
    """Debt-to-income ratio → stress score (0-10) and label."""
    if dti_ratio <= 0.20:
        return round(dti_ratio * 15, 1), "Low"
    elif dti_ratio <= 0.35:
        return round(3 + (dti_ratio - 0.20) * 33, 1), "Medium"
    elif dti_ratio <= 0.50:
        return round(8 + (dti_ratio - 0.35) * 13, 1), "High"
    else:
        return 10.0, "Critical"


class EMIService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_stress_analysis(
        self, user_id: UUID, monthly_income: float
    ) -> EMIStressAnalysis:
        result = await self.db.execute(
            select(EMI).where(EMI.user_id == user_id, EMI.status == EMIStatus.ACTIVE)
        )
        emis = list(result.scalars().all())

        total_emi = sum(float(e.emi_amount) for e in emis)
        dti = total_emi / max(monthly_income, 1)
        score, label = _stress_score(dti)

        if score <= 3:
            recommendation = "Your EMI burden is healthy. You can consider additional investments."
        elif score <= 6:
            recommendation = "Manageable debt level. Avoid taking new loans. Focus on building an emergency fund."
        elif score <= 8:
            recommendation = "High EMI stress. Consider prepaying high-interest loans. Cut discretionary spending."
        else:
            recommendation = "Critical debt stress! Seek debt consolidation or restructuring immediately."

        emi_responses = []
        for e in emis:
            outstanding = _calc_outstanding(
                float(e.principal), float(e.interest_rate),
                e.tenure_months, e.paid_months
            )
            total_interest = float(e.emi_amount) * e.tenure_months - float(e.principal)
            remaining = e.tenure_months - e.paid_months
            emi_responses.append(
                EMIResponse(
                    id=e.id,
                    loan_name=e.loan_name,
                    lender=e.lender,
                    principal=float(e.principal),
                    emi_amount=float(e.emi_amount),
                    interest_rate=float(e.interest_rate),
                    tenure_months=e.tenure_months,
                    paid_months=e.paid_months,
                    remaining_months=remaining,
                    start_date=e.start_date,
                    end_date=e.end_date,
                    due_day=e.due_day,
                    status=e.status,
                    total_interest_payable=round(total_interest, 2),
                    outstanding_principal=round(outstanding, 2),
                )
            )

        return EMIStressAnalysis(
            total_emi_monthly=round(total_emi, 2),
            debt_to_income_ratio=round(dti, 3),
            stress_score=score,
            stress_label=label,
            recommendation=recommendation,
            emis=emi_responses,
        )
