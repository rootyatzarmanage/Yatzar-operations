import logging
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from yo.core.auth.dependencies import CurrentUser
from yo.core.database.dependencies import DatabaseSession
from yo.core.schemas.responses import SuccessResponse
from yo.repositories.call import CallRepository
from yo.schemas.requests.call import CallCreateRequest, CallUpdateRequest
from yo.schemas.responses.call import CallListResponse, CallResponse
from yo.services.call import CallService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/calls", tags=["Calls"])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_call(
    payload: CallCreateRequest,
    session: DatabaseSession,
    current_user: CurrentUser,
):
    try:
        service = CallService(CallRepository(session))
        call = await service.create_call(payload, current_user.id)

        return SuccessResponse(
            success=True,
            message="Call created successfully",
            data=CallResponse.model_validate(call),
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error creating call")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create call.",
        )


@router.get("")
async def list_calls(
    session: DatabaseSession,
    current_user: CurrentUser,
    call_id: UUID | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=5, ge=1, le=100),
):
    try:
        result = await CallService(
            CallRepository(session)
        ).list_calls(
            search=search,
            page=page,
            per_page=per_page,
            call_id=call_id,
        )

        if call_id is not None:
            data = CallResponse.model_validate(result["items"][0])
            message = "Call retrieved successfully"
        else:
            data = CallListResponse(
                items=[
                    CallResponse.model_validate(item)
                    for item in result["items"]
                ],
                total=result["total"],
                page=result["page"],
                per_page=result["per_page"],
            )
            message = "Calls retrieved successfully"

        return SuccessResponse(
            success=True,
            message=message,
            data=data,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error retrieving calls")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve calls.",
        )


@router.put("/{call_id}")
async def update_call(
    call_id: UUID,
    payload: CallUpdateRequest,
    session: DatabaseSession,
    current_user: CurrentUser,
):
    try:
        call = await CallService(
            CallRepository(session)
        ).update_call(call_id, payload, current_user.id)

        return SuccessResponse(
            success=True,
            message="Call updated successfully",
            data=CallResponse.model_validate(call),
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error updating call %s", call_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update call.",
        )


@router.delete("/{call_id}")
async def delete_call(
    call_id: UUID,
    session: DatabaseSession,
    current_user: CurrentUser,
):
    try:
        await CallService(
            CallRepository(session)
        ).delete_call(call_id, current_user.id)

        return SuccessResponse(
            success=True,
            message="Call deleted successfully",
            data=None,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error deleting call %s", call_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete call.",
        )
