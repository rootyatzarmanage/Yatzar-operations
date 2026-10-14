from uuid import UUID

from fastapi import HTTPException

from yo.repositories.task import TaskRepository
from yo.schemas.requests.task import TaskCreateRequest, TaskUpdateRequest


class TaskService:
    def __init__(self, repository: TaskRepository):
        self.repository = repository

    async def _validate_selection(self,tag_id: UUID | None,contact_ids: list[UUID]):
        contact_ids = list(set(contact_ids))

        if not contact_ids and tag_id is None:
            return contact_ids

        if tag_id is None:
            raise HTTPException(400, "Select a tag.")

        tag = await self.repository.get_active_tag(tag_id)
        if not tag:
            raise HTTPException(400, "Selected tag is not active or does not exist.")

        contacts = await self.repository.get_customers(contact_ids)

        if len(contacts) != len(contact_ids):
            raise HTTPException(400, "One or more selected contacts do not exist or are deleted")

        if any(contact.tag_id != tag_id for contact in contacts):
            raise HTTPException(400, "All selected customers must belong to the selected tag.")

        return contact_ids

    async def list_tasks(self, search: str | None = None):
        return await self.repository.list_tasks(search)

    async def get_task(self, task_id: UUID):
        task = await self.repository.get_by_id(task_id)
        if not task:
            raise HTTPException(404, "Task not found.")
        return task

    async def create_task(self, request: TaskCreateRequest, user_id: UUID):
        contact_ids = await self._validate_selection(request.tag_id, request.contact_ids)

        values = request.model_dump(exclude={"contact_ids"})
        values["task_owner_id"] = user_id
        values["created_by"] = user_id

        return await self.repository.create(values, contact_ids)

    async def update_task(self, task_id: UUID, request: TaskUpdateRequest,user_id: UUID,):
        task = await self.get_task(task_id)
        values = request.model_dump(
            exclude_unset=True,
            exclude={"contact_ids"},
        )

        tag_id = values.get("tag_id", task.tag_id)
        contact_ids = (
            request.contact_ids
            if "contact_ids" in request.model_fields_set
            else task.contact_ids
        )
        values["updated_by"] = user_id
        contact_ids = await self._validate_selection(tag_id, contact_ids)
        return await self.repository.update(task, values, contact_ids)

    async def delete_task(self, task_id: UUID, user_id: UUID):
        task = await self.get_task(task_id)
        await self.repository.soft_delete(task, user_id)