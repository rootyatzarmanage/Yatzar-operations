from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException

from yo.services.workspace import WorkspaceService
from yo.models.meeting import Meeting
from yo.repositories.meeting import MeetingRepository
from yo.repositories.contact import ContactRepository
from yo.schemas.requests.meeting import (
    MeetingCreateRequest,
    MeetingUpdateRequest,
)


class MeetingService:
    def __init__(self, repository: MeetingRepository, user_id: UUID):
        self.repository = repository
        self.user_id = user_id

    async def get_meeting(self, meeting_id: UUID) -> Meeting:
        await WorkspaceService(self.repository.session).ensure_access(
            self.user_id, self.repository.workspace_id,
        )
        meeting = await self.repository.get_meeting(meeting_id)

        if meeting is None:
            raise HTTPException(404, "Meeting not found.")

        return meeting

    async def get_meetings(
        self,
        search: str | None = None,
        page: int = 1,
        per_page: int = 5,
    ) -> dict:
        if self.repository.workspace_id is not None:
            await WorkspaceService(self.repository.session).ensure_access(
                self.user_id, self.repository.workspace_id,
            )
        return await self.repository.list_meetings(
            user_id=self.user_id,
            search=search,
            page=page,
            per_page=per_page,
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

        await WorkspaceService(self.repository.session).ensure_access(
            self.user_id, self.repository.workspace_id,
        )
        self._validate_schedule(payload.starts_at, payload.ends_at)
        await self._validate_participants(payload.participants)
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
        await WorkspaceService(self.repository.session).ensure_access(
            self.user_id, self.repository.workspace_id,
        )
        meeting = await self.get_meeting(meeting_id)

        values = payload.model_dump(exclude_unset=True)

        starts_at = values.get("starts_at", meeting.starts_at)
        ends_at = values.get("ends_at", meeting.ends_at)

        self._validate_schedule(starts_at, ends_at)

        if "participants" in values and values["participants"] is not None:
            await self._validate_participants(payload.participants)
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
        await WorkspaceService(self.repository.session).ensure_access(
            self.user_id, self.repository.workspace_id,
        )
        meeting = await self.get_meeting(meeting_id)
        await self.repository.soft_delete_meeting(meeting, user_id)

    @staticmethod
    def _validate_schedule(starts_at, ends_at) -> None:
        if starts_at is None or ends_at is None or ends_at <= starts_at:
            raise HTTPException(400, "Meeting end must be after its start.")

    async def _validate_participants(self, participants) -> None:
        repository = ContactRepository(self.repository.session)
        for participant in participants:
            contact = await repository.get_detail(participant.id, self.user_id)
            if (
                contact is None or contact.workspace_id != self.repository.workspace_id
                or contact.stage != participant.type
            ):
                raise HTTPException(400, "Selected participant is not in this workspace.")
