from uuid import UUID

from fastapi import HTTPException

from yo.repositories.event_webinar import EventWebinarRepository
from yo.schemas.requests.event_webinar import (
    EventWebinarCreateRequest,
    EventWebinarUpdateRequest,
)


class EventWebinarService:
    def __init__(self, repository: EventWebinarRepository):
        self.repository = repository

    async def get_event(self, event_id: UUID):
        event = await self.repository.get_by_id(event_id)
        if event is None:
            raise HTTPException(status_code=404, detail="Event webinar not found")
        return event

    async def list_events(
        self,
        search: str | None = None,
        page: int = 1,
        per_page: int = 10,
    ):
        return await self.repository.list_events(search, page, per_page)

    async def get_options(self):
        return await self.repository.get_options()

    async def create_event(
        self,
        payload: EventWebinarCreateRequest,
        user_id: UUID,
    ):
        values = payload.model_dump()
        values["created_by"] = user_id
        values["updated_by"] = user_id
        return await self.repository.create(values)

    async def update_event(
        self,
        event_id: UUID,
        payload: EventWebinarUpdateRequest,
        user_id: UUID,
    ):
        event = await self.get_event(event_id)
        values = payload.model_dump(exclude_unset=True)
        values["updated_by"] = user_id
        return await self.repository.update(event, values)

    async def delete_event(self, event_id: UUID, user_id: UUID):
        event = await self.get_event(event_id)
        await self.repository.delete(event, user_id)
        return {"deleted": True}

    async def bulk_delete_events(self, ids: list[UUID], user_id: UUID):
        deleted_count = await self.repository.bulk_delete(ids, user_id)
        return {"deleted_count": deleted_count}