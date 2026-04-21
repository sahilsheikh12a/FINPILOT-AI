from typing import Optional
from uuid import UUID
from datetime import datetime
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.base import BaseRepository
from app.models.transaction import Transaction, TransactionCategory, TransactionType


class TransactionRepository(BaseRepository[Transaction]):
    def __init__(self, db: AsyncSession):
        super().__init__(Transaction, db)

    async def get_user_transactions(
        self,
        user_id: UUID,
        start: datetime | None = None,
        end: datetime | None = None,
        category: TransactionCategory | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Transaction]:
        q = select(Transaction).where(Transaction.user_id == user_id)
        if start:
            q = q.where(Transaction.transacted_at >= start)
        if end:
            q = q.where(Transaction.transacted_at <= end)
        if category:
            q = q.where(Transaction.category == category)
        q = q.order_by(Transaction.transacted_at.desc()).limit(limit).offset(offset)
        result = await self.db.execute(q)
        return list(result.scalars().all())

    async def get_monthly_spend(self, user_id: UUID, month: int, year: int) -> float:
        q = select(func.sum(Transaction.amount)).where(
            and_(
                Transaction.user_id == user_id,
                Transaction.type == TransactionType.DEBIT,
                func.extract("month", Transaction.transacted_at) == month,
                func.extract("year", Transaction.transacted_at) == year,
            )
        )
        result = await self.db.execute(q)
        return float(result.scalar() or 0)

    async def get_category_spend(
        self, user_id: UUID, month: int, year: int
    ) -> dict[str, float]:
        q = (
            select(Transaction.category, func.sum(Transaction.amount))
            .where(
                and_(
                    Transaction.user_id == user_id,
                    Transaction.type == TransactionType.DEBIT,
                    func.extract("month", Transaction.transacted_at) == month,
                    func.extract("year", Transaction.transacted_at) == year,
                )
            )
            .group_by(Transaction.category)
        )
        result = await self.db.execute(q)
        return {row[0].value: float(row[1]) for row in result.fetchall()}

    async def get_existing_sms_hashes(
        self, user_id: UUID, hashes: list[str]
    ) -> set[str]:
        if not hashes:
            return set()
        q = select(Transaction.sms_hash).where(
            and_(
                Transaction.user_id == user_id,
                Transaction.sms_hash.in_(hashes),
            )
        )
        result = await self.db.execute(q)
        return {row[0] for row in result.fetchall() if row[0]}

    async def get_recent_for_fraud_check(
        self, user_id: UUID, limit: int = 100
    ) -> list[Transaction]:
        q = (
            select(Transaction)
            .where(Transaction.user_id == user_id)
            .order_by(Transaction.transacted_at.desc())
            .limit(limit)
        )
        result = await self.db.execute(q)
        return list(result.scalars().all())
