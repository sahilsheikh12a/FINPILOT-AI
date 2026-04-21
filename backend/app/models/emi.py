import uuid
from datetime import datetime, date
from enum import Enum as PyEnum
from sqlalchemy import String, DateTime, Numeric, ForeignKey, Date, Enum, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base


class EMIStatus(str, PyEnum):
    ACTIVE = "active"
    CLOSED = "closed"
    DEFAULTED = "defaulted"


class EMI(Base):
    __tablename__ = "emis"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    loan_name: Mapped[str] = mapped_column(String(100), nullable=False)
    lender: Mapped[str | None] = mapped_column(String(100))
    principal: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    emi_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    interest_rate: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    tenure_months: Mapped[int] = mapped_column(Integer, nullable=False)
    paid_months: Mapped[int] = mapped_column(Integer, default=0)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date | None] = mapped_column(Date)
    due_day: Mapped[int] = mapped_column(Integer, default=5)  # day of month
    status: Mapped[EMIStatus] = mapped_column(Enum(EMIStatus), default=EMIStatus.ACTIVE)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="emis")
