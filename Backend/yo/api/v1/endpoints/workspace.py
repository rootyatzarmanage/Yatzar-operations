from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, UploadFile, status

from yo.core.database import DatabaseSession
from yo.core.auth.dependencies import CurrentUser
from yo.core.auth.permissions import is_workspace_admin, require_permission, require_workspace_admin
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
    dependencies=[Depends(require_permission("workspace", "create"))],
)
async def create_workspace(
    request: WorkspaceCreateRequest, session: DatabaseSession, current_user: CurrentUser
) -> SuccessResponse[WorkspaceResponse]:
    workspace = await WorkspaceService(session).create(request)
    return SuccessResponse(
        message="Workspace created successfully",
        data=WorkspaceResponse.model_validate(workspace),
    )


@router.get("", response_model=SuccessResponse[List[WorkspaceResponse]], dependencies=[Depends(require_permission("workspace", "view"))])
async def list_workspaces(
    session: DatabaseSession,
    current_user: CurrentUser,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
) -> SuccessResponse[List[WorkspaceResponse]]:
    service = WorkspaceService(session)
    workspaces = (
        await service.list_all(skip, limit) if is_workspace_admin(current_user)
        else await service.list_for_user(current_user.id, skip, limit)
    )
    return SuccessResponse(
        message="Workspaces retrieved successfully",
        data=[WorkspaceResponse.model_validate(item) for item in workspaces],
    )


@router.get(
    "/options", response_model=SuccessResponse[List[WorkspaceResponse]],
    dependencies=[Depends(require_workspace_admin)],
)
async def workspace_options(
    session: DatabaseSession, current_user: CurrentUser,
    skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=100),
):
    workspaces = await WorkspaceService(session).list_for_user(current_user.id, skip, limit)
    return SuccessResponse(
        message="Workspace options retrieved successfully",
        data=[WorkspaceResponse.model_validate(item) for item in workspaces],
    )


@router.get(
    "/{workspace_id}/image",
    response_model=SuccessResponse[WorkspaceImageResponse],
    dependencies=[Depends(require_permission("workspace", "view"))],
)
async def get_workspace_image(
    workspace_id: UUID,
    session: DatabaseSession,
    current_user: CurrentUser,
) -> SuccessResponse[WorkspaceImageResponse]:
    service = WorkspaceService(session)
    workspace = await service.get_workspace_image(workspace_id, current_user.id)
    return SuccessResponse(
        message="Workspace image retrieved successfully",
        data=WorkspaceImageResponse(workspace_id=workspace.id, image=workspace.image),
    )


@router.post(
    "/{workspace_id}/image",
    response_model=SuccessResponse[WorkspaceImageResponse],
    dependencies=[Depends(require_permission("workspace", "update"))],
)
async def upload_workspace_image(
    workspace_id: UUID,
    session: DatabaseSession,
    current_user: CurrentUser,
    file: UploadFile = File(...),
) -> SuccessResponse[WorkspaceImageResponse]:
    service = WorkspaceService(session)
    workspace = await service.save_workspace_image(workspace_id, file, current_user.id)
    return SuccessResponse(
        message="Workspace image uploaded successfully",
        data=WorkspaceImageResponse(workspace_id=workspace.id, image=workspace.image),
    )


@router.put(
    "/{workspace_id}/image",
    response_model=SuccessResponse[WorkspaceImageResponse],
    dependencies=[Depends(require_permission("workspace", "update"))],
)
async def update_workspace_image(
    workspace_id: UUID,
    session: DatabaseSession,
    current_user: CurrentUser,
    file: UploadFile = File(...),
) -> SuccessResponse[WorkspaceImageResponse]:
    service = WorkspaceService(session)
    workspace = await service.update_workspace_image(workspace_id, file, current_user.id)
    return SuccessResponse(
        message="Workspace image updated successfully",
        data=WorkspaceImageResponse(workspace_id=workspace.id, image=workspace.image),
    )


@router.delete(
    "/{workspace_id}/image",
    response_model=SuccessResponse[None],
    dependencies=[Depends(require_permission("workspace", "update"))],
)
async def delete_workspace_image(
    workspace_id: UUID,
    session: DatabaseSession,
    current_user: CurrentUser,
) -> SuccessResponse[None]:
    service = WorkspaceService(session)
    await service.delete_workspace_image(workspace_id, current_user.id)
    return SuccessResponse(
        message="Workspace image deleted successfully",
        data=None,
    )


@router.get(
    "/{workspace_id}", response_model=SuccessResponse[WorkspaceResponse],
    dependencies=[Depends(require_permission("workspace", "view"))],
)
async def get_workspace(
    workspace_id: UUID, session: DatabaseSession, current_user: CurrentUser
) -> SuccessResponse[WorkspaceResponse]:
    service = WorkspaceService(session)
    if not is_workspace_admin(current_user):
        await service.ensure_access(current_user.id, workspace_id)
    workspace = await service.get_by_id(workspace_id)
    return SuccessResponse(
        message="Workspace retrieved successfully",
        data=WorkspaceResponse.model_validate(workspace),
    )


@router.put(
    "/{workspace_id}", response_model=SuccessResponse[WorkspaceResponse],
    dependencies=[Depends(require_permission("workspace", "update"))],
)
async def update_workspace(
    workspace_id: UUID,
    request: WorkspaceUpdateRequest,
    session: DatabaseSession,
    current_user: CurrentUser,
) -> SuccessResponse[WorkspaceResponse]:
    service = WorkspaceService(session)
    if not is_workspace_admin(current_user):
        await service.ensure_access(current_user.id, workspace_id)
    workspace = await service.update(workspace_id, request)
    return SuccessResponse(
        message="Workspace updated successfully",
        data=WorkspaceResponse.model_validate(workspace),
    )


@router.delete(
    "/{workspace_id}", response_model=SuccessResponse[dict[str, str]],
    dependencies=[Depends(require_permission("workspace", "delete"))],
)
async def delete_workspace(
    workspace_id: UUID, session: DatabaseSession, current_user: CurrentUser
) -> SuccessResponse[dict[str, str]]:
    service = WorkspaceService(session)
    if not is_workspace_admin(current_user):
        await service.ensure_access(current_user.id, workspace_id)
    await service.delete(workspace_id)
    return SuccessResponse(
        message="Workspace deleted successfully",
        data={"deleted_id": str(workspace_id)},
    )
