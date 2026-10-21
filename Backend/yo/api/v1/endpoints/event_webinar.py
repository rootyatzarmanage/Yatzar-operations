import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from yo.core.auth.permissions import require_permission
from yo.core.exceptions import AppException
from yo.core.auth.dependencies import CurrentUser
from yo.core.database import DatabaseSession
from yo.core.schemas.responses import SuccessResponse
from yo.repositories.event_webinar import EventWebinarRepository
from yo.services.event_webinar import EventWebinarService
from yo.schemas.requests.event_webinar import (
    EventWebinarCreateRequest,
    EventWebinarUpdateRequest,
    EventWebinarBulkDeleteRequest,
)
from yo.schemas.responses.event_webinar import (
    EventWebinarResponse,
    EventWebinarListResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/event-webinars", tags=["Event Webinars"])


def get_service(session: DatabaseSession, workspace_id: UUID | None, user_id: UUID) -> EventWebinarService:
    repository = EventWebinarRepository(session, workspace_id)
    return EventWebinarService(repository, user_id)


@router.post("", dependencies=[Depends(require_permission("eventWebinar", "create"))])
async def create_event(
    payload: EventWebinarCreateRequest,
    session: DatabaseSession,
    current_user: CurrentUser,
):
    try:
        service = get_service(session, payload.workspace_id, current_user.id)
        event = await service.create_event(payload, current_user.id)

        return SuccessResponse(
            success=True,
            message="Event webinar created successfully",
            data=EventWebinarResponse.model_validate(event),
        )
    except (HTTPException, AppException):
        raise
    except Exception:
        logger.exception("Failed to create event webinar")
        raise HTTPException(
            status_code=500,
            detail="Failed to create event webinar",
        )


@router.get("", dependencies=[Depends(require_permission("eventWebinar", "view"))])
async def get_events(
    session: DatabaseSession,
    current_user: CurrentUser,
    workspace_id: UUID | None = Query(default=None),
    event_id: UUID | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=10, ge=1, le=100),
    include_options: bool = Query(default=False),
):
    try:
        service = get_service(session, workspace_id, current_user.id)

        if event_id is not None:
            event = await service.get_event(event_id)
            data = EventWebinarResponse.model_validate(event)
            message = "Event webinar retrieved successfully"
        else:
            result = await service.list_events(
                search=search,
                page=page,
                per_page=per_page,
            )

            data = EventWebinarListResponse(
                items=[
                    EventWebinarResponse.model_validate(item)
                    for item in result["items"]
                ],
                total=result["total"],
                page=result["page"],
                per_page=result["per_page"],
            )
            message = "Event webinars retrieved successfully"

        response_data = {"events": data}

        if include_options:
            response_data["options"] = await service.get_options()

        return SuccessResponse(
            success=True,
            message=message,
            data=response_data,
        )
    except (HTTPException, AppException):
        raise
    except Exception:
        logger.exception("Failed to retrieve event webinars")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve event webinars",
        )


@router.put("/{event_id}", dependencies=[Depends(require_permission("eventWebinar", "update"))])
async def update_event(
    event_id: UUID,
    payload: EventWebinarUpdateRequest,
    session: DatabaseSession,
    current_user: CurrentUser,
    workspace_id: UUID | None = Query(default=None),
):
    try:
        service = get_service(session, workspace_id, current_user.id)
        event = await service.update_event(
            event_id,
            payload,
            current_user.id,
        )

        return SuccessResponse(
            success=True,
            message="Event webinar updated successfully",
            data=EventWebinarResponse.model_validate(event),
        )
    except (HTTPException, AppException):
        raise
    except Exception:
        logger.exception("Failed to update event webinar")
        raise HTTPException(
            status_code=500,
            detail="Failed to update event webinar",
        )


@router.delete("/{event_id}", dependencies=[Depends(require_permission("eventWebinar", "delete"))])
async def delete_event(
    event_id: UUID,
    session: DatabaseSession,
    current_user: CurrentUser,
    workspace_id: UUID | None = Query(default=None),
):
    try:
        service = get_service(session, workspace_id, current_user.id)
        data = await service.delete_event(event_id, current_user.id)

        return SuccessResponse(
            success=True,
            message="Event webinar deleted successfully",
            data=data,
        )
    except (HTTPException, AppException):
        raise
    except Exception:
        logger.exception("Failed to delete event webinar")
        raise HTTPException(
            status_code=500,
            detail="Failed to delete event webinar",
        )


@router.post("/bulk-delete", dependencies=[Depends(require_permission("eventWebinar", "delete"))])
async def bulk_delete_events(
    payload: EventWebinarBulkDeleteRequest,
    session: DatabaseSession,
    current_user: CurrentUser,
    workspace_id: UUID | None = Query(default=None),
):
    try:
        service = get_service(session, workspace_id, current_user.id)
        data = await service.bulk_delete_events(
            payload.ids,
            current_user.id,
        )

        return SuccessResponse(
            success=True,
            message="Event webinars deleted successfully",
            data=data,
        )
    except (HTTPException, AppException):
        raise
    except Exception:
        logger.exception("Failed to bulk delete event webinars")
        raise HTTPException(
            status_code=500,
            detail="Failed to bulk delete event webinars",
        )
