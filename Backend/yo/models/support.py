import uuid
from typing import Any

from sqlalchemy import ForeignKey, JSON, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from yo.core.database.base import Base, SoftDeleteMixin, TimestampMixin


class Location(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "locations"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    kind: Mapped[str] = mapped_column(String(20), nullable=False)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("locations.id"), nullable=True)

    parent: Mapped["Location | None"] = relationship(remote_side="Location.id")


class EmployeeDraft(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "employee_drafts"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    data: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)


class DropdownOption(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "dropdown_options"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kind: Mapped[str] = mapped_column(String(50), nullable=False)
    value: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)