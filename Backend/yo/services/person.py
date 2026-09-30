from typing import Sequence
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from yo.core.exceptions import ConflictException, NotFoundException
from yo.models.person import Person
from yo.repositories.person import PersonRepository
from yo.schemas.requests.person import PersonCreateRequest, PersonUpdateRequest


class PersonService:
    def __init__(self, session: AsyncSession):
        self.repository = PersonRepository(session)

    async def create(self, request: PersonCreateRequest) -> Person:
        existing_person = await self.repository.get_by_phone_number(request.phone_number)
        if existing_person:
            raise ConflictException(
                f"Person with phone number '{request.phone_number}' already exists."
            )

        person = Person(
            name=request.name,
            age=request.age,
            phone_number=request.phone_number,
        )
        return await self.repository.create(person)

    async def get_by_id(self, person_id: UUID) -> Person:
        person = await self.repository.get_by_id(person_id)
        if not person:
            raise NotFoundException("Person", str(person_id))
        return person

    async def list_all(self, skip: int = 0, limit: int = 100) -> Sequence[Person]:
        return await self.repository.list_all(skip=skip, limit=limit)

    async def update(self, person_id: UUID, request: PersonUpdateRequest) -> Person:
        person = await self.get_by_id(person_id)

        if request.phone_number is not None and request.phone_number != person.phone_number:
            existing_person = await self.repository.get_by_phone_number(request.phone_number)
            if existing_person and existing_person.id != person.id:
                raise ConflictException(
                    f"Phone number '{request.phone_number}' is already used by another person."
                )
            person.phone_number = request.phone_number

        if request.name is not None:
            person.name = request.name
        if request.age is not None:
            person.age = request.age

        return await self.repository.update(person)

    async def delete(self, person_id: UUID, deleted_by: UUID | None = None) -> None:
        person = await self.get_by_id(person_id)
        await self.repository.soft_delete(person, deleted_by=deleted_by)
