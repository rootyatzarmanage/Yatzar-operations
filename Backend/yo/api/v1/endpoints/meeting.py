import logging
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from yo.core.auth.dependencies import CurrentUser
from yo.core.database.dependencies import DatabaseSession
from yo.core.schemas.responses import SuccessResponse
from yo.repositories.meeting import MeetingRepository
from yo.schemas.requests.meeting import MeetingCreateRequest, MeetingUpdateRequest
from yo.schemas.responses.meeting import MeetingListResponse, MeetingResponse
from yo.services.meeting import MeetingService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/meetings", tags=["Meetings"])


@router.get("", response_model=SuccessResponse)
async def get_meetings(
    session: DatabaseSession,
    current_user: CurrentUser,
    meeting_id: UUID | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=5, ge=1, le=100),
):
    service = MeetingService(MeetingRepository(session))

    try:
        if meeting_id is not None:
            meeting = await service.get_meeting(meeting_id)
            data = MeetingResponse.model_validate(meeting)
        else:
            result = await service.get_meetings(
                search=search,
                page=page,
                per_page=per_page,
            )
            data = MeetingListResponse(
                items=[
                    MeetingResponse.model_validate(item)
                    for item in result["items"]
                ],
                total=result["total"],
                page=page,
                per_page=per_page,
            )

        return SuccessResponse(
            success=True,
            message="Meetings retrieved successfully",
            data=data,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to retrieve meetings")
        raise HTTPException(
            status_code=500, detail="Failed to retrieve meetings"
        )


@router.post("", response_model=SuccessResponse, status_code=status.HTTP_201_CREATED)
async def create_meeting(
    payload: MeetingCreateRequest,
    session: DatabaseSession,
    current_user: CurrentUser,
):
    try:
        meeting = await MeetingService(
            MeetingRepository(session)
        ).create_meeting(payload, current_user.id)

        return SuccessResponse(
            success=True,
            message="Meeting created successfully",
            data=MeetingResponse.model_validate(meeting),
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to create meeting")
        raise HTTPException(status_code=500, detail="Failed to create meeting")


@router.put("/{meeting_id}", response_model=SuccessResponse)
async def update_meeting(
    meeting_id: UUID,
    payload: MeetingUpdateRequest,
    session: DatabaseSession,
    current_user: CurrentUser,
):
    try:
        meeting = await MeetingService(
            MeetingRepository(session)
        ).update_meeting(meeting_id, payload, current_user.id)

        return SuccessResponse(
            success=True,
            message="Meeting updated successfully",
            data=MeetingResponse.model_validate(meeting),
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to update meeting")
        raise HTTPException(status_code=500, detail="Failed to update meeting")


@router.delete("/{meeting_id}", response_model=SuccessResponse)
async def delete_meeting(
    meeting_id: UUID,
    session: DatabaseSession,
    current_user: CurrentUser,
):
    try:
        await MeetingService(
            MeetingRepository(session)
        ).delete_meeting(meeting_id, current_user.id)

        return SuccessResponse(
            success=True,
            message="Meeting deleted successfully",
            data=None,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to delete meeting")
        raise HTTPException(status_code=500, detail="Failed to delete meeting")