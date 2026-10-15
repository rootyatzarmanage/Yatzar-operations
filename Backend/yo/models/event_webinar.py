import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from yo.core.database.base import Base


def utcnow():
    return datetime.now(timezone.utc)


class EventWebinar(Base):
    __tablename__ = "event_webinars"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    webinar_schedule: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    duration: Mapped[str] = mapped_column(String(50), nullable=False)
    campaign_owner_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    type: Mapped[str] = mapped_column(String(100), nullable=False)
    campaign_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    status: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    expected_revenue: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    budgeted_cost: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    actual_cost: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    deleted_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
