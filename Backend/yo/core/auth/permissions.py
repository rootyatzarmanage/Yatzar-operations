"""Authorization using the existing system roles and menu permissions."""
from fastapi import Depends

from yo.core.auth.dependencies import CurrentUser
from yo.core.database import DatabaseSession
from yo.core.exceptions import AppException
from yo.services.role import RoleService
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
        await RoleService(session).check_permission(current_user, menu_key, action)
        return current_user

    return check
