from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException

from yo.core.config import settings
from yo.core.ics import build_ics
from yo.core.mail_schedule import reminder_offset
from yo.models.calendar_event import CalendarEvent, CalendarEventGuest
from yo.repositories.calendar_event import CalendarEventRepository
from yo.repositories.workspace import WorkspaceRepository
from yo.schemas.requests.calendar_event import CalendarEventCreateRequest, CalendarEventUpdateRequest
from yo.schemas.responses.calendar_event import CalendarEventResponse, CalendarGuestResponse
from yo.services.calendar_mail import valid_token
from yo.services.workspace import WorkspaceService

RSVP = {"yes": "accepted", "no": "declined", "maybe": "maybe"}
DETAIL_FIELDS = ("title", "location", "description", "all_day", "starts_at", "ends_at", "repeat_frequency")
TIME_FIELDS = ("all_day", "starts_at", "ends_at")


class CalendarEventService:
    def __init__(self, repository: CalendarEventRepository, user):
        self.repository = repository
        self.user = user
        self.email = user.email.strip().lower()

    def _mine(self, event: CalendarEvent):
        return next((g for g in event.guests if g.email == self.email and not g.is_removed), None)

    def _offset(self, event: CalendarEvent):
        return reminder_offset(event.reminder if event.created_by == self.user.id else event.guests_reminder)

    async def get_event(self, event_id: UUID) -> CalendarEvent:
        event = await self.repository.get_event(event_id)
        visible = event is not None and (
            self._mine(event) is not None
            or (event.workspace_id is not None and await WorkspaceRepository(self.repository.session)
                .user_has_workspace(self.user.id, event.workspace_id))
        )
        if not visible:
            raise HTTPException(404, "Event not found.")
        return event

    def _organizer_only(self, event: CalendarEvent) -> None:
        if event.created_by != self.user.id:
            raise HTTPException(403, "Only the organizer can change this event.")

    @staticmethod
    def _validate(starts_at, ends_at) -> None:
        if starts_at is None or ends_at is None or ends_at <= starts_at:
            raise HTTPException(400, "Event end must be after its start.")

    def present(self, event: CalendarEvent) -> CalendarEventResponse:
        guest, offset = self._mine(event), self._offset(event)
        return CalendarEventResponse(
            id=event.id, workspace_id=event.workspace_id, title=event.title, event_type=event.event_type,
            location=event.location, description=event.description, all_day=event.all_day,
            starts_at=event.starts_at, ends_at=event.ends_at, repeat_frequency=event.repeat_frequency,
            reminder=event.reminder, guests_reminder=event.guests_reminder,
            guests=[CalendarGuestResponse.model_validate(g) for g in event.guests if not g.is_removed],
            created_by=event.created_by, is_organizer=event.created_by == self.user.id,
            my_response=guest.response if guest else None,
            my_reminder_minutes=None if offset is None else int(offset.total_seconds() // 60),
        )

    def ics(self, event: CalendarEvent) -> str:
        organizer = next((g for g in event.guests if g.is_organizer), None)
        return build_ics(event, "PUBLISH", settings.MAIL_FROM_ADDRESS, organizer.name if organizer else None,
                         [g for g in event.guests if not g.is_removed], self._offset(event))

    async def list_events(self, start, end, include_workspace: bool) -> list[CalendarEvent]:
        if include_workspace and self.repository.workspace_id is not None:
            await WorkspaceService(self.repository.session).ensure_access(self.user.id, self.repository.workspace_id)
        return await self.repository.list_events(self.user.id, self.email, start, end, include_workspace)

    def _add_guests(self, event: CalendarEvent, entries, notify: bool) -> None:
        known = {g.email for g in event.guests}
        for entry in entries:
            email = str(entry.email).strip().lower()
            if email in known:
                continue
            known.add(email)
            event.guests.append(CalendarEventGuest(
                email=email, name=entry.name, notified_sequence=-1 if notify else event.sequence,
            ))

    async def create_event(self, payload: CalendarEventCreateRequest) -> CalendarEvent:
        await WorkspaceService(self.repository.session).ensure_access(self.user.id, self.repository.workspace_id)
        self._validate(payload.starts_at, payload.ends_at)
        event = CalendarEvent(
            **payload.model_dump(exclude={"guests", "send_invites"}),
            sequence=0, created_by=self.user.id, updated_by=self.user.id,
        )
        event.guests = [CalendarEventGuest(
            email=self.email, name=self.user.username, response="accepted", is_organizer=True, notified_sequence=0,
        )]
        self._add_guests(event, payload.guests, payload.send_invites)
        return await self.repository.add(event)

    async def update_event(self, event_id: UUID, payload: CalendarEventUpdateRequest) -> CalendarEvent:
        event = await self.get_event(event_id)
        self._organizer_only(event)
        values = payload.model_dump(exclude_unset=True, exclude={"guests", "send_invites"})
        self._validate(values.get("starts_at", event.starts_at), values.get("ends_at", event.ends_at))
        detail = any(k in values and values[k] != getattr(event, k) for k in DETAIL_FIELDS)
        retimed = any(k in values and values[k] != getattr(event, k) for k in TIME_FIELDS)
        for key, value in values.items():
            setattr(event, key, value)
        if detail:
            event.sequence += 1 
        if payload.guests is not None:
            wanted = {str(g.email).strip().lower(): g for g in payload.guests}
            for guest in event.guests:
                if guest.is_organizer:
                    continue
                if guest.email in wanted:
                    wanted.pop(guest.email)
                    if guest.is_removed:  
                        guest.is_removed, guest.cancel_sent = False, False
                        guest.response, guest.notified_sequence = "needs_action", -1
                elif not guest.is_removed:
                    guest.is_removed = True  
            self._add_guests(event, wanted.values(), True)
        if retimed: 
            for guest in event.guests:
                if not guest.is_organizer and not guest.is_removed:
                    guest.response = "needs_action"
        if not payload.send_invites:  
            for guest in event.guests:
                if guest.is_removed:
                    guest.cancel_sent = True
                elif guest.notified_sequence < event.sequence:
                    guest.notified_sequence = event.sequence
        event.updated_by = self.user.id
        event.updated_at = datetime.now(timezone.utc)
        await self.repository.session.flush()
        return event

    async def delete_event(self, event_id: UUID) -> CalendarEvent:
        event = await self.get_event(event_id)
        self._organizer_only(event)
        now = datetime.now(timezone.utc)
        event.deleted_at, event.deleted_by, event.updated_at, event.updated_by = now, self.user.id, now, self.user.id
        event.sequence += 1
        await self.repository.session.flush()
        return event

    async def respond(self, event_id: UUID, response: str):
        event = await self.get_event(event_id)
        guest = self._mine(event)
        if guest is None:
            raise HTTPException(403, "You are not a guest of this event.")
        guest.response, guest.responded_at = response, datetime.now(timezone.utc)
        await self.repository.session.flush()
        return event, guest


async def rsvp_from_link(session, guest_id: UUID, token: str, answer: str):
    guest = await session.get(CalendarEventGuest, guest_id)
    if guest is None or not valid_token(guest_id, token):
        raise HTTPException(403, "This response link is invalid.")
    event = await session.get(CalendarEvent, guest.event_id)
    if event is None or event.deleted_at is not None or guest.is_removed:
        raise HTTPException(404, "This event is no longer available.")
    guest.response, guest.responded_at = RSVP[answer], datetime.now(timezone.utc)
    await session.flush()
    return event, guest