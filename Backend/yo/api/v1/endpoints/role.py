from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, status

from yo.core.database import DatabaseSession
from yo.core.schemas.responses import SuccessResponse
from yo.schemas.requests.role import RoleCreateRequest, RoleUpdateRequest
from yo.schemas.responses.role import RoleResponse
from yo.services.role import RoleService
from yo.api.v1.endpoints.auth import require_user
from yo.core.auth.permissions import require_permission

router = APIRouter(prefix="/roles", tags=["Roles"], dependencies=[Depends(require_user)])


def serialize_role(role) -> RoleResponse:
    return RoleResponse(
        id=role.id, name=role.name, description=role.description, is_system=role.is_system,
        permissions=[{"menu": item.menu.name, "create": item.can_create, "view": item.can_view, "update": item.can_update, "delete": item.can_delete} for item in role.permissions if item.deleted_at is None and item.menu.deleted_at is None and item.menu.is_active],
        created_at=role.created_at, created_by=role.created_by, updated_at=role.updated_at, updated_by=role.updated_by,
    )


@router.get("", response_model=SuccessResponse[List[RoleResponse]], dependencies=[Depends(require_permission("appPermission", "view"))])
async def list_roles(session: DatabaseSession) -> SuccessResponse[List[RoleResponse]]:
    roles = await RoleService(session).list_all()
    return SuccessResponse(message="Roles retrieved successfully", data=[serialize_role(role) for role in roles])


@router.post("", status_code=status.HTTP_201_CREATED, response_model=SuccessResponse[RoleResponse], dependencies=[Depends(require_permission("appPermission", "create"))])
async def create_role(request: RoleCreateRequest, session: DatabaseSession) -> SuccessResponse[RoleResponse]:
    role = await RoleService(session).create(request)
    return SuccessResponse(message="Role created successfully", data=serialize_role(role))


@router.put("/{role_id}", response_model=SuccessResponse[RoleResponse], dependencies=[Depends(require_permission("appPermission", "update"))])
async def update_role(role_id: UUID, request: RoleUpdateRequest, session: DatabaseSession) -> SuccessResponse[RoleResponse]:
    role = await RoleService(session).update(role_id, request)
    return SuccessResponse(message="Role updated successfully", data=serialize_role(role))


@router.delete("/{role_id}", response_model=SuccessResponse[dict[str, str]], dependencies=[Depends(require_permission("appPermission", "delete"))])
async def delete_role(role_id: UUID, session: DatabaseSession) -> SuccessResponse[dict[str, str]]:
    await RoleService(session).delete(role_id)
    return SuccessResponse(message="Role deleted successfully", data={"deleted_id": str(role_id)})


@router.get("/{role_id}", response_model=SuccessResponse[RoleResponse], dependencies=[Depends(require_permission("appPermission", "view"))])
async def get_role(role_id: UUID, session: DatabaseSession) -> SuccessResponse[RoleResponse]:
    role = await RoleService(session).get_by_id(role_id)
    return SuccessResponse(message="Role retrieved successfully", data=serialize_role(role))
