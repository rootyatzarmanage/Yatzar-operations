import uuid
from datetime import datetime

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from yo.models.calendar_event import CalendarEvent, CalendarEventGuest
from yo.repositories.base import BaseRepository
from yo.repositories.workspace import WorkspaceRepository


class CalendarEventRepository(BaseRepository):
    def __init__(self, session: AsyncSession, workspace_id: uuid.UUID | None):
        super().__init__(CalendarEvent, session)
        self.workspace_id = workspace_id

    async def get_event(self, event_id: uuid.UUID) -> CalendarEvent | None:
        return await self.session.scalar(select(CalendarEvent).where(
            CalendarEvent.id == event_id, CalendarEvent.deleted_at.is_(None),
        ))

    async def list_events(self, user_id: uuid.UUID, email: str, start: datetime | None,
                          end: datetime | None, include_workspace: bool) -> list[CalendarEvent]:
        invited = CalendarEvent.id.in_(select(CalendarEventGuest.event_id).where(
            func.lower(CalendarEventGuest.email) == email, CalendarEventGuest.is_removed.is_(False)))
        scope = invited
        if include_workspace:
            scope = or_(invited, WorkspaceRepository.scope_condition(CalendarEvent.workspace_id, user_id, self.workspace_id))
        conditions = [CalendarEvent.deleted_at.is_(None), scope]
        if end:
            conditions.append(CalendarEvent.starts_at <= end)
        if start:
            conditions.append(or_(CalendarEvent.ends_at >= start, CalendarEvent.repeat_frequency != "None"))
        result = await self.session.execute(
            select(CalendarEvent).where(*conditions).order_by(CalendarEvent.starts_at.asc())
        )
        return list(result.scalars().unique().all())

    async def add(self, event: CalendarEvent) -> CalendarEvent:
        self.session.add(event)
        await self.session.flush()
        return event

    async def get_guest(self, guest_id: uuid.UUID) -> CalendarEventGuest | None:
        return await self.session.get(CalendarEventGuest, guest_id)