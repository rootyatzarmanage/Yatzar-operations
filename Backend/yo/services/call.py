from uuid import UUID

from fastapi import HTTPException

from yo.repositories.call import CallRepository
from yo.schemas.requests.call import CallCreateRequest, CallUpdateRequest


class CallService:
    VALID_STATUSES = {"Completed", "Scheduled", "Missed"}

    def __init__(self, repository: CallRepository):
        self.repository = repository

    async def get_call(self, call_id: UUID):
        call = await self.repository.get_call(call_id)
        if not call:
            raise HTTPException(status_code=404, detail="Call not found.")
        return call

    async def _validate_contact(self, contact_id: UUID):
        contact = await self.repository.get_contact(contact_id)
        if not contact:
            raise HTTPException(
                status_code=400,
                detail="Selected contact does not exist.",
            )
        return contact

    def _validate_status(self, call_status: str | None):
        if (
            call_status is not None
            and call_status not in self.VALID_STATUSES
        ):
            raise HTTPException(
                status_code=400,
                detail="Status must be Completed, Scheduled, or Missed.",
            )

    async def list_calls(
        self,
        search: str | None = None,
        page: int = 1,
        per_page: int = 5,
        call_id: UUID | None = None,
    ):
        result = await self.repository.list_calls(
            search=search,
            page=page,
            per_page=per_page,
            call_id=call_id,
        )

        if call_id is not None and not result["items"]:
            raise HTTPException(
                status_code=404,
                detail="Call not found.",
            )

        return result

    async def create_call(
        self,
        payload: CallCreateRequest,
        user_id: UUID,
    ):
        await self._validate_contact(payload.contact_id)
        self._validate_status(payload.call_status)

        values = payload.model_dump()
        values["created_by"] = user_id
        values["updated_by"] = user_id

        return await self.repository.create_call(values)

    async def update_call(
        self,
        call_id: UUID,
        payload: CallUpdateRequest,
        user_id: UUID,
    ):
        call = await self.get_call(call_id)
        values = payload.model_dump(exclude_unset=True)

        if values.get("contact_id") is not None:
            await self._validate_contact(values["contact_id"])

        self._validate_status(values.get("call_status"))

        values["updated_by"] = user_id
        return await self.repository.update_call(call, values)

    async def delete_call(self, call_id: UUID, user_id: UUID):
        call = await self.get_call(call_id)
        await self.repository.soft_delete_call(call, user_id)
