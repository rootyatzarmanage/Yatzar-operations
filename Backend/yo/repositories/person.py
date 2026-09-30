from datetime import datetime, timezone
from typing import Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from yo.models.person import Person


class PersonRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, person: Person) -> Person:
        self.session.add(person)
        await self.session.flush()
        await self.session.refresh(person)
        return person

    async def get_by_id(self, person_id: UUID) -> Person | None:
        statement = select(Person).where(
            Person.id == person_id,
            Person.deleted_at.is_(None),
        )
        result = await self.session.execute(statement)
        return result.scalars().first()

    async def get_by_phone_number(self, phone_number: str) -> Person | None:
        statement = select(Person).where(
            Person.phone_number == phone_number,
            Person.deleted_at.is_(None),
        )
        result = await self.session.execute(statement)
        return result.scalars().first()

    async def list_all(self, skip: int = 0, limit: int = 100) -> Sequence[Person]:
        statement = (
            select(Person)
            .where(Person.deleted_at.is_(None))
            .offset(skip)
            .limit(limit)
            .order_by(Person.created_at.desc())
        )
        result = await self.session.execute(statement)
        return result.scalars().all()

    async def update(self, person: Person) -> Person:
        await self.session.flush()
        await self.session.refresh(person)
        return person

    async def soft_delete(self, person: Person, deleted_by: UUID | None = None) -> None:
        person.deleted_at = datetime.now(timezone.utc)
        person.deleted_by = deleted_by
        await self.session.flush()
