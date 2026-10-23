from datetime import datetime
from html import escape
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Query, status
from fastapi.responses import HTMLResponse

from yo.core.auth.dependencies import CurrentUser
from yo.core.database.dependencies import DatabaseSession
from yo.core.exceptions import AppException
from yo.core.mail_schedule import aware
from yo.core.schemas.responses import SuccessResponse
from yo.repositories.calendar_event import CalendarEventRepository
from yo.schemas.requests.calendar_event import (
    CalendarEventCreateRequest, CalendarEventUpdateRequest, CalendarRespondRequest,
)
from yo.services.calendar_event import CalendarEventService, rsvp_from_link
from yo.services.calendar_mail import send_calendar_mail, send_rsvp_notice
from yo.services.role import RoleService

router = APIRouter(prefix="/calendar-events", tags=["Calendar Events"])


async def _can_view_workspace_events(session, user) -> bool:
    try:
        await RoleService(session).check_permission(user, "eventWebinar", "view")
        return True
    except AppException:
        return False


def _service(session, user, workspace_id):
    return CalendarEventService(CalendarEventRepository(session, workspace_id), user)


@router.get("", response_model=SuccessResponse)
async def list_calendar_events(
    session: DatabaseSession,
    current_user: CurrentUser,
    workspace_id: UUID | None = Query(default=None),
    start: datetime | None = Query(default=None),
    end: datetime | None = Query(default=None),
):
    service = _service(session, current_user, workspace_id)
    events = await service.list_events(aware(start), aware(end), await _can_view_workspace_events(session, current_user))
    return SuccessResponse(success=True, message="Calendar events retrieved successfully",
                           data=[service.present(event) for event in events])


@router.post("", response_model=SuccessResponse, status_code=status.HTTP_201_CREATED)
async def create_calendar_event(
    payload: CalendarEventCreateRequest,
    background: BackgroundTasks,
    session: DatabaseSession,
    current_user: CurrentUser,
):
    await RoleService(session).check_permission(current_user, "eventWebinar", "create")
    service = _service(session, current_user, payload.workspace_id)
    event = await service.create_event(payload)
    await session.commit() 
    background.add_task(send_calendar_mail, event.id)
    return SuccessResponse(success=True, message="Event created successfully", data=service.present(event))


@router.put("/{event_id}", response_model=SuccessResponse)
async def update_calendar_event(
    event_id: UUID,
    payload: CalendarEventUpdateRequest,
    background: BackgroundTasks,
    session: DatabaseSession,
    current_user: CurrentUser,
    workspace_id: UUID | None = Query(default=None),
):
    service = _service(session, current_user, workspace_id)
    event = await service.update_event(event_id, payload)
    await session.commit()
    background.add_task(send_calendar_mail, event.id)
    return SuccessResponse(success=True, message="Event updated successfully", data=service.present(event))


@router.delete("/{event_id}", response_model=SuccessResponse)
async def delete_calendar_event(
    event_id: UUID,
    background: BackgroundTasks,
    session: DatabaseSession,
    current_user: CurrentUser,
    workspace_id: UUID | None = Query(default=None),
):
    event = await _service(session, current_user, workspace_id).delete_event(event_id)
    await session.commit()
    background.add_task(send_calendar_mail, event.id)  # sends the cancellation emails
    return SuccessResponse(success=True, message="Event deleted successfully", data=None)


@router.post("/{event_id}/respond", response_model=SuccessResponse)
async def respond_calendar_event(
    event_id: UUID,
    payload: CalendarRespondRequest,
    background: BackgroundTasks,
    session: DatabaseSession,
    current_user: CurrentUser,
    workspace_id: UUID | None = Query(default=None),
):
    service = _service(session, current_user, workspace_id)
    event, guest = await service.respond(event_id, payload.response)
    await session.commit()
    background.add_task(send_rsvp_notice, guest.id)
    return SuccessResponse(success=True, message="Response saved", data=service.present(event))


@router.get("/{event_id}/ics", response_model=SuccessResponse)
async def download_calendar_event_ics(
    event_id: UUID,
    session: DatabaseSession,
    current_user: CurrentUser,
    workspace_id: UUID | None = Query(default=None),
):
    service = _service(session, current_user, workspace_id)
    event = await service.get_event(event_id)
    return SuccessResponse(success=True, message="ICS generated",
                           data={"filename": "invite.ics", "content": service.ics(event)})


@router.get("/rsvp/{guest_id}", response_class=HTMLResponse, include_in_schema=False)
async def rsvp_from_email(
    guest_id: UUID,
    background: BackgroundTasks,
    session: DatabaseSession,
    response: Literal["yes", "no", "maybe"] = Query(...),
    token: str = Query(...),
):
    event, guest = await rsvp_from_link(session, guest_id, token, response)
    await session.commit()
    background.add_task(send_rsvp_notice, guest.id)
    label = {"yes": "Yes", "no": "No", "maybe": "Maybe"}[response]
    return HTMLResponse(
        '<html><body style="font-family:Arial,sans-serif;text-align:center;padding:60px">'
        f"<h2>Thanks!</h2><p>Your response <b>{label}</b> for <b>{escape(event.title)}</b> was recorded.</p>"
        "</body></html>"
    )