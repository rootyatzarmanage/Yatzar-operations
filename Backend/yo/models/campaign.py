import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from yo.core.database.base import Base


def utcnow():
    return datetime.now(timezone.utc)

class Campaign(Base):
    __tablename__ = "campaigns"

    # Existing unassigned rows remain hidden until explicitly backfilled.
    workspace_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=True, index=True,
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True),primary_key=True,default=uuid.uuid4)
    campaign_subject: Mapped[str] = mapped_column(String(255),nullable=False)
    sender_name: Mapped[str | None] = mapped_column(String(150),nullable=True)
    sender_address: Mapped[str] = mapped_column(String(320),nullable=False)
    reply_to_address: Mapped[str] = mapped_column(String(320),nullable=False,)
    campaign_owner_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True),ForeignKey("users.id"),nullable=True,index=True)
    campaign_name: Mapped[str] = mapped_column(String(255),nullable=False,index=True)
    type: Mapped[str] = mapped_column(String(100),nullable=False)
    status: Mapped[str | None] = mapped_column(String(100),nullable=True,index=True)
    budgeted_cost: Mapped[float | None] = mapped_column(Numeric(12, 2),nullable=True)
    actual_cost: Mapped[float | None] = mapped_column(Numeric(12, 2),nullable=True)
    description: Mapped[str | None] = mapped_column(Text,nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True),ForeignKey("users.id"),nullable=True)
    updated_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True),ForeignKey("users.id"),nullable=True)
    deleted_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True),ForeignKey("users.id"),nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
