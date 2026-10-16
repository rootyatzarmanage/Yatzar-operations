"""Authorization using the existing system roles and menu permissions."""
from fastapi import Depends
from sqlalchemy import select

from yo.core.auth.dependencies import CurrentUser
from yo.core.database import DatabaseSession
from yo.core.exceptions import AppException
from yo.models.permission import Menu, RolePermission
from yo.models.user import User

WORKSPACE_ADMIN_ROLES = ("Super Admin", "Admin")


def is_workspace_admin(user: User) -> bool:
    return bool(
        user.is_active and user.deleted_at is None and user.role
        and user.role.deleted_at is None and user.role.is_system
        and user.role.name in WORKSPACE_ADMIN_ROLES
    )


async def require_workspace_admin(current_user: CurrentUser) -> User:
    if not is_workspace_admin(current_user):
        raise AppException("Workspace administration requires an administrator.", 403)
    return current_user


def require_permission(menu_key: str, action: str):
    if action not in {"create", "view", "update", "delete"}:
        raise ValueError("Unknown permission action")

    async def check(session: DatabaseSession, current_user: CurrentUser) -> User:
        role = current_user.role
        if role and role.deleted_at is None:
            if role.is_system and role.name == "Super Admin":
                return current_user
            allowed = await session.scalar(
                select(RolePermission.id).join(Menu).where(
                    RolePermission.role_id == role.id,
                    RolePermission.deleted_at.is_(None),
                    Menu.key == menu_key, Menu.deleted_at.is_(None),
                    Menu.is_active.is_(True),
                    getattr(RolePermission, f"can_{action}").is_(True),
                ).limit(1)
            )
            if allowed is not None:
                return current_user
        raise AppException("You do not have permission to perform this action.", 403)

    return check
