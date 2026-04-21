import uuid
from datetime import datetime, date
from enum import Enum as PyEnum
from sqlalchemy import String, DateTime, Numeric, ForeignKey, Date, Enum, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base


class GoalStatus(str, PyEnum):
    ACTIVE = "active"
    COMPLETED = "completed"
    PAUSED = "paused"
    CANCELLED = "cancelled"


class Goal(Base):
    __tablename__ = "goals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    target_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    saved_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    monthly_saving_required: Mapped[float | None] = mapped_column(Numeric(12, 2))
    target_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[GoalStatus] = mapped_column(Enum(GoalStatus), default=GoalStatus.ACTIVE)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="goals")
