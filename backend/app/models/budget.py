import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Numeric, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.db.base import Base


class Budget(Base):
    __tablename__ = "budgets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    total_budget: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    # Per-category limits stored as JSON: {"food": 5000, "travel": 3000, ...}
    category_limits: Mapped[dict] = mapped_column(JSONB, default={})
    savings_target: Mapped[float | None] = mapped_column(Numeric(12, 2))
    ai_generated: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="budgets")
