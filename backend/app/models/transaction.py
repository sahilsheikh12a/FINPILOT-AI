import uuid
from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import String, DateTime, Numeric, ForeignKey, Text, Enum, Index, Boolean, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.db.base import Base


class TransactionType(str, PyEnum):
    DEBIT = "debit"
    CREDIT = "credit"


class TransactionCategory(str, PyEnum):
    FOOD = "food"
    TRAVEL = "travel"
    BILLS = "bills"
    EMI = "emi"
    SHOPPING = "shopping"
    ENTERTAINMENT = "entertainment"
    HEALTH = "health"
    EDUCATION = "education"
    SALARY = "salary"
    INVESTMENT = "investment"
    TRANSFER = "transfer"
    UPI = "upi"
    ATM = "atm"
    OTHER = "other"


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    type: Mapped[TransactionType] = mapped_column(Enum(TransactionType), nullable=False)
    category: Mapped[TransactionCategory] = mapped_column(Enum(TransactionCategory), default=TransactionCategory.OTHER)
    merchant: Mapped[str | None] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    raw_sms: Mapped[str | None] = mapped_column(Text)
    sms_hash: Mapped[str | None] = mapped_column(String(64), index=True)
    sms_sender: Mapped[str | None] = mapped_column(String(32))
    bank: Mapped[str | None] = mapped_column(String(50))
    account_last4: Mapped[str | None] = mapped_column(String(4))
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False)
    is_fraud_flagged: Mapped[bool] = mapped_column(Boolean, default=False)
    fraud_score: Mapped[float | None] = mapped_column(Numeric(4, 3))
    ml_confidence: Mapped[float | None] = mapped_column(Numeric(4, 3))
    meta: Mapped[dict | None] = mapped_column(JSONB)
    transacted_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="transactions")

    __table_args__ = (
        Index("ix_transactions_user_transacted", "user_id", "transacted_at"),
        Index("ix_transactions_user_category", "user_id", "category"),
        UniqueConstraint("user_id", "sms_hash", name="uq_transactions_user_sms_hash"),
    )
