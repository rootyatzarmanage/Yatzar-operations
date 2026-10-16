from datetime import datetime, timezone
from typing import Sequence
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from yo.models.permission import Menu, Role, RolePermission


class RoleRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, role_id: UUID) -> Role | None:
        result = await self.session.execute(
            select(Role).execution_options(populate_existing=True).options(selectinload(Role.permissions).selectinload(RolePermission.menu)).where(Role.id == role_id, Role.deleted_at.is_(None))
        )
        return result.scalars().first()

    async def get_by_name(self, name: str) -> Role | None:
        result = await self.session.execute(
            select(Role).where(
                func.lower(Role.name) == name.casefold(),
                Role.deleted_at.is_(None),
            )
        )
        return result.scalars().first()
        

    async def list_all(self) -> Sequence[Role]:
        result = await self.session.execute(
            select(Role).execution_options(populate_existing=True).options(selectinload(Role.permissions).selectinload(RolePermission.menu)).where(Role.deleted_at.is_(None)).order_by(Role.name)
        )
        return result.scalars().unique().all()

    async def menus(self) -> Sequence[Menu]:
        result = await self.session.execute(select(Menu).where(Menu.deleted_at.is_(None), Menu.is_active.is_(True)).order_by(Menu.name))
        return result.scalars().all()

    async def create(self, role: Role) -> Role:
        self.session.add(role)
        await self.session.flush()
        return await self.get_by_id(role.id)

    async def update(self, role: Role) -> Role:
        await self.session.flush()
        return await self.get_by_id(role.id)

    async def soft_delete(self, role: Role) -> None:
        role.deleted_at = datetime.now(timezone.utc)
        await self.session.flush()

    async def permissions_for_role(self, role_id: UUID):
        result = await self.session.execute(
            select(RolePermission).where(RolePermission.role_id == role_id)
        )
        return result.scalars().all()

    async def has_permission(self, role_id: UUID, menu_key: str, action: str) -> bool:
        return await self.session.scalar(
            select(RolePermission.id).join(Menu).where(
                RolePermission.role_id == role_id,
                RolePermission.deleted_at.is_(None),
                Menu.key == menu_key,
                Menu.deleted_at.is_(None),
                Menu.is_active.is_(True),
                getattr(RolePermission, f"can_{action}").is_(True),
            ).limit(1)
        ) is not None

    def add_permission(self, permission: RolePermission) -> None:
        self.session.add(permission)
