from typing import Sequence
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from ycpa.models.person import Person
from ycpa.repositories.person import PersonRepository
from ycpa.schemas.person import PersonCreateRequest, PersonUpdateRequest
from ycpa.core.exceptions import NotFoundException, ConflictException


class PersonService:
    """Service layer coordinating business logic, validation, and data persistence for Person."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.repository = PersonRepository(session)

    async def create(self, body: PersonCreateRequest) -> Person:
        """Create a new person after verifying business constraints."""
        # Business logic: Check if phone number is already registered
        existing = await self.repository.get_by_phno(body.phno)
        if existing:
            raise ConflictException(f"Person with phone number '{body.phno}' already exists.")

        person = Person(
            name=body.name,
            age=body.age,
            phno=body.phno
        )

        return await self.repository.create(person)

    async def get_by_id(self, person_id: UUID) -> Person:
        """Retrieve a person by ID or raise NotFoundException."""
        person = await self.repository.get_by_id(person_id)
        if not person:
            raise NotFoundException(resource="Person", identifier=str(person_id))
        return person

    async def list_all(self, skip: int = 0, limit: int = 100) -> Sequence[Person]:
        """Retrieve all persons with pagination."""
        return await self.repository.list_all(skip=skip, limit=limit)

    async def update(self, person_id: UUID, body: PersonUpdateRequest) -> Person:
        """Update existing person fields."""
        person = await self.get_by_id(person_id)

        # If phone number is being changed, ensure it's not taken by another person
        if body.phno is not None and body.phno != person.phno:
            existing = await self.repository.get_by_phno(body.phno)
            if existing and existing.id != person.id:
                raise ConflictException(f"Phone number '{body.phno}' is already used by another person.")
            person.phno = body.phno

        if body.name is not None:
            person.name = body.name

        if body.age is not None:
            person.age = body.age

        return await self.repository.update(person)

    async def delete(self, person_id: UUID) -> None:
        """Delete a person by ID."""
        person = await self.get_by_id(person_id)
        await self.repository.delete(person)
