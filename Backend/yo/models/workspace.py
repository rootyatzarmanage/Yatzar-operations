import uuid

from sqlalchemy import CheckConstraint, Index, String, Text, Uuid, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from yo.core.database.base import Base, SoftDeleteMixin, TimestampMixin


class Workspace(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "workspaces"
    __table_args__ = (
        CheckConstraint(
            "status IN ('Enabled', 'Disabled')",
            name="ck_workspaces_status",
        ),
        Index(
            "uq_workspaces_active_name",
            func.lower(text("name")),
            unique=True,
            postgresql_where=text("deleted_at IS NULL"),
            sqlite_where=text("deleted_at IS NULL"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    image: Mapped[str | None] = mapped_column(String(500), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    employees: Mapped[list["Employee"]] = relationship(
        secondary="employee_workspaces", back_populates="workspaces",
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="Enabled")
