from typing import List
from uuid import UUID

from fastapi import APIRouter, status

from yo.core.auth.dependencies import CurrentUser
from yo.core.database import DatabaseSession
from yo.core.schemas.responses import SuccessResponse
from yo.schemas.requests.role import RoleCreateRequest, RoleUpdateRequest
from yo.schemas.responses.role import RoleResponse
from yo.services.role import RoleService

router = APIRouter(prefix="/roles", tags=["Roles"])


def serialize_role(role) -> RoleResponse:
    return RoleResponse(
        id=role.id, name=role.name, description=role.description, is_system=role.is_system,
        permissions=[{"menu": item.menu.name, "create": item.can_create, "view": item.can_view, "update": item.can_update, "delete": item.can_delete} for item in role.permissions if item.deleted_at is None and item.menu.deleted_at is None and item.menu.is_active],
        created_at=role.created_at, created_by=role.created_by, updated_at=role.updated_at, updated_by=role.updated_by,
    )


@router.get("", response_model=SuccessResponse[List[RoleResponse]])
async def list_roles(current_user: CurrentUser, session: DatabaseSession) -> SuccessResponse[List[RoleResponse]]:
    await RoleService(session).check_permission(current_user, "appPermission", "view")
    roles = await RoleService(session).list_all()
    return SuccessResponse(message="Roles retrieved successfully", data=[serialize_role(role) for role in roles])


@router.post("", status_code=status.HTTP_201_CREATED, response_model=SuccessResponse[RoleResponse])
async def create_role(current_user: CurrentUser, request: RoleCreateRequest, session: DatabaseSession) -> SuccessResponse[RoleResponse]:
    await RoleService(session).check_permission(current_user, "appPermission", "create")
    role = await RoleService(session).create(request)
    return SuccessResponse(message="Role created successfully", data=serialize_role(role))


@router.put("/{role_id}", response_model=SuccessResponse[RoleResponse])
async def update_role(current_user: CurrentUser, role_id: UUID, request: RoleUpdateRequest, session: DatabaseSession) -> SuccessResponse[RoleResponse]:
    await RoleService(session).check_permission(current_user, "appPermission", "update")
    role = await RoleService(session).update(role_id, request)
    return SuccessResponse(message="Role updated successfully", data=serialize_role(role))


@router.delete("/{role_id}", response_model=SuccessResponse[dict[str, str]])
async def delete_role(current_user: CurrentUser, role_id: UUID, session: DatabaseSession) -> SuccessResponse[dict[str, str]]:
    await RoleService(session).check_permission(current_user, "appPermission", "delete")
    await RoleService(session).delete(role_id)
    return SuccessResponse(message="Role deleted successfully", data={"deleted_id": str(role_id)})


@router.get("/{role_id}", response_model=SuccessResponse[RoleResponse])
async def get_role(current_user: CurrentUser, role_id: UUID, session: DatabaseSession) -> SuccessResponse[RoleResponse]:
    await RoleService(session).check_permission(current_user, "appPermission", "view")
    role = await RoleService(session).get_by_id(role_id)
    return SuccessResponse(message="Role retrieved successfully", data=serialize_role(role))
