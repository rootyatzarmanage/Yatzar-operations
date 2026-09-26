import uuid
from sqlalchemy import String, Integer, Uuid
from sqlalchemy.orm import Mapped, mapped_column
from ycpa.models.base import Base, TimestampMixin


class Person(Base, TimestampMixin):
    """Person entity model mapping to 'persons' table."""

    __tablename__ = "persons"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True
    )

    age: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    phno: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True
    )

    def __repr__(self) -> str:
        return f"<Person(id={self.id}, name='{self.name}', age={self.age}, phno='{self.phno}')>"
