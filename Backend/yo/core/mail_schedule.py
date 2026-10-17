import re
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from yo.core.config import settings


def aware(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=ZoneInfo(settings.MAIL_TIMEZONE))
    return value.astimezone(timezone.utc)


def reminder_offset(value: str | None) -> timedelta | None:
    value = (value or "").strip().lower()
    if value in {"at time of call", "at time of meeting", "at start time"}:
        return timedelta()
    match = re.fullmatch(r"(\d+) (minute|hour|day)s? before", value)
    if not match:
        return None
    return timedelta(**{match[2] + "s": int(match[1])})


def validate_reminder(value: str | None) -> str | None:
    if value and value.strip().lower() != "none" and reminder_offset(value) is None:
        raise ValueError("Use None, At time of meeting/call, or a lead time such as 5 minutes before.")
    return value
