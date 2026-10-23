import hashlib
import hmac
import logging
from datetime import timedelta
from html import escape
from urllib.parse import quote
from zoneinfo import ZoneInfo

from sqlalchemy import and_, or_, select

from yo.core.config import settings
from yo.core.database import AsyncSessionLocal
from yo.core.email import smtp_configured
from yo.core.ics import build_ics
from yo.core.mail_schedule import aware, reminder_offset
from yo.models.calendar_event import CalendarEvent, CalendarEventGuest
from yo.models.user import User
from yo.services.mail_worker import deliver

logger = logging.getLogger(__name__)


def rsvp_token(guest_id) -> str:
    return hmac.new(settings.SESSION_SECRET.encode(), f"rsvp:{guest_id}".encode(), hashlib.sha256).hexdigest()[:40]


def valid_token(guest_id, token: str) -> bool:
    return hmac.compare_digest(rsvp_token(guest_id), token or "")


def _local(value):
    return aware(value).astimezone(ZoneInfo(settings.MAIL_TIMEZONE))


def when_text(event) -> str:
    start, end = _local(event.starts_at), _local(event.ends_at)
    if event.all_day:
        text = f"{start:%A, %d %B %Y}"
        if end.date() != start.date():
            text += f" to {end:%A, %d %B %Y}"
        return text + " (all day)"
    text = f"{start:%A, %d %B %Y, %I:%M %p}"
    text += f" to {end:%I:%M %p}" if end.date() == start.date() else f" to {end:%A, %d %B %Y, %I:%M %p}"
    return f"{text} ({settings.MAIL_TIMEZONE})"


def _calendar_links(event):
    start, end = aware(event.starts_at), aware(event.ends_at)
    text, details, place = quote(event.title, safe=""), quote(event.description or "", safe=""), quote(event.location or "", safe="")
    if event.all_day:
        first, last = _local(start).date(), _local(end).date() + timedelta(days=1)
        google_dates = f"{first:%Y%m%d}/{last:%Y%m%d}"
        begin, finish, all_day = f"{first:%Y-%m-%d}", f"{last:%Y-%m-%d}", "true"
    else:
        google_dates = f"{start:%Y%m%dT%H%M%SZ}/{end:%Y%m%dT%H%M%SZ}"
        begin, finish, all_day = quote(start.isoformat(), safe=""), quote(end.isoformat(), safe=""), "false"
    outlook = (f"/calendar/0/deeplink/compose?path=%2Fcalendar%2Faction%2Fcompose&rru=addevent&subject={text}"
               f"&startdt={begin}&enddt={finish}&allday={all_day}&body={details}&location={place}")
    return [
        ("Google Calendar", f"https://calendar.google.com/calendar/render?action=TEMPLATE&text={text}&dates={google_dates}&details={details}&location={place}"),
        ("Outlook.com", "https://outlook.live.com" + outlook),
        ("Microsoft 365", "https://outlook.office.com" + outlook),
    ]


def _invite_html(event, guest, guests, organizer, updated) -> str:
    api = settings.PUBLIC_API_URL.rstrip("/")

    def button(label, answer, color):
        url = f"{api}/calendar-events/rsvp/{guest.id}?response={answer}&token={rsvp_token(guest.id)}"
        return (f'<a href="{url}" style="display:inline-block;margin:0 8px 8px 0;padding:10px 22px;border-radius:6px;'
                f'background:{color};color:#fff;text-decoration:none;font-weight:600">{label}</a>')

    add = " &nbsp;|&nbsp; ".join(f'<a href="{url}">{label}</a>' for label, url in _calendar_links(event))
    people = "".join(
        f"<li>{escape(g.name or g.email)} &lt;{escape(g.email)}&gt;{' (organizer)' if g.is_organizer else ''}</li>" for g in guests
    )
    where = f"<p><b>Where:</b> {escape(event.location)}</p>" if event.location else ""
    description = escape(event.description or "").replace("\n", "<br>")
    about = f"<p>{description}</p>" if description else ""
    note = '<p style="color:#b45309"><b>This event was updated.</b></p>' if updated else ""
    return f"""
<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1f2937">
  {note}
  <h2 style="margin:0 0 4px">{escape(event.title)}</h2>
  <p style="margin:0 0 16px;color:#6b7280">{escape(organizer)} invited you</p>
  <p><b>When:</b> {escape(when_text(event))}</p>
  {where}{about}
  <p><b>Guests</b></p><ul>{people}</ul>
  <p><b>Going?</b></p>
  <div>{button('Yes', 'yes', '#16a34a')}{button('No', 'no', '#dc2626')}{button('Maybe', 'maybe', '#6b7280')}</div>
  <p><b>Add to calendar:</b> {add}</p>
  <p><a href="{settings.FRONTEND_URL.rstrip('/')}/calendar">Open in Yatzar Operations</a></p>
  <p style="font-size:12px;color:#6b7280">An <b>invite.ics</b> file is attached. Open it to add this event to Outlook,
  Apple Calendar or any calendar app. Yatzar users also see it automatically in their Yatzar calendar.</p>
</div>"""


def _cancel_html(event, organizer) -> str:
    return (f'<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">'
            f'<h2 style="color:#dc2626">Cancelled: {escape(event.title)}</h2>'
            f"<p>{escape(organizer)} cancelled this event.</p>"
            f"<p><b>Was scheduled:</b> {escape(when_text(event))}</p></div>")


async def send_calendar_mail(event_id) -> None:
    if not smtp_configured():
        return
    async with AsyncSessionLocal() as session, session.begin():
        event = await session.scalar(select(CalendarEvent).where(
            CalendarEvent.id == event_id).with_for_update(skip_locked=True))
        if event is None:
            return
        organizer = await session.get(User, event.created_by) if event.created_by else None
        organizer_name = organizer.username if organizer else settings.MAIL_FROM_NAME
        reply_to = organizer.email if organizer else None
        live = [g for g in event.guests if not g.is_removed]
        version = aware(event.updated_at)
        for guest in event.guests:
            if guest.is_organizer:
                continue
            if event.deleted_at is not None or guest.is_removed:
                if guest.notified_sequence < 0 or guest.cancel_sent:
                    continue
                ics = build_ics(event, "CANCEL", settings.MAIL_FROM_ADDRESS, organizer_name, live)
                status = await deliver(session, event, "cal_cancel", version, guest.email,
                                       f"Cancelled: {event.title}", _cancel_html(event, organizer_name),
                                       reply_to=reply_to, calendar=("CANCEL", ics))
                if status == "Sent":
                    guest.cancel_sent = True
            elif guest.notified_sequence < event.sequence:
                updated = guest.notified_sequence >= 0
                ics = build_ics(event, "REQUEST", settings.MAIL_FROM_ADDRESS, organizer_name, live,
                                alarm=reminder_offset(event.guests_reminder))
                subject = f"{'Updated invitation' if updated else 'Invitation'}: {event.title} @ {_local(event.starts_at):%a %d %b %Y}"
                status = await deliver(session, event, "cal_invite", version, guest.email, subject,
                                       _invite_html(event, guest, live, organizer_name, updated),
                                       reply_to=reply_to, calendar=("REQUEST", ics))
                if status == "Sent":
                    guest.notified_sequence = event.sequence


async def send_rsvp_notice(guest_id) -> None:
    if not smtp_configured():
        return
    async with AsyncSessionLocal() as session, session.begin():
        guest = await session.get(CalendarEventGuest, guest_id)
        event = await session.get(CalendarEvent, guest.event_id) if guest else None
        organizer = await session.get(User, event.created_by) if event and event.created_by else None
        label = {"accepted": "accepted", "declined": "declined", "maybe": "responded maybe to"}.get(guest.response if guest else "")
        if not (organizer and label) or guest.is_organizer:
            return
        who = guest.name or guest.email
        body = (f"<p><b>{escape(who)}</b> {label} <b>{escape(event.title)}</b>.</p>"
                f"<p>{escape(when_text(event))}</p>")
        await deliver(session, event, "cal_rsvp", aware(guest.responded_at), organizer.email,
                      f"{who} {label}: {event.title}", body)


async def sweep_calendar_mail() -> None:
    pending_new = and_(CalendarEvent.deleted_at.is_(None), CalendarEventGuest.is_removed.is_(False),
                       CalendarEventGuest.notified_sequence < CalendarEvent.sequence)
    pending_cancel = and_(or_(CalendarEvent.deleted_at.is_not(None), CalendarEventGuest.is_removed.is_(True)),
                          CalendarEventGuest.notified_sequence >= 0, CalendarEventGuest.cancel_sent.is_(False))
    async with AsyncSessionLocal() as session:
        ids = list(await session.scalars(
            select(CalendarEvent.id).join(CalendarEventGuest, CalendarEventGuest.event_id == CalendarEvent.id)
            .where(CalendarEventGuest.is_organizer.is_(False), or_(pending_new, pending_cancel)).distinct()
        ))
    for event_id in ids:
        try:
            await send_calendar_mail(event_id)
        except Exception:
            logger.exception("Calendar mail failed for event %s", event_id)