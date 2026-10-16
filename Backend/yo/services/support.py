from typing import Sequence
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from yo.core.exceptions import ConflictException, NotFoundException
from yo.models.support import DropdownOption
from yo.repositories.support import SupportRepository
from yo.schemas.requests.support import  DropdownOptionRequest


class SupportService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repository = SupportRepository(session)

    async def list_countries(self) -> list[str]:
        return await self.repository.list_locations(
            kind="country"
        )

    async def list_states(
        self,
        country: str,
    ) -> list[str]:
        return await self.repository.list_child_locations(
            parent_name=country,
            kind="state",
        )

    async def list_districts(
        self,
        state: str,
    ) -> list[str]:
        return await self.repository.list_child_locations(
            parent_name=state,
            kind="district",
        )

    async def list_options(
        self,
        kind: str,
    ) -> Sequence[DropdownOption]:
        return await self.repository.list_options(
            kind
        )

    async def create_option(
        self,
        kind: str,
        request: DropdownOptionRequest,
    ) -> DropdownOption:
        value = request.value.strip()

        existing = await self.repository.get_option_by_kind_and_value(
            kind=kind,
            value=value,
        )

        if existing:
            raise ConflictException(
                "That option already exists."
            )

        option = DropdownOption(
            kind=kind,
            value=value,
        )

        return await self.repository.create_option(
            option
        )

    async def get_option(
        self,
        option_id: UUID,
    ) -> DropdownOption:
        option = await self.repository.get_option_by_id(
            option_id
        )

        if not option:
            raise NotFoundException(
                "Dropdown option",
                str(option_id),
            )

        return option

    async def update_option(
        self,
        option_id: UUID,
        request: DropdownOptionRequest,
    ) -> DropdownOption:
        option = await self.get_option(
            option_id
        )

        value = request.value.strip()

        existing = await self.repository.get_option_by_kind_and_value(
            kind=option.kind,
            value=value,
        )

        if existing and existing.id != option.id:
            raise ConflictException(
                "That option already exists."
            )

        option.value = value

        return await self.repository.update_option(
            option
        )

    async def delete_option(
        self,
        option_id: UUID,
    ) -> None:
        option = await self.get_option(
            option_id
        )

        await self.repository.soft_delete_option(
            option
        )
