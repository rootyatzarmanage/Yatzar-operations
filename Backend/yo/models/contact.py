import uuid
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import ForeignKey
from yo.core.database.base import Base


class Contact(Base):
    __tablename__ = "contacts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True),primary_key=True,default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True),ForeignKey("workspaces.id"),nullable=True,index=True)
    owner_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True),ForeignKey("users.id"),nullable=True,index=True)
    first_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    company: Mapped[str | None] = mapped_column(String(255), nullable=True)
    photo: Mapped[str | None] = mapped_column(String(500),nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    secondary_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    other_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    home_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    mobile: Mapped[str | None] = mapped_column(String(30), nullable=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    tag_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("tags.id"),nullable=True,index=True)
    lead_source: Mapped[str | None] = mapped_column(String(100), nullable=True)
    department: Mapped[str | None] = mapped_column(String(150), nullable=True)
    mailing_country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    mailing_state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    mailing_city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    mailing_zip: Mapped[str | None] = mapped_column(String(20), nullable=True)
    mailing_building: Mapped[str | None] = mapped_column(String(255), nullable=True)
    mailing_street: Mapped[str | None] = mapped_column(String(255), nullable=True)
    other_country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    other_state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    other_city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    other_zip: Mapped[str | None] = mapped_column(String(20), nullable=True)
    other_street: Mapped[str | None] = mapped_column(String(255), nullable=True)
    other_building: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    email_opt_out: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    stage: Mapped[str] = mapped_column(String(20),default="contact",nullable=False,index=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True),ForeignKey("users.id"),nullable=True)
    updated_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True),ForeignKey("users.id"),nullable=True)
    deleted_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True),ForeignKey("users.id"),nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True),default=lambda: datetime.now().astimezone(),nullable=False)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True),nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True),nullable=True,index=True)
