from datetime import datetime, timezone
from typing import Optional, Sequence
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from yo.models.person import Person


class PersonRepository:
    """Repository handling all database queries and persistence for Person."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, person: Person) -> Person:
        """Add and flush a new person in database session."""
        self.session.add(person)
        await self.session.flush()
        await self.session.refresh(person)
        return person

    async def get_by_id(self, person_id: UUID) -> Optional[Person]:
        """Fetch a single person by their primary key UUID."""
        statement = select(Person).where(
            Person.id == person_id,
            Person.deleted_at.is_(None),
        )
        result = await self.session.execute(statement)
        return result.scalars().first()

    async def get_by_phone_number(self, phone_number: str) -> Optional[Person]:
        """Fetch a person by phone number."""
        statement = select(Person).where(
            Person.phone_number == phone_number,
            Person.deleted_at.is_(None),
        )
        result = await self.session.execute(statement)
        return result.scalars().first()

    async def list_all(self, skip: int = 0, limit: int = 100) -> Sequence[Person]:
        """Fetch a list of persons with pagination."""
        statement = select(Person).where(Person.deleted_at.is_(None)).offset(skip).limit(limit).order_by(Person.created_at.desc())
        result = await self.session.execute(statement)
        return result.scalars().all()

    async def update(self, person: Person) -> Person:
        """Flush changes to person."""
        await self.session.flush()
        await self.session.refresh(person)
        return person

    async def soft_delete(self, person: Person, deleted_by: UUID | None = None) -> None:
        """Mark a person deleted without removing the database row."""
        person.deleted_at = datetime.now(timezone.utc)
        person.deleted_by = deleted_by
        await self.session.flush()
