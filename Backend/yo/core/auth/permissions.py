"""Authorization using the existing system roles and menu permissions."""
from yo.core.exceptions import AppException
from yo.models.user import User

WORKSPACE_ADMIN_ROLES = ("Super Admin", "Admin")


def is_workspace_admin(user: User) -> bool:
    return bool(
        user.is_active and user.deleted_at is None and user.role
        and user.role.deleted_at is None and user.role.is_system
        and user.role.name in WORKSPACE_ADMIN_ROLES
    )


async def require_workspace_admin(current_user: User) -> User:
    if not is_workspace_admin(current_user):
        raise AppException("Workspace administration requires an administrator.", 403)
    return current_user
