from datetime import datetime
from uuid import UUID
from calendar import monthrange
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.transaction import TransactionRepository
from app.models.budget import Budget
from app.models.user import User
from app.ml.pipelines.overspend_predictor import get_predictor
from app.schemas.budget import BudgetCreate

# Default budget allocation ratios (50/30/20 rule adapted for India)
DEFAULT_ALLOCATION = {
    "food": 0.20,
    "travel": 0.10,
    "bills": 0.15,
    "emi": 0.20,
    "shopping": 0.08,
    "entertainment": 0.05,
    "health": 0.05,
    "education": 0.05,
    "other": 0.05,
    "savings": 0.07,
}


class BudgetService:
    def __init__(self, db: AsyncSession):
        self.txn_repo = TransactionRepository(db)
        self.db = db
        self.predictor = get_predictor()

    def generate_ai_budget(self, monthly_income: float, month: int, year: int) -> dict:
        """Generate AI budget based on income using 50/30/20 principle."""
        disposable = monthly_income * 0.80  # 20% goes to taxes/mandatory

        category_limits = {
            cat: round(disposable * ratio, 2)
            for cat, ratio in DEFAULT_ALLOCATION.items()
            if cat != "savings"
        }
        savings_target = round(monthly_income * 0.20, 2)

        return {
            "total_budget": round(disposable - savings_target, 2),
            "category_limits": category_limits,
            "savings_target": savings_target,
        }

    async def get_overspend_prediction(
        self, user_id: UUID, budget: Budget, month: int, year: int
    ) -> dict:
        today = datetime.utcnow()
        days_elapsed = today.day
        days_in_month = monthrange(year, month)[1]

        spent = await self.txn_repo.get_monthly_spend(user_id, month, year)
        category_breakdown = await self.txn_repo.get_category_spend(user_id, month, year)

        return self.predictor.predict(
            spent_so_far=spent,
            budget=float(budget.total_budget),
            days_elapsed=days_elapsed,
            days_in_month=days_in_month,
            category_breakdown=category_breakdown,
        )
