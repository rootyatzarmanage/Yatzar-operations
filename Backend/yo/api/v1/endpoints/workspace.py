from typing import List
from uuid import UUID

from fastapi import APIRouter, File, Query, UploadFile, status

from yo.services.role import RoleService
from yo.core.database import DatabaseSession
from yo.models.user import user_workspaces
from yo.core.auth.dependencies import CurrentUser
from yo.core.auth.permissions import require_workspace_admin
from yo.core.schemas.responses import SuccessResponse
from yo.schemas.requests.workspace import (
    WorkspaceCreateRequest,
    WorkspaceUpdateRequest,
)
from yo.schemas.responses.workspace import WorkspaceImageResponse, WorkspaceResponse
from yo.services.workspace import WorkspaceService


router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=SuccessResponse[WorkspaceResponse],
)
async def create_workspace(
    request: WorkspaceCreateRequest, session: DatabaseSession, current_user: CurrentUser
) -> SuccessResponse[WorkspaceResponse]:
    await RoleService(session).check_permission(current_user, "workspace", "create")
    workspace = await WorkspaceService(session).create(request)
    # A newly created workspace must remain accessible to its creator.
    await session.execute(user_workspaces.insert().values(
        user_id=current_user.id, workspace_id=workspace.id,
    ))
    return SuccessResponse(
        message="Workspace created successfully",
        data=WorkspaceResponse.model_validate(workspace),
    )


@router.get("", response_model=SuccessResponse[List[WorkspaceResponse]])
async def list_workspaces(
    session: DatabaseSession,
    current_user: CurrentUser,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
) -> SuccessResponse[List[WorkspaceResponse]]:
    await RoleService(session).check_permission(current_user, "workspace", "view")
    service = WorkspaceService(session)
    workspaces = await service.list_for_user(current_user.id, skip, limit)
    return SuccessResponse(
        message="Workspaces retrieved successfully",
        data=[WorkspaceResponse.model_validate(item) for item in workspaces],
    )


@router.get(
    "/options", response_model=SuccessResponse[List[WorkspaceResponse]],
)
async def workspace_options(
    session: DatabaseSession, current_user: CurrentUser,
    skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=100),
):
    await require_workspace_admin(current_user)
    workspaces = await WorkspaceService(session).list_all(skip, limit)
    return SuccessResponse(
        message="Workspace options retrieved successfully",
        data=[WorkspaceResponse.model_validate(item) for item in workspaces],
    )


@router.get(
    "/{workspace_id}/image",
    response_model=SuccessResponse[WorkspaceImageResponse],
)
async def get_workspace_image(
    workspace_id: UUID,
    session: DatabaseSession,
    current_user: CurrentUser,
) -> SuccessResponse[WorkspaceImageResponse]:
    await RoleService(session).check_permission(current_user, "workspace", "view")
    service = WorkspaceService(session)
    workspace = await service.get_workspace_image(workspace_id, current_user.id)
    return SuccessResponse(
        message="Workspace image retrieved successfully",
        data=WorkspaceImageResponse(workspace_id=workspace.id, image=workspace.image),
    )


@router.post(
    "/{workspace_id}/image",
    response_model=SuccessResponse[WorkspaceImageResponse],
)
async def upload_workspace_image(
    workspace_id: UUID,
    session: DatabaseSession,
    current_user: CurrentUser,
    file: UploadFile = File(...),
) -> SuccessResponse[WorkspaceImageResponse]:
    await RoleService(session).check_permission(current_user, "workspace", "update")
    service = WorkspaceService(session)
    workspace = await service.save_workspace_image(workspace_id, file, current_user.id)
    return SuccessResponse(
        message="Workspace image uploaded successfully",
        data=WorkspaceImageResponse(workspace_id=workspace.id, image=workspace.image),
    )


@router.put(
    "/{workspace_id}/image",
    response_model=SuccessResponse[WorkspaceImageResponse],
)
async def update_workspace_image(
    workspace_id: UUID,
    session: DatabaseSession,
    current_user: CurrentUser,
    file: UploadFile = File(...),
) -> SuccessResponse[WorkspaceImageResponse]:
    await RoleService(session).check_permission(current_user, "workspace", "update")
    service = WorkspaceService(session)
    workspace = await service.update_workspace_image(workspace_id, file, current_user.id)
    return SuccessResponse(
        message="Workspace image updated successfully",
        data=WorkspaceImageResponse(workspace_id=workspace.id, image=workspace.image),
    )


@router.delete(
    "/{workspace_id}/image",
    response_model=SuccessResponse[None],
)
async def delete_workspace_image(
    workspace_id: UUID,
    session: DatabaseSession,
    current_user: CurrentUser,
) -> SuccessResponse[None]:
    await RoleService(session).check_permission(current_user, "workspace", "update")
    service = WorkspaceService(session)
    await service.delete_workspace_image(workspace_id, current_user.id)
    return SuccessResponse(
        message="Workspace image deleted successfully",
        data=None,
    )


@router.get(
    "/{workspace_id}", response_model=SuccessResponse[WorkspaceResponse],
)
async def get_workspace(
    workspace_id: UUID, session: DatabaseSession, current_user: CurrentUser
) -> SuccessResponse[WorkspaceResponse]:
    await RoleService(session).check_permission(current_user, "workspace", "view")
    service = WorkspaceService(session)
    await service.ensure_access(current_user.id, workspace_id, include_disabled=True)
    workspace = await service.get_by_id(workspace_id)
    return SuccessResponse(
        message="Workspace retrieved successfully",
        data=WorkspaceResponse.model_validate(workspace),
    )


@router.put(
    "/{workspace_id}", response_model=SuccessResponse[WorkspaceResponse],
)
async def update_workspace(
    workspace_id: UUID,
    request: WorkspaceUpdateRequest,
    session: DatabaseSession,
    current_user: CurrentUser,
) -> SuccessResponse[WorkspaceResponse]:
    await RoleService(session).check_permission(current_user, "workspace", "update")
    service = WorkspaceService(session)
    await service.ensure_access(current_user.id, workspace_id, include_disabled=True)
    workspace = await service.update(workspace_id, request)
    return SuccessResponse(
        message="Workspace updated successfully",
        data=WorkspaceResponse.model_validate(workspace),
    )


@router.delete(
    "/{workspace_id}", response_model=SuccessResponse[dict[str, str]],
)
async def delete_workspace(
    workspace_id: UUID, session: DatabaseSession, current_user: CurrentUser
) -> SuccessResponse[dict[str, str]]:
    await RoleService(session).check_permission(current_user, "workspace", "delete")
    service = WorkspaceService(session)
    await service.ensure_access(current_user.id, workspace_id, include_disabled=True)
    await service.delete(workspace_id)
    return SuccessResponse(
        message="Workspace deleted successfully",
        data={"deleted_id": str(workspace_id)},
    )
