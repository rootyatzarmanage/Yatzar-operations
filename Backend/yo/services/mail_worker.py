import asyncio
import calendar
import hashlib
import logging
from datetime import datetime, timedelta, timezone
from html import escape
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import select, or_

from yo.core.config import settings
from yo.core.database import AsyncSessionLocal
from yo.core.email import send_email, smtp_configured
from yo.core.mail_schedule import aware, reminder_offset
from yo.models.calendar_event import CalendarEvent
from yo.models.call import Call
from yo.models.contact import Contact
from yo.models.email_marketing import EmailMarketing, EmailMarketingRecipient
from yo.models.mail_delivery import MailDelivery
from yo.models.meeting import Meeting
from yo.models.task import Task
from yo.models.user import User
from yo.models.workspace import Workspace
from yo.repositories.email_marketing import EmailMarketingRepository
from yo.repositories.workspace import WorkspaceRepository
from yo.services.email_marketing import EmailMarketingService
from yo.core.secret_box import decrypt_secret

logger = logging.getLogger(__name__)
CAMPAIGN_STATES = ("Queued", "Scheduled", "Sending")


def occurrence(start, frequency, now, lead=timedelta()):
    """Latest occurrence whose reminder could be due (no historical replay)."""
    start = aware(start).astimezone(ZoneInfo(settings.MAIL_TIMEZONE))
    horizon = (now + lead).astimezone(start.tzinfo)
    frequency = (frequency or "none").lower()
    if start > horizon or frequency == "none":
        return start.astimezone(timezone.utc)
    if frequency in {"daily", "weekly"}:
        days = 1 if frequency == "daily" else 7
        count = max(0, (horizon.date() - start.date()).days // days)
        result = start + timedelta(days=count * days)
        if result > horizon:
            result -= timedelta(days=days)
    elif frequency in {"monthly", "yearly"}:
        step = 1 if frequency == "monthly" else 12
        months = (horizon.year - start.year) * 12 + horizon.month - start.month
        count = max(0, months // step)
        def at(index):
            year, month = divmod(start.year * 12 + start.month - 1 + index * step, 12)
            return start.replace(year=year, month=month + 1,
                                 day=min(start.day, calendar.monthrange(year, month + 1)[1]))
        result = at(count)
        if result > horizon and count:
            result = at(count - 1)
    else:
        return start.astimezone(timezone.utc)
    return result.astimezone(timezone.utc)


async def workspace_smtp(session, workspace_id):
    """Workspace SMTP settings; None means fall back to the .env settings."""
    ws = await session.get(Workspace, workspace_id) if workspace_id else None
    if not ws or ws.mail_status != "Enabled" or not (ws.mail_host and ws.mail_from_address):
        return None
    return {
        "mailer": ws.mail_mailer or "smtp", "host": ws.mail_host, "port": ws.mail_port or 587,
        "username": ws.mail_username or "", "password": decrypt_secret(ws.mail_password),
        "encryption": ws.mail_encryption or "TLS", "from_address": ws.mail_from_address,
        "from_name": ws.mail_from_name or ws.name,
    }


async def deliver(session, source, kind, when, recipient, subject, body, reply_to=None, calendar=None):
    recipient = recipient.strip().lower()
    key = hashlib.sha256(f"{kind}:{source.id}:{when.isoformat()}:{recipient}".encode()).hexdigest()
    delivery = await session.scalar(select(MailDelivery).where(MailDelivery.delivery_key == key))
    now = datetime.now(timezone.utc)
    if delivery is None:
        delivery = MailDelivery(delivery_key=key, workspace_id=source.workspace_id,
                                source_type=kind, source_id=source.id,
                                recipient=recipient, subject=subject[:500], attempts=0)
        session.add(delivery)
    elif delivery.status == "Sent":
        return "Sent"
    elif delivery.attempts >= settings.MAIL_MAX_ATTEMPTS:
        return "Failed"
    elif delivery.next_attempt_at and aware(delivery.next_attempt_at) > now:
        return "Pending"
    delivery.attempts += 1
    try:
        await send_email(recipient, subject[:500], body, reply_to=reply_to,
                         message_id=f"<{key}@yatzar.operations>", calendar=calendar,
                         smtp_config=await workspace_smtp(session, source.workspace_id))
    except Exception:
        delivery.status = "Failed" if delivery.attempts >= settings.MAIL_MAX_ATTEMPTS else "Pending"
        delivery.last_error = "SMTP delivery failed; see backend logs."
        delivery.next_attempt_at = now + timedelta(seconds=min(3600, 60 * 2 ** (delivery.attempts - 1)))
    else:
        delivery.status = "Sent"
        delivery.sent_at = now
        delivery.last_error = None
        delivery.next_attempt_at = None
    await session.flush()
    return delivery.status


async def user_email(session, user_id, workspace_id):
    if user_id is None:
        return None
    user = await session.scalar(select(User).where(
        User.id == user_id, User.is_active.is_(True), User.deleted_at.is_(None),
    ))
    if user and await WorkspaceRepository(session).user_has_workspace(user.id, workspace_id):
        return user.email
    return None


def reminder_body(title, when, description=None):
    local = when.astimezone(ZoneInfo(settings.MAIL_TIMEZONE))
    return (f"<h2>{escape(title)}</h2><p>Scheduled for {escape(local.isoformat())}</p>"
            f"<p>{escape(description or '')}</p><p>Yatzar Operations</p>")


async def process_reminder(model, source_id):
    async with AsyncSessionLocal() as session, session.begin():
        source = await session.scalar(select(model).where(
            model.id == source_id, model.deleted_at.is_(None),
        ).with_for_update(skip_locked=True))
        if source is None:
            return
        workspace = await session.get(Workspace, source.workspace_id) if source.workspace_id else None
        if not workspace or workspace.deleted_at is not None or workspace.status != "Enabled":
            return
        now = datetime.now(timezone.utc)
        recipients = []
        if model is Task:
            if not source.reminder_enabled or not source.reminder_at or "email" not in (source.reminder_type or "").lower():
                return
            if source.status.lower() in {"completed", "cancelled", "canceled"}:
                return
            when = occurrence(source.reminder_at, "Daily" if source.repeat_enabled else "None", now)
            if when <= now:
                email = await user_email(session, source.task_owner_id, source.workspace_id)
                if email:
                    recipients.append((email, when, "task", when))
            title = source.subject
            event_time = when
        elif model is Call:
            offset = reminder_offset(source.reminder)
            if source.call_status != "Scheduled" or offset is None:
                return
            event_time = aware(source.call_start_time)
            when = event_time - offset
            # Do not notify about a historical call after its scheduled start.
            if when <= now < event_time + timedelta(minutes=5):
                email = await user_email(session, source.created_by, source.workspace_id)
                if email:
                    recipients.append((email, when, "call", event_time))
            title = source.subject
        elif model is CalendarEvent:
            title = source.title
            for offset, audience in ((reminder_offset(source.reminder), "owner"),
                                     (reminder_offset(source.guests_reminder), "guests")):
                if offset is None:
                    continue
                event_time = occurrence(source.starts_at, source.repeat_frequency, now, offset)
                end = event_time + (aware(source.ends_at) - aware(source.starts_at))
                when = event_time - offset
                if not when <= now < end:
                    continue
                if audience == "owner":
                    email = await user_email(session, source.created_by, source.workspace_id)
                    if email:
                        recipients.append((email, when, "calendar", event_time))
                else:
                    for guest in source.guests:
                        if not guest.is_removed and not guest.is_organizer and guest.response != "declined":
                            recipients.append((guest.email, when, "calendar", event_time))
        else:
            title = source.title
            owner_offset = reminder_offset(source.reminder)
            participant_offset = reminder_offset(source.reminder_type)
            for offset, audience in ((owner_offset, "owner"), (participant_offset, "participants")):
                if offset is None:
                    continue
                event_time = occurrence(source.starts_at, source.repeat_frequency, now, offset)
                end = event_time + (aware(source.ends_at) - aware(source.starts_at))
                when = event_time - offset
                if not when <= now < end:
                    continue
                if audience == "owner":
                    email = await user_email(session, source.created_by, source.workspace_id)
                    if email:
                        recipients.append((email, when, "meeting", event_time))
                elif "email" in source.participants_reminder.lower():
                    ids = [UUID(p["id"]) for p in source.participants]
                    contacts = await session.scalars(select(Contact).where(
                        Contact.id.in_(ids), Contact.workspace_id == source.workspace_id,
                        Contact.deleted_at.is_(None), Contact.email_opt_out.is_(False),
                        Contact.email.is_not(None),
                    ))
                    for contact in contacts:
                        if contact.email.strip():
                            recipients.append((contact.email, when, "meeting", event_time))
        for email, when, kind, event_time in recipients:
            await deliver(session, source, kind, when, email, f"Reminder: {title}",
                          reminder_body(title, event_time, getattr(source, "description", None)))


async def process_campaign(campaign_id):
    # Commit after each recipient so a later failure never rolls back sent flags
    # for the whole campaign. Lock the campaign to serialize concurrent workers.
    while True:
        async with AsyncSessionLocal() as session, session.begin():
            campaign = await session.scalar(select(EmailMarketing).where(
                EmailMarketing.id == campaign_id, EmailMarketing.deleted_at.is_(None),
                EmailMarketing.status.in_(CAMPAIGN_STATES),
            ).with_for_update(skip_locked=True))
            if not campaign:
                return
            now = datetime.now(timezone.utc)
            if campaign.scheduled_at and aware(campaign.scheduled_at) > now:
                return
            workspace = await session.get(Workspace, campaign.workspace_id) if campaign.workspace_id else None
            if not workspace or workspace.deleted_at is not None or workspace.status != "Enabled":
                return
            if not await user_email(session, campaign.created_by, campaign.workspace_id):
                return
            recipients = list(await session.scalars(select(EmailMarketingRecipient).where(
                EmailMarketingRecipient.email_marketing_id == campaign.id,
            ).order_by(EmailMarketingRecipient.created_at, EmailMarketingRecipient.id)))
            sent = sum(r.sent for r in recipients)
            pending = False
            processed = False
            for recipient in recipients:
                if recipient.sent or not recipient.is_enabled:
                    continue
                if campaign.mail_type == "Bulk Email":
                    contact = await session.get(Contact, recipient.user_id) if recipient.user_id else None
                    if (not contact or contact.deleted_at or contact.email_opt_out
                            or contact.workspace_id != campaign.workspace_id
                            or (contact.email or "").strip().lower() != recipient.email.strip().lower()):
                        recipient.is_enabled = False
                        processed = True
                        break
                when = aware(campaign.scheduled_at or campaign.created_at)
                key = hashlib.sha256(f"marketing:{campaign.id}:{when.isoformat()}:{recipient.email.strip().lower()}".encode()).hexdigest()
                log = await session.scalar(select(MailDelivery).where(MailDelivery.delivery_key == key))
                if log and log.status != "Sent":
                    if log.attempts >= settings.MAIL_MAX_ATTEMPTS:
                        continue
                    if log.next_attempt_at and aware(log.next_attempt_at) > now:
                        pending = True
                        continue
                service = EmailMarketingService(EmailMarketingRepository(session, campaign.workspace_id))
                html = service.prepare_email_content(campaign.content, campaign.id, recipient.user_id or recipient.id)
                result = await deliver(session, campaign, "marketing", when, recipient.email,
                                       campaign.subject, html, reply_to=campaign.from_email)
                if result == "Sent":
                    recipient.sent = True
                    sent += 1
                # A subsequent iteration skips failed attempts until retry time.
                processed = True
                break
            campaign.sent_count = sent
            if processed:
                campaign.status = "Sending"
            elif pending:
                campaign.status = "Sending"
                return
            else:
                eligible = [r for r in recipients if r.is_enabled]
                if campaign.mail_type == "Test Email":
                    # Test mails are not counted as a send; the campaign stays editable.
                    campaign.status = "Test" if sent else "Failed"
                    campaign.sent_count = 0
                    campaign.sent_at = None
                else:
                    campaign.status = "Email Sent" if eligible and all(r.sent for r in eligible) else ("Partially Sent" if sent else "Failed")
                    campaign.sent_at = now if sent else None
                return


async def tick():
    if not smtp_configured():
        return
    now = datetime.now(timezone.utc)
    for model, filters in (
        (Task, [Task.reminder_enabled.is_(True), Task.reminder_at <= now]),
        (Meeting, []),
        (CalendarEvent, [or_(CalendarEvent.repeat_frequency != "None", CalendarEvent.ends_at >= now)]),
        (Call, [Call.call_status == "Scheduled", Call.call_start_time >= now - timedelta(minutes=5)]),
        (EmailMarketing, [EmailMarketing.status.in_(CAMPAIGN_STATES),
                          or_(EmailMarketing.scheduled_at.is_(None), EmailMarketing.scheduled_at <= now)]),
    ):
        async with AsyncSessionLocal() as session:
            ids = list(await session.scalars(select(model.id).where(model.deleted_at.is_(None), *filters)))
        for source_id in ids:
            try:
                if model is EmailMarketing:
                    await process_campaign(source_id)
                else:
                    await process_reminder(model, source_id)
            except Exception:
                logger.exception("Mail worker could not process %s %s", model.__tablename__, source_id)
    from yo.services.calendar_mail import sweep_calendar_mail  # local import avoids a circular import
    await sweep_calendar_mail()


async def run_mail_worker(stop: asyncio.Event):
    if not smtp_configured():
        logger.warning("Mail worker is enabled but MAIL_HOST or MAIL_FROM_ADDRESS is missing")
    while not stop.is_set():
        try:
            await tick()
        except Exception:
            logger.exception("Mail worker iteration failed")
        try:
            await asyncio.wait_for(stop.wait(), timeout=settings.MAIL_POLL_SECONDS)
        except asyncio.TimeoutError:
            pass
