from datetime import datetime, timezone
from uuid import UUID

from yo.models.meeting import Meeting
from yo.repositories.meeting import MeetingRepository
from yo.schemas.requests.meeting import (
    MeetingCreateRequest,
    MeetingUpdateRequest,
)


class MeetingService:
    def __init__(self, repository: MeetingRepository):
        self.repository = repository

    async def get_meeting(self, meeting_id: UUID) -> Meeting:
        meeting = await self.repository.get_meeting(meeting_id)

        if meeting is None:
            raise ValueError(f"Meeting {meeting_id} was not found")

        return meeting

    async def get_meetings(
        self,
        search: str | None = None,
        page: int = 1,
        per_page: int = 5,
    ) -> dict:
        return await self.repository.list_meetings(
            search=search,
            page=page,
            per_page=per_page,
        )

    @staticmethod
    def _validate_schedule(starts_at, ends_at):
        if starts_at is not None and ends_at is not None:
            if ends_at <= starts_at:
                raise ValueError(
                    "Meeting end time must be after start time"
                )

    @staticmethod
    def _serialize_participants(participants):
        return [
            {
                "id": str(participant.id),
                "type": participant.type,
            }
            for participant in participants
        ]

    async def create_meeting(
        self,
        payload: MeetingCreateRequest,
        user_id: UUID,
    ) -> Meeting:
        self._validate_schedule(payload.starts_at, payload.ends_at)

        values = payload.model_dump()

        values["participants"] = self._serialize_participants(
            payload.participants
        )

        values["created_by"] = user_id
        values["updated_by"] = user_id

        return await self.repository.create_meeting(values)

    async def update_meeting(
        self,
        meeting_id: UUID,
        payload: MeetingUpdateRequest,
        user_id: UUID,
    ) -> Meeting:
        meeting = await self.get_meeting(meeting_id)

        values = payload.model_dump(exclude_unset=True)

        starts_at = values.get("starts_at", meeting.starts_at)
        ends_at = values.get("ends_at", meeting.ends_at)

        self._validate_schedule(starts_at, ends_at)

        if "participants" in values and values["participants"] is not None:
            values["participants"] = self._serialize_participants(
                payload.participants
            )

        values["updated_by"] = user_id
        values["updated_at"] = datetime.now(timezone.utc)

        return await self.repository.update_meeting(meeting, values)

    async def delete_meeting(
        self,
        meeting_id: UUID,
        user_id: UUID,
    ) -> None:
        meeting = await self.get_meeting(meeting_id)
        await self.repository.soft_delete_meeting(meeting, user_id)