from typing import List
from uuid import UUID

from fastapi import APIRouter, Query, status

from yo.core.database import DatabaseSession
from yo.core.schemas.responses import SuccessResponse
from yo.schemas.requests.workspace import (
    WorkspaceCreateRequest,
    WorkspaceUpdateRequest,
)
from yo.schemas.responses.workspace import WorkspaceResponse
from yo.services.workspace import WorkspaceService


router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=SuccessResponse[WorkspaceResponse],
)
async def create_workspace(
    request: WorkspaceCreateRequest, session: DatabaseSession
) -> SuccessResponse[WorkspaceResponse]:
    workspace = await WorkspaceService(session).create(request)
    return SuccessResponse(
        message="Workspace created successfully",
        data=WorkspaceResponse.model_validate(workspace),
    )


@router.get("", response_model=SuccessResponse[List[WorkspaceResponse]])
async def list_workspaces(
    session: DatabaseSession,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
) -> SuccessResponse[List[WorkspaceResponse]]:
    workspaces = await WorkspaceService(session).list_all(skip, limit)
    return SuccessResponse(
        message="Workspaces retrieved successfully",
        data=[WorkspaceResponse.model_validate(item) for item in workspaces],
    )


@router.get(
    "/{workspace_id}", response_model=SuccessResponse[WorkspaceResponse]
)
async def get_workspace(
    workspace_id: UUID, session: DatabaseSession
) -> SuccessResponse[WorkspaceResponse]:
    workspace = await WorkspaceService(session).get_by_id(workspace_id)
    return SuccessResponse(
        message="Workspace retrieved successfully",
        data=WorkspaceResponse.model_validate(workspace),
    )


@router.put(
    "/{workspace_id}", response_model=SuccessResponse[WorkspaceResponse]
)
async def update_workspace(
    workspace_id: UUID,
    request: WorkspaceUpdateRequest,
    session: DatabaseSession,
) -> SuccessResponse[WorkspaceResponse]:
    workspace = await WorkspaceService(session).update(workspace_id, request)
    return SuccessResponse(
        message="Workspace updated successfully",
        data=WorkspaceResponse.model_validate(workspace),
    )


@router.delete(
    "/{workspace_id}", response_model=SuccessResponse[dict[str, str]]
)
async def delete_workspace(
    workspace_id: UUID, session: DatabaseSession
) -> SuccessResponse[dict[str, str]]:
    await WorkspaceService(session).delete(workspace_id)
    return SuccessResponse(
        message="Workspace deleted successfully",
        data={"deleted_id": str(workspace_id)},
    )
