from uuid import UUID

from fastapi import APIRouter, Query, status

from yo.services.role import RoleService
from yo.core.auth.dependencies import CurrentUser
from yo.core.database.dependencies import DatabaseSession
from yo.core.schemas.responses import SuccessResponse
from yo.repositories.task import TaskRepository
from yo.schemas.requests.task import (
    TaskCreateRequest,
    TaskUpdateRequest,
)
from yo.schemas.responses.task import TaskResponse
from yo.services.task import TaskService

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_task(payload: TaskCreateRequest,session: DatabaseSession,current_user: CurrentUser):
    await RoleService(session).check_permission(current_user, "tasks", "create")
    service = TaskService(TaskRepository(session, payload.workspace_id), current_user.id)
    task = await service.create_task(payload, current_user.id)

    return SuccessResponse(
        success=True,
        message="Task created successfully",
        data=TaskResponse.model_validate(task),
    )


@router.get("")
async def list_tasks(session: DatabaseSession,current_user: CurrentUser, workspace_id: UUID | None = Query(default=None),search: str | None = Query(default=None),):
    await RoleService(session).check_permission(current_user, "tasks", "view")
    tasks = await TaskService(TaskRepository(session, workspace_id), current_user.id).list_tasks(current_user.id, search)

    return SuccessResponse(
        success=True,
        message="Tasks fetched successfully",
        data=[TaskResponse.model_validate(task) for task in tasks],
    )


@router.get("/{task_id}")
async def get_task(task_id: UUID,session: DatabaseSession,current_user: CurrentUser, workspace_id: UUID | None = Query(default=None),):
    await RoleService(session).check_permission(current_user, "tasks", "view")
    task = await TaskService(TaskRepository(session, workspace_id), current_user.id).get_task(task_id, current_user.id)

    return SuccessResponse(
        success=True,
        message="Task fetched successfully",
        data=TaskResponse.model_validate(task),
    )


@router.put("/{task_id}")
async def update_task(task_id: UUID,payload: TaskUpdateRequest,session: DatabaseSession,current_user: CurrentUser, workspace_id: UUID | None = Query(default=None)):
    await RoleService(session).check_permission(current_user, "tasks", "update")
    task = await TaskService(TaskRepository(session, workspace_id), current_user.id).update_task(
        task_id,
        payload,
        current_user.id,
    )

    return SuccessResponse(
        success=True,
        message="Task updated successfully",
        data=TaskResponse.model_validate(task),
    )


@router.delete("/{task_id}")
async def delete_task(task_id: UUID,session: DatabaseSession,current_user: CurrentUser, workspace_id: UUID | None = Query(default=None),):
    await RoleService(session).check_permission(current_user, "tasks", "delete")
    await TaskService(TaskRepository(session, workspace_id), current_user.id).delete_task(task_id, current_user.id)

    return SuccessResponse(
        success=True,
        message="Task deleted successfully",
        data=None,
    )
