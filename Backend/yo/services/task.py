from uuid import UUID
from fastapi import HTTPException

from yo.services.workspace import WorkspaceService
from yo.repositories.task import TaskRepository
from yo.schemas.requests.task import TaskCreateRequest, TaskUpdateRequest


class TaskService:
    def __init__(self, repository: TaskRepository, user_id: UUID):
        self.repository = repository
        self.user_id = user_id

    async def _validate_selection(self, selection, user_id: UUID) -> dict:
        selection_type = selection.selection_type
        contact_ids = list(set(selection.contact_ids))
        tag_id = selection.tag_id

        if selection_type == "name":
            tag_id = None

        elif selection_type == "tag":
            if tag_id is None:
                raise HTTPException(400, "Select a tag.")

            tag = await self.repository.get_active_tag(tag_id)
            if not tag:
                raise HTTPException(
                    400, "Selected tag is not active or does not exist."
                )

            contacts = await self.repository.get_customers(contact_ids, user_id)

            if len(contacts) != len(contact_ids):
                raise HTTPException(
                    400, "One or more selected contacts do not exist or are deleted."
                )

            if any(contact.tag_id != tag_id for contact in contacts):
                raise HTTPException(
                    400, "All selected contacts must belong to the selected tag."
                )

        contacts = await self.repository.get_customers(contact_ids, user_id)
        if len(contacts) != len(contact_ids):
            raise HTTPException(
                400, "One or more selected contacts do not exist or are deleted."
            )

        return {
            "selection_type": selection_type,
            "tag_id": str(tag_id) if tag_id else None,
            "contact_ids": [str(contact_id) for contact_id in contact_ids],
        }

    async def _references_accessible(self, task, user_id: UUID) -> bool:
        ids = list({UUID(value) for value in task.contact_selection.get("contact_ids", [])})
        return len(await self.repository.get_customers(ids, user_id, workspace_id=task.workspace_id)) == len(ids)

    async def list_tasks(self, user_id: UUID, search: str | None = None):
        if self.repository.workspace_id is not None:
            await WorkspaceService(self.repository.session).ensure_access(
                self.user_id, self.repository.workspace_id,
            )
        tasks = await self.repository.list_tasks(user_id, search)
        return [task for task in tasks if await self._references_accessible(task, user_id)]

    async def get_task(self, task_id: UUID, user_id: UUID):
        await WorkspaceService(self.repository.session).ensure_access(
            self.user_id, self.repository.workspace_id,
        )
        task = await self.repository.get_by_id(task_id, user_id)
        if not task or not await self._references_accessible(task, user_id):
            raise HTTPException(404, "Task not found.")
        return task

    async def create_task(self, request: TaskCreateRequest, user_id: UUID):
        await WorkspaceService(self.repository.session).ensure_access(
            self.user_id, self.repository.workspace_id,
        )
        values = request.model_dump(exclude={"contact_selection"})
        values["contact_selection"] = await self._validate_selection(
            request.contact_selection, user_id
        )
        values["task_owner_id"] = user_id
        values["created_by"] = user_id
        values["updated_by"] = user_id

        return await self.repository.create(values)

    async def update_task(self, task_id: UUID, request: TaskUpdateRequest, user_id: UUID):
        await WorkspaceService(self.repository.session).ensure_access(
            self.user_id, self.repository.workspace_id,
        )
        task = await self.get_task(task_id, user_id)
        values = request.model_dump(exclude_unset=True)

        if "contact_selection" in values:
            selection = request.contact_selection
            if selection is not None:
                values["contact_selection"] = await self._validate_selection(
                    selection, user_id
                )

        values["updated_by"] = user_id
        return await self.repository.update(task, values)

    async def delete_task(self, task_id: UUID, user_id: UUID):
        await WorkspaceService(self.repository.session).ensure_access(
            self.user_id, self.repository.workspace_id,
        )
        task = await self.get_task(task_id, user_id)
        await self.repository.soft_delete(task, user_id)
