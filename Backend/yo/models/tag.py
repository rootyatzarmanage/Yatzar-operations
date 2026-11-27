import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Integer, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from yo.core.database.base import Base


class Tag(Base):
    __tablename__ = "tags"
    __table_args__ = (Index("uq_tags_workspace_name", "workspace_id", "name", unique=True),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True,default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100),nullable=False)
    status: Mapped[int] = mapped_column(Integer,default=1,nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True),default=lambda: datetime.now(timezone.utc),nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True),nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"),nullable=True)
    deleted_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"),nullable=True)
    workspace_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True, index=True)
