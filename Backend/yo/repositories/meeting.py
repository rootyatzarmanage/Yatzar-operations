import uuid
from datetime import datetime, timezone

from sqlalchemy import or_, select, func , cast, String
from sqlalchemy.ext.asyncio import AsyncSession

from yo.models.meeting import Meeting
from yo.repositories.base import BaseRepository


class MeetingRepository(BaseRepository):
    def __init__(self, session: AsyncSession):
        super().__init__(Meeting, session)

    async def get_meeting(self, meeting_id: uuid.UUID) -> Meeting | None:
        result = await self.session.execute(
            select(Meeting).where(
                Meeting.id == meeting_id,
                Meeting.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def list_meetings(self,search: str | None = None,page: int = 1,per_page: int = 5) -> dict:
        conditions = [Meeting.deleted_at.is_(None)]

        if search and search.strip():
            term = f"%{search.strip()}%"
            conditions.append(
                or_(
                    Meeting.title.ilike(term),
                    Meeting.location.ilike(term),
                    Meeting.related_to.ilike(term),
                    cast(Meeting.participants, String).ilike(term),
                )
            )

        total_result = await self.session.execute(
            select(func.count(Meeting.id)).where(*conditions)
        )
        total = total_result.scalar_one()

        result = await self.session.execute(
            select(Meeting)
            .where(*conditions)
            .order_by(Meeting.starts_at.asc())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )

        return {
            "items": list(result.scalars().all()),
            "total": total,
        }

    async def create_meeting(self, values: dict) -> Meeting:
        meeting = Meeting(**values)
        self.session.add(meeting)
        await self.session.flush()
        await self.session.refresh(meeting)
        return meeting

    async def update_meeting(self,meeting: Meeting,values: dict) -> Meeting:
        for field, value in values.items():
            setattr(meeting, field, value)

        meeting.updated_at = datetime.now(timezone.utc)
        await self.session.flush()
        await self.session.refresh(meeting)
        return meeting

    async def soft_delete_meeting(self,meeting: Meeting,deleted_by: uuid.UUID) -> None:
        now = datetime.now(timezone.utc)
        meeting.deleted_at = now
        meeting.deleted_by = deleted_by
        meeting.updated_at = now
        meeting.updated_by = deleted_by
        await self.session.flush()