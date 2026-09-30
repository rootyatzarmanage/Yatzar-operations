import uuid

from sqlalchemy import Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from yo.core.database.base import Base, SoftDeleteMixin, TimestampMixin


class Person(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "persons"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    phone_number: Mapped[str] = mapped_column(
        String(20), nullable=False, index=True
    )

    def __repr__(self) -> str:
        return (
            f"<Person(id={self.id}, name='{self.name}', age={self.age}, "
            f"phone_number='{self.phone_number}')>"
        )
