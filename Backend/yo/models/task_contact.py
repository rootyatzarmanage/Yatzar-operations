import uuid

from sqlalchemy import ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from yo.core.database.base import Base


class TaskContact(Base):
    __tablename__ = "task_contacts"

    task_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True),ForeignKey("tasks.id", ondelete="CASCADE"),primary_key=True)
    contact_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True),ForeignKey("contacts.id"),primary_key=True)