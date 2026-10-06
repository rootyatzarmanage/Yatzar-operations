from typing import Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from yo.core.exceptions import ConflictException, NotFoundException
from yo.models.permission import Role, RolePermission
from yo.repositories.role import RoleRepository
from yo.schemas.requests.role import RoleCreateRequest


class RoleService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repository = RoleRepository(session)

    async def _save_permissions(self, role: Role, permissions: dict) -> None:
        menus = {menu.name: menu for menu in await self.repository.menus()}
        unknown_menus = set(permissions) - menus.keys()
        if unknown_menus:
            names = ", ".join(sorted(unknown_menus))
            raise ConflictException(f"Unknown menu permission(s): {names}.")

        result = await self.session.execute(
            select(RolePermission).where(RolePermission.role_id == role.id)
        )
        existing_permissions = {
            permission.menu_id: permission for permission in result.scalars().all()
        }
        for menu_name, menu in menus.items():
            values = permissions.get(menu_name)
            existing = existing_permissions.get(menu.id)
            if not existing:
                existing = RolePermission(role_id=role.id, menu_id=menu.id)
                self.session.add(existing)
            existing.deleted_at = None
            existing.can_create = values.create if values else False
            existing.can_view = values.view if values else False
            existing.can_update = values.update if values else False
            existing.can_delete = values.delete if values else False

    async def create(self, request: RoleCreateRequest) -> Role:
        if await self.repository.get_by_name(request.name):
            raise ConflictException(f"Role '{request.name}' already exists.")
        role = Role(name=request.name.strip(), description=request.description)
        self.session.add(role)
        await self.session.flush()
        await self._save_permissions(role, request.permissions)
        return await self.repository.update(role)

    async def list_all(self) -> Sequence[Role]:
        return await self.repository.list_all()

    async def get_by_id(self, role_id: UUID) -> Role:
        role = await self.repository.get_by_id(role_id)
        if not role:
            raise NotFoundException("Role", str(role_id))
        return role

    async def update(self, role_id: UUID, request: RoleCreateRequest) -> Role:
        role = await self.get_by_id(role_id)
        duplicate = await self.repository.get_by_name(request.name)
        if duplicate and duplicate.id != role.id:
            raise ConflictException(f"Role '{request.name}' already exists.")
        role.name = request.name.strip()
        role.description = request.description
        await self._save_permissions(role, request.permissions)
        return await self.repository.update(role)

    async def delete(self, role_id: UUID) -> None:
        role = await self.get_by_id(role_id)
        if role.is_system:
            raise ConflictException("System roles cannot be deleted.")
        await self.repository.soft_delete(role)