import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from yo.core.database.base import Base


def utcnow():
    return datetime.now(timezone.utc)


class Call(Base):
    __tablename__ = "calls"

    # Existing unassigned rows remain hidden until explicitly backfilled.
    workspace_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=True, index=True,
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contact_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True),ForeignKey("contacts.id"),nullable=False,index=True)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    call_type: Mapped[str] = mapped_column(String(30), nullable=False)
    call_status: Mapped[str] = mapped_column(String(30), default="Completed", nullable=False)
    call_start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    related_to: Mapped[str | None] = mapped_column(String(255), nullable=True)
    voice_recording: Mapped[str | None] = mapped_column(Text, nullable=True)
    call_purpose: Mapped[str | None] = mapped_column(String(100), nullable=True)
    call_agenda: Mapped[str | None] = mapped_column(Text, nullable=True)
    reminder: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    updated_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    deleted_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
