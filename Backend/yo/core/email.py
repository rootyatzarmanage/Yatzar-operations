"""SMTP transport adapted from Internship-Backend/base/ycpa/core/email.py.

Use the standard-library SMTP client in a thread so no additional package is
required and blocking network I/O never runs on FastAPI's event loop.
"""
import logging
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr, make_msgid

from starlette.concurrency import run_in_threadpool

from yo.core.config import settings
from yo.core.exceptions import AppException

logger = logging.getLogger(__name__)


def smtp_configured() -> bool:
    return bool(settings.MAIL_HOST and settings.MAIL_FROM_ADDRESS)


def _env_config() -> dict:
    return {
        "mailer": settings.MAIL_MAILER, "host": settings.MAIL_HOST, "port": settings.MAIL_PORT,
        "username": settings.MAIL_USERNAME, "password": settings.MAIL_PASSWORD,
        "encryption": settings.MAIL_ENCRYPTION, "from_address": settings.MAIL_FROM_ADDRESS,
        "from_name": settings.MAIL_FROM_NAME,
    }


def _send(to: str, subject: str, html_body: str, reply_to: str | None, message_id: str | None,
          calendar=None, smtp_config: dict | None = None):
    cfg = smtp_config or _env_config()
    if (cfg["mailer"] or "").lower() != "smtp" or not (cfg["host"] and cfg["from_address"]):
        raise RuntimeError("Configure mailer=smtp, host and from address.")
    encryption = (cfg["encryption"] or "").lower()
    if encryption not in {"tls", "starttls", "ssl", "smtps", "none", ""}:
        raise RuntimeError("MAIL_ENCRYPTION must be TLS, SSL or none.")
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = formataddr((cfg["from_name"], cfg["from_address"]))
    message["To"] = to
    message["Message-ID"] = message_id or make_msgid()
    if reply_to:
        message["Reply-To"] = reply_to
    message.set_content("This message contains an HTML version. Please use an HTML-capable email client.")
    message.add_alternative(html_body, subtype="html")
    if calendar:
        method, ics = calendar
        message.add_alternative(ics, subtype="calendar", params={"method": method})
        message.add_attachment(ics.encode(), maintype="application", subtype="ics", filename="invite.ics")
    context = ssl.create_default_context()
    implicit_tls = encryption in {"ssl", "smtps"}
    smtp_class = smtplib.SMTP_SSL if implicit_tls else smtplib.SMTP
    options = {"timeout": settings.MAIL_TIMEOUT}
    if implicit_tls:
        options["context"] = context
    with smtp_class(cfg["host"], cfg["port"], **options) as smtp:
        if encryption in {"tls", "starttls"}:
            smtp.starttls(context=context)
        if cfg["username"]:
            smtp.login(cfg["username"], cfg["password"])
        smtp.send_message(message, from_addr=cfg["from_address"], to_addrs=[to])


async def send_email(to: str, subject: str, html_body: str, *, reply_to: str | None = None,
                     message_id: str | None = None, calendar=None,
                     smtp_config: dict | None = None) -> None:
    try:
        await run_in_threadpool(_send, to, subject, html_body, reply_to, message_id, calendar, smtp_config)
    except Exception:
        logger.exception("SMTP delivery failed")
        raise AppException("SMTP delivery failed. Check mail configuration and backend logs.", 502) from None
