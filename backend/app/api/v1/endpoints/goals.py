import math
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.goal import Goal, GoalStatus
from app.schemas.goal import GoalCreate, GoalUpdate, GoalResponse

router = APIRouter(prefix="/goals", tags=["goals"])


def _calc_months_to_goal(remaining: float, monthly_saving: float) -> int | None:
    if monthly_saving <= 0:
        return None
    return math.ceil(remaining / monthly_saving)


@router.post("/", response_model=GoalResponse, status_code=201)
async def create_goal(
    payload: GoalCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    income = float(current_user.monthly_income or 0)
    # Suggest 15% of income as monthly saving if no date given
    monthly_saving = income * 0.15 if income else None

    if payload.target_date:
        today = date.today()
        months = (payload.target_date.year - today.year) * 12 + (payload.target_date.month - today.month)
        if months > 0:
            monthly_saving = round(payload.target_amount / months, 2)

    goal = Goal(
        user_id=current_user.id,
        name=payload.name,
        description=payload.description,
        target_amount=payload.target_amount,
        saved_amount=0,
        monthly_saving_required=monthly_saving,
        target_date=payload.target_date,
        status=GoalStatus.ACTIVE,
    )
    db.add(goal)
    await db.flush()
    await db.refresh(goal)

    response = GoalResponse.model_validate(goal)
    response.progress_pct = 0.0
    response.months_remaining = _calc_months_to_goal(
        payload.target_amount, monthly_saving or 0
    )
    return response


@router.get("/", response_model=list[GoalResponse])
async def list_goals(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Goal).where(Goal.user_id == current_user.id).order_by(Goal.created_at.desc())
    )
    goals = result.scalars().all()

    responses = []
    for g in goals:
        r = GoalResponse.model_validate(g)
        r.progress_pct = round(float(g.saved_amount) / float(g.target_amount) * 100, 1)
        remaining = float(g.target_amount) - float(g.saved_amount)
        r.months_remaining = _calc_months_to_goal(
            remaining, float(g.monthly_saving_required or 0)
        )
        responses.append(r)
    return responses


@router.patch("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: str,
    payload: GoalUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Goal).where(Goal.id == goal_id, Goal.user_id == current_user.id)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    if payload.saved_amount is not None:
        goal.saved_amount = payload.saved_amount
        if float(goal.saved_amount) >= float(goal.target_amount):
            goal.status = GoalStatus.COMPLETED
    if payload.status is not None:
        goal.status = payload.status

    await db.flush()
    await db.refresh(goal)

    r = GoalResponse.model_validate(goal)
    r.progress_pct = round(float(goal.saved_amount) / float(goal.target_amount) * 100, 1)
    return r
