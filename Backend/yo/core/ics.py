from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from yo.core.config import settings
from yo.core.mail_schedule import aware

FREQ = {"daily": "DAILY", "weekly": "WEEKLY", "monthly": "MONTHLY", "yearly": "YEARLY"}
PARTSTAT = {"accepted": "ACCEPTED", "declined": "DECLINED", "maybe": "TENTATIVE"}


def _esc(value: str | None) -> str:
    return (value or "").replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\r\n", "\n").replace("\n", "\\n")


def _fold(line: str) -> str:
    raw, parts = line.encode(), []
    while len(raw) > 75:
        cut = 75
        while (raw[cut] & 0xC0) == 0x80:  
            cut -= 1
        parts.append(raw[:cut].decode())
        raw = b" " + raw[cut:]
    parts.append(raw.decode())
    return "\r\n".join(parts)


def _utc(value) -> str:
    return aware(value).strftime("%Y%m%dT%H%M%SZ")


def build_ics(event, method, organizer_email, organizer_name, guests, alarm: timedelta | None = None) -> str:
    """method: REQUEST (invite/update), CANCEL, or PUBLISH (plain download)."""
    tz = ZoneInfo(settings.MAIL_TIMEZONE)
    start, end = aware(event.starts_at), aware(event.ends_at)
    if event.all_day:
        first = start.astimezone(tz).date()
        last = end.astimezone(tz).date() + timedelta(days=1)
        when = [f"DTSTART;VALUE=DATE:{first:%Y%m%d}", f"DTEND;VALUE=DATE:{last:%Y%m%d}"]
    else:
        when = [f"DTSTART:{_utc(start)}", f"DTEND:{_utc(end)}"]
    cancelled = method == "CANCEL"
    lines = [
        "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Yatzar Operations//Calendar//EN",
        "CALSCALE:GREGORIAN", f"METHOD:{method}", "BEGIN:VEVENT",
        f"UID:{event.id}@yatzar.operations", f"SEQUENCE:{event.sequence}",
        f"DTSTAMP:{_utc(datetime.now(timezone.utc))}", *when,
        f"SUMMARY:{_esc(event.title)}",
        f"STATUS:{'CANCELLED' if cancelled else 'CONFIRMED'}", "TRANSP:OPAQUE",
    ]
    if event.location:
        lines.append(f"LOCATION:{_esc(event.location)}")
    if event.description:
        lines.append(f"DESCRIPTION:{_esc(event.description)}")
    if FREQ.get((event.repeat_frequency or "").lower()):
        lines.append(f"RRULE:FREQ={FREQ[event.repeat_frequency.lower()]}")
    name = (organizer_name or "Organizer").replace('"', "")
    lines.append(f'ORGANIZER;CN="{name}":mailto:{organizer_email}')
    for guest in guests:
        cn = (guest.name or guest.email).replace('"', "")
        lines.append(
            f'ATTENDEE;CN="{cn}";ROLE=REQ-PARTICIPANT;'
            f'PARTSTAT={PARTSTAT.get(guest.response, "NEEDS-ACTION")};RSVP=TRUE:mailto:{guest.email}'
        )
    if alarm is not None and not cancelled:
        minutes = int(alarm.total_seconds() // 60)
        lines += ["BEGIN:VALARM", f"TRIGGER:{'-PT%dM' % minutes if minutes else 'PT0S'}",
                  "ACTION:DISPLAY", "DESCRIPTION:Reminder", "END:VALARM"]
    lines += ["END:VEVENT", "END:VCALENDAR"]
    return "\r\n".join(_fold(line) for line in lines) + "\r\n"