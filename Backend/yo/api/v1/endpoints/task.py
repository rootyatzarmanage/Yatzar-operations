from uuid import UUID

from fastapi import APIRouter, Query, status

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
    service = TaskService(TaskRepository(session))
    task = await service.create_task(payload, current_user.id)

    return SuccessResponse(
        success=True,
        message="Task created successfully",
        data=TaskResponse.model_validate(task),
    )


@router.get("")
async def list_tasks(session: DatabaseSession,current_user: CurrentUser,search: str | None = Query(default=None),):
    tasks = await TaskService(
        TaskRepository(session)
    ).list_tasks(search)

    return SuccessResponse(
        success=True,
        message="Tasks fetched successfully",
        data=[TaskResponse.model_validate(task) for task in tasks],
    )


@router.get("/{task_id}")
async def get_task(task_id: UUID,session: DatabaseSession,current_user: CurrentUser,):
    task = await TaskService(
        TaskRepository(session)
    ).get_task(task_id)

    return SuccessResponse(
        success=True,
        message="Task fetched successfully",
        data=TaskResponse.model_validate(task),
    )


@router.put("/{task_id}")
async def update_task(task_id: UUID,payload: TaskUpdateRequest,session: DatabaseSession,current_user: CurrentUser):
    task = await TaskService(TaskRepository(session)).update_task(
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
async def delete_task(task_id: UUID,session: DatabaseSession,current_user: CurrentUser,):
    await TaskService(
        TaskRepository(session)
    ).delete_task(task_id, current_user.id)

    return SuccessResponse(
        success=True,
        message="Task deleted successfully",
        data=None,
    )