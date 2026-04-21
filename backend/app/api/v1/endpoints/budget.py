from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.budget import Budget
from app.services.budget_service import BudgetService
from app.schemas.budget import BudgetCreate, BudgetGenerateRequest, BudgetResponse

router = APIRouter(prefix="/budget", tags=["budget"])


@router.post("/generate", response_model=BudgetResponse)
async def generate_ai_budget(
    payload: BudgetGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.monthly_income:
        raise HTTPException(status_code=400, detail="Set monthly income first")

    svc = BudgetService(db)
    generated = svc.generate_ai_budget(
        float(current_user.monthly_income), payload.month, payload.year
    )

    # Upsert budget for month/year
    existing = await db.execute(
        select(Budget).where(
            Budget.user_id == current_user.id,
            Budget.month == payload.month,
            Budget.year == payload.year,
        )
    )
    budget = existing.scalar_one_or_none()

    if budget:
        budget.total_budget = generated["total_budget"]
        budget.category_limits = generated["category_limits"]
        budget.savings_target = generated["savings_target"]
        budget.ai_generated = True
    else:
        budget = Budget(
            user_id=current_user.id,
            month=payload.month,
            year=payload.year,
            total_budget=generated["total_budget"],
            category_limits=generated["category_limits"],
            savings_target=generated["savings_target"],
            ai_generated=True,
        )
        db.add(budget)

    await db.flush()
    await db.refresh(budget)

    prediction = await svc.get_overspend_prediction(
        current_user.id, budget, payload.month, payload.year
    )

    response = BudgetResponse.model_validate(budget)
    response.spent_so_far = prediction.get("projected_spend")
    response.overspend_probability = prediction.get("probability")
    return response


@router.post("/", response_model=BudgetResponse, status_code=201)
async def create_budget(
    payload: BudgetCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    budget = Budget(
        user_id=current_user.id,
        month=payload.month,
        year=payload.year,
        total_budget=payload.total_budget,
        category_limits=payload.category_limits,
        savings_target=payload.savings_target,
    )
    db.add(budget)
    await db.flush()
    await db.refresh(budget)
    return BudgetResponse.model_validate(budget)


@router.get("/current", response_model=BudgetResponse)
async def get_current_budget(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from datetime import datetime
    now = datetime.utcnow()
    result = await db.execute(
        select(Budget).where(
            Budget.user_id == current_user.id,
            Budget.month == now.month,
            Budget.year == now.year,
        )
    )
    budget = result.scalar_one_or_none()
    if not budget:
        raise HTTPException(status_code=404, detail="No budget for current month")

    svc = BudgetService(db)
    prediction = await svc.get_overspend_prediction(
        current_user.id, budget, now.month, now.year
    )
    spent = prediction.get("projected_spend", 0)

    response = BudgetResponse.model_validate(budget)
    response.spent_so_far = spent
    response.remaining = float(budget.total_budget) - spent
    response.overspend_probability = prediction.get("probability")
    return response
