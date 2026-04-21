from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.emi import EMI, EMIStatus
from app.services.emi_service import EMIService
from app.schemas.emi import EMICreate, EMIResponse, EMIStressAnalysis

router = APIRouter(prefix="/emis", tags=["emis"])


@router.post("/", response_model=EMIResponse, status_code=201)
async def add_emi(
    payload: EMICreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from datetime import date
    from dateutil.relativedelta import relativedelta

    end_date = payload.start_date + relativedelta(months=payload.tenure_months)
    emi = EMI(
        user_id=current_user.id,
        loan_name=payload.loan_name,
        lender=payload.lender,
        principal=payload.principal,
        emi_amount=payload.emi_amount,
        interest_rate=payload.interest_rate,
        tenure_months=payload.tenure_months,
        start_date=payload.start_date,
        end_date=end_date,
        due_day=payload.due_day,
    )
    db.add(emi)
    await db.flush()
    await db.refresh(emi)

    svc = EMIService(db)
    from app.services.emi_service import _calc_outstanding
    outstanding = _calc_outstanding(
        float(emi.principal), float(emi.interest_rate), emi.tenure_months, 0
    )
    total_interest = float(emi.emi_amount) * emi.tenure_months - float(emi.principal)

    return EMIResponse(
        id=emi.id,
        loan_name=emi.loan_name,
        lender=emi.lender,
        principal=float(emi.principal),
        emi_amount=float(emi.emi_amount),
        interest_rate=float(emi.interest_rate),
        tenure_months=emi.tenure_months,
        paid_months=0,
        remaining_months=emi.tenure_months,
        start_date=emi.start_date,
        end_date=emi.end_date,
        due_day=emi.due_day,
        status=emi.status,
        total_interest_payable=round(total_interest, 2),
        outstanding_principal=round(outstanding, 2),
    )


@router.get("/stress", response_model=EMIStressAnalysis)
async def emi_stress_analysis(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.monthly_income:
        raise HTTPException(status_code=400, detail="Set monthly income first")

    svc = EMIService(db)
    return await svc.get_stress_analysis(current_user.id, float(current_user.monthly_income))
