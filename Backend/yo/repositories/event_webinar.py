from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from yo.models.event_webinar import EventWebinar
from yo.models.user import User
from yo.repositories.workspace import WorkspaceRepository


class EventWebinarRepository:
    def __init__(self, session: AsyncSession, workspace_id: UUID | None):
        self.session = session
        self.workspace_id = workspace_id

    async def get_by_id(self, event_id: UUID):
        result = await self.session.execute(
            select(EventWebinar).where(
                EventWebinar.id == event_id,
                EventWebinar.deleted_at.is_(None),
                EventWebinar.workspace_id == self.workspace_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_events(
        self,
        user_id: UUID,
        search: str | None = None,
        page: int = 1,
        per_page: int = 10,
    ):
        conditions = [
            EventWebinar.deleted_at.is_(None),
            WorkspaceRepository.scope_condition(EventWebinar.workspace_id, user_id, self.workspace_id),
        ]

        if search and search.strip():
            term = f"%{search.strip()}%"
            conditions.append(
                or_(
                    EventWebinar.campaign_name.ilike(term),
                    EventWebinar.type.ilike(term),
                    EventWebinar.status.ilike(term),
                    EventWebinar.duration.ilike(term),
                    EventWebinar.description.ilike(term),
                )
            )

        count_result = await self.session.execute(
            select(func.count(EventWebinar.id)).where(*conditions)
        )
        total = count_result.scalar_one()

        result = await self.session.execute(
            select(EventWebinar)
            .where(*conditions)
            .order_by(EventWebinar.created_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )

        return {
            "items": result.scalars().all(),
            "total": total,
            "page": page,
            "per_page": per_page,
        }

    async def create(self, values: dict):
        event = EventWebinar(**values)
        self.session.add(event)
        await self.session.flush()
        await self.session.refresh(event)
        return event

    async def update(self, event: EventWebinar, values: dict):
        for key, value in values.items():
            setattr(event, key, value)

        await self.session.flush()
        await self.session.refresh(event)
        return event

    async def delete(self, event: EventWebinar, user_id: UUID):
        event.deleted_at = datetime.now(timezone.utc)
        event.deleted_by = user_id
        await self.session.flush()

    async def bulk_delete(self, ids: list[UUID], user_id: UUID):
        result = await self.session.execute(
            select(EventWebinar).where(
                EventWebinar.id.in_(ids),
                EventWebinar.deleted_at.is_(None),
                EventWebinar.workspace_id == self.workspace_id,
            )
        )
        events = result.scalars().all()

        now = datetime.now(timezone.utc)
        for event in events:
            event.deleted_at = now
            event.deleted_by = user_id

        await self.session.flush()
        return len(events)

    async def get_options(self):
        result = await self.session.execute(
            select(User.id, User.username).where(
                User.id.in_(WorkspaceRepository.owner_ids(self.workspace_id)),
            ).order_by(User.username)
        )

        return {
            "owners": [
                {"id": str(user_id), "name": username}
                for user_id, username in result.all()
            ]
        }
