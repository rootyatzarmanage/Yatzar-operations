import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from yo.models.task import Task
from yo.models.task_contact import TaskContact
from yo.models.contact import Contact
from yo.models.tag import Tag


class TaskRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_tasks(self, search: str | None = None):
        query = select(Task).where(Task.deleted_at.is_(None))
        if search:
            query = query.where(Task.subject.ilike(f"%{search}%"))
        result = await self.session.execute(query.order_by(Task.created_at.desc()))
        tasks = list(result.scalars().all())
        for task in tasks:
            task.contact_ids = await self.get_contact_ids(task.id)
        return tasks

    async def get_by_id(self, task_id: uuid.UUID):
        result = await self.session.execute(
            select(Task).where(
                Task.id == task_id,
                Task.deleted_at.is_(None),
            )
        )
        task = result.scalar_one_or_none()
        if task:
            task.contact_ids = await self.get_contact_ids(task.id)
        return task

    async def get_contact_ids(self, task_id: uuid.UUID):
        result = await self.session.execute(
            select(TaskContact.contact_id).where(TaskContact.task_id == task_id)
        )
        return list(result.scalars().all())

    async def get_active_tag(self, tag_id: uuid.UUID):
        result = await self.session.execute(
            select(Tag).where(
                Tag.id == tag_id,
                Tag.status == 1,
                Tag.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def get_customers(self, contact_ids: list[uuid.UUID]):
        if not contact_ids:
            return []

        result = await self.session.execute(
            select(Contact).where(
                Contact.id.in_(contact_ids),
                Contact.deleted_at.is_(None),
            )
        )
        return list(result.scalars().all())

    async def set_contacts(self,task_id: uuid.UUID,contact_ids: list[uuid.UUID]):
        existing = await self.session.execute(
            select(TaskContact).where(TaskContact.task_id == task_id)
        )

        for item in existing.scalars().all():
            await self.session.delete(item)

        for contact_id in set(contact_ids):
            self.session.add(TaskContact(task_id=task_id, contact_id=contact_id))
        await self.session.flush()

    async def create(self, values: dict, contact_ids: list[uuid.UUID]):
        task = Task(**values)
        self.session.add(task)
        await self.session.flush()

        await self.set_contacts(task.id, contact_ids)
        await self.session.refresh(task)
        task.contact_ids = await self.get_contact_ids(task.id)

        return task

    async def update(self,task: Task,values: dict,contact_ids: list[uuid.UUID] | None = None):
        for key, value in values.items():
            setattr(task, key, value)

        if contact_ids is not None:
            await self.set_contacts(task.id, contact_ids)

        await self.session.flush()
        await self.session.refresh(task)
        task.contact_ids = await self.get_contact_ids(task.id)

        return task

    async def soft_delete(self, task: Task, user_id: uuid.UUID):
        task.deleted_at = datetime.now(timezone.utc)
        task.deleted_by = user_id
        await self.session.flush()