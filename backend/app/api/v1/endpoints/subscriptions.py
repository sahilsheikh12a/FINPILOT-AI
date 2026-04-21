from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import date

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.subscription import Subscription, BillingCycle

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


class SubscriptionCreate(BaseModel):
    name: str
    amount: float
    billing_cycle: BillingCycle = BillingCycle.MONTHLY
    next_billing_date: Optional[date] = None
    category: Optional[str] = None


class SubscriptionResponse(BaseModel):
    id: UUID
    name: str
    amount: float
    billing_cycle: BillingCycle
    next_billing_date: Optional[date]
    category: Optional[str]
    is_active: bool
    auto_detected: bool
    monthly_cost: float

    class Config:
        from_attributes = True


class SubscriptionSummary(BaseModel):
    total_monthly: float
    total_yearly_estimate: float
    subscriptions: list[SubscriptionResponse]
    potential_savings: list[dict]


@router.get("/", response_model=SubscriptionSummary)
async def list_subscriptions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Subscription).where(
            Subscription.user_id == current_user.id,
            Subscription.is_active == True,
        )
    )
    subs = list(result.scalars().all())

    responses = []
    total_monthly = 0

    for s in subs:
        if s.billing_cycle == BillingCycle.MONTHLY:
            monthly = float(s.amount)
        elif s.billing_cycle == BillingCycle.QUARTERLY:
            monthly = float(s.amount) / 3
        else:  # yearly
            monthly = float(s.amount) / 12

        total_monthly += monthly
        responses.append(
            SubscriptionResponse(
                id=s.id,
                name=s.name,
                amount=float(s.amount),
                billing_cycle=s.billing_cycle,
                next_billing_date=s.next_billing_date,
                category=s.category,
                is_active=s.is_active,
                auto_detected=s.auto_detected,
                monthly_cost=round(monthly, 2),
            )
        )

    # Simple heuristic: flag entertainment subs > 2 as potential leak
    entertainment_subs = [r for r in responses if r.category == "entertainment"]
    potential_savings = []
    if len(entertainment_subs) > 2:
        potential_savings.append({
            "suggestion": f"You have {len(entertainment_subs)} entertainment subscriptions. Consider cancelling the least-used ones.",
            "potential_saving": sum(s.monthly_cost for s in entertainment_subs[2:]),
        })

    return SubscriptionSummary(
        total_monthly=round(total_monthly, 2),
        total_yearly_estimate=round(total_monthly * 12, 2),
        subscriptions=responses,
        potential_savings=potential_savings,
    )


@router.post("/", response_model=SubscriptionResponse, status_code=201)
async def add_subscription(
    payload: SubscriptionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    sub = Subscription(
        user_id=current_user.id,
        name=payload.name,
        amount=payload.amount,
        billing_cycle=payload.billing_cycle,
        next_billing_date=payload.next_billing_date,
        category=payload.category,
    )
    db.add(sub)
    await db.flush()
    await db.refresh(sub)

    monthly = float(sub.amount)
    if sub.billing_cycle == BillingCycle.QUARTERLY:
        monthly /= 3
    elif sub.billing_cycle == BillingCycle.YEARLY:
        monthly /= 12

    return SubscriptionResponse(
        id=sub.id,
        name=sub.name,
        amount=float(sub.amount),
        billing_cycle=sub.billing_cycle,
        next_billing_date=sub.next_billing_date,
        category=sub.category,
        is_active=sub.is_active,
        auto_detected=sub.auto_detected,
        monthly_cost=round(monthly, 2),
    )
