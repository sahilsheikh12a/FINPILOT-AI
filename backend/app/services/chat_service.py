"""
Chat service: assembles financial context and runs LangGraph agent pipeline.
"""
import uuid
from uuid import UUID
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.agents.graph import get_graph
from app.agents.state import AgentState
from app.db.repositories.transaction import TransactionRepository
from app.models.budget import Budget
from app.models.goal import Goal, GoalStatus
from app.models.emi import EMI, EMIStatus
from app.models.subscription import Subscription
from app.models.user import User
from app.services.budget_service import BudgetService
from app.services.emi_service import EMIService


async def _build_financial_context(user: User, db: AsyncSession) -> dict:
    """Gather all financial data for the LLM context."""
    now = datetime.utcnow()
    month, year = now.month, now.year

    txn_repo = TransactionRepository(db)
    total_debit = await txn_repo.get_monthly_spend(user.id, month, year)
    category_breakdown = await txn_repo.get_category_spend(user.id, month, year)
    recent_txns = await txn_repo.get_user_transactions(user.id, limit=10)

    # Budget
    budget_result = await db.execute(
        select(Budget).where(
            Budget.user_id == user.id,
            Budget.month == month,
            Budget.year == year,
        )
    )
    budget = budget_result.scalar_one_or_none()
    budget_data = {}
    if budget:
        remaining = float(budget.total_budget) - total_debit
        budget_data = {
            "total_budget": float(budget.total_budget),
            "spent_so_far": total_debit,
            "remaining": remaining,
            "category_limits": budget.category_limits,
        }

    # Goals
    goals_result = await db.execute(
        select(Goal).where(Goal.user_id == user.id, Goal.status == GoalStatus.ACTIVE)
    )
    goals = [
        {"name": g.name, "target": float(g.target_amount), "saved": float(g.saved_amount)}
        for g in goals_result.scalars().all()
    ]

    # EMI
    emi_svc = EMIService(db)
    income = float(user.monthly_income or 0)
    emi_analysis = None
    if income:
        emi_analysis = await emi_svc.get_stress_analysis(user.id, income)

    # Subscriptions
    subs_result = await db.execute(
        select(Subscription).where(
            Subscription.user_id == user.id, Subscription.is_active == True
        )
    )
    subs = [
        {"name": s.name, "amount": float(s.amount), "billing_cycle": s.billing_cycle.value}
        for s in subs_result.scalars().all()
    ]

    return {
        "user": {"name": user.name, "monthly_income": income},
        "transactions": {
            "total_debit": total_debit,
            "category_breakdown": category_breakdown,
            "recent": [{"merchant": t.merchant, "amount": float(t.amount), "category": t.category.value} for t in recent_txns],
        },
        "budget": budget_data,
        "goals": goals,
        "emis": emi_analysis.dict() if emi_analysis else {},
        "subscriptions": subs,
    }


class ChatService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.graph = get_graph()

    async def chat(self, user: User, message: str, session_id: str | None = None) -> dict:
        if not session_id:
            session_id = str(uuid.uuid4())

        financial_context = await _build_financial_context(user, self.db)

        initial_state: AgentState = {
            "user_id": str(user.id),
            "messages": [],
            "user_query": message,
            "intent": None,
            "financial_context": financial_context,
            "agent_responses": {},
            "final_answer": None,
            "error": None,
        }

        result = await self.graph.ainvoke(initial_state)

        return {
            "reply": result.get("final_answer", "I couldn't process that. Please try again."),
            "session_id": session_id,
            "agent_used": result.get("intent"),
            "data": result.get("agent_responses"),
        }
