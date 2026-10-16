from datetime import datetime, timezone
from typing import Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from yo.models.support import (
    DropdownOption,
    Location,
)


class SupportRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_locations(self, kind: str) -> list[str]:
        result = await self.session.execute(
            select(Location.name)
            .where(
                Location.kind == kind,
                Location.deleted_at.is_(None),
            )
            .order_by(Location.name.asc())
        )

        return list(result.scalars().all())

    async def get_location_by_name(
        self,
        name: str,
    ) -> Location | None:
        result = await self.session.execute(
            select(Location).where(
                Location.name == name,
                Location.deleted_at.is_(None),
            )
        )

        return result.scalar_one_or_none()

    async def list_child_locations(
        self,
        parent_name: str,
        kind: str,
    ) -> list[str]:
        parent = await self.get_location_by_name(parent_name)

        if not parent:
            return []

        result = await self.session.execute(
            select(Location.name)
            .where(
                Location.parent_id == parent.id,
                Location.kind == kind,
                Location.deleted_at.is_(None),
            )
            .order_by(Location.name.asc())
        )

        return list(result.scalars().all())

    async def list_options(
        self,
        kind: str,
    ) -> Sequence[DropdownOption]:
        result = await self.session.execute(
            select(DropdownOption)
            .where(
                DropdownOption.kind == kind,
                DropdownOption.deleted_at.is_(None),
            )
            .order_by(DropdownOption.value.asc())
        )

        return result.scalars().all()

    async def get_option_by_id(
        self,
        option_id: UUID,
    ) -> DropdownOption | None:
        result = await self.session.execute(
            select(DropdownOption).where(
                DropdownOption.id == option_id,
                DropdownOption.deleted_at.is_(None),
            )
        )

        return result.scalar_one_or_none()

    async def get_option_by_kind_and_value(
        self,
        kind: str,
        value: str,
    ) -> DropdownOption | None:
        result = await self.session.execute(
            select(DropdownOption).where(
                DropdownOption.kind == kind,
                DropdownOption.value == value,
                DropdownOption.deleted_at.is_(None),
            )
        )

        return result.scalar_one_or_none()

    async def create_option(
        self,
        option: DropdownOption,
    ) -> DropdownOption:
        self.session.add(option)
        await self.session.flush()
        await self.session.refresh(option)

        return option

    async def update_option(
        self,
        option: DropdownOption,
    ) -> DropdownOption:
        await self.session.flush()
        await self.session.refresh(option)

        return option

    async def soft_delete_option(
        self,
        option: DropdownOption,
    ) -> None:
        option.deleted_at = datetime.now(timezone.utc)

        await self.session.flush()



