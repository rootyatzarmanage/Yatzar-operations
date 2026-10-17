from html import escape
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select

from yo.core.auth.permissions import require_workspace_admin
from yo.core.auth.dependencies import CurrentUser
from yo.core.config import settings
from yo.core.database import DatabaseSession
from yo.core.email import send_email, smtp_configured
from yo.core.schemas.responses import SuccessResponse
from yo.models.mail_delivery import MailDelivery
from yo.repositories.workspace import WorkspaceRepository

router = APIRouter(prefix="/mail", tags=["Mail"], dependencies=[Depends(require_workspace_admin)])


class MailTestRequest(BaseModel):
    to_email: EmailStr
    subject: str = Field(default="Yatzar Operations SMTP test", min_length=1, max_length=500)


@router.get("/status", summary="Check SMTP configuration without exposing credentials")
async def mail_status():
    return SuccessResponse(data={
        "configured": smtp_configured(), "worker_enabled": settings.MAIL_WORKER_ENABLED,
        "poll_seconds": settings.MAIL_POLL_SECONDS, "timezone": settings.MAIL_TIMEZONE,
        "from_address": settings.MAIL_FROM_ADDRESS, "encryption": settings.MAIL_ENCRYPTION,
        "max_attempts": settings.MAIL_MAX_ATTEMPTS,
    })


@router.post("/test", summary="Send an SMTP test email immediately")
async def test_mail(payload: MailTestRequest):
    await send_email(str(payload.to_email), payload.subject,
                     f"<h2>{escape(payload.subject)}</h2><p>SMTP delivery from Yatzar Operations is working.</p>")
    return SuccessResponse(message="SMTP server accepted the test email", data={"to_email": payload.to_email})


@router.get("/deliveries", summary="View reminder and marketing delivery attempts")
async def mail_deliveries(session: DatabaseSession, current_user: CurrentUser, workspace_id: UUID | None = None,
                          source_id: UUID | None = None,
                          skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100)):
    query = select(MailDelivery).where(MailDelivery.workspace_id.in_(
        WorkspaceRepository.accessible_ids(current_user.id, include_disabled=True),
    ))
    if workspace_id:
        query = query.where(MailDelivery.workspace_id == workspace_id)
    if source_id:
        query = query.where(MailDelivery.source_id == source_id)
    rows = await session.scalars(query.order_by(MailDelivery.created_at.desc()).offset(skip).limit(limit))
    return SuccessResponse(data=[{
        "id": row.id, "workspace_id": row.workspace_id, "source_type": row.source_type,
        "source_id": row.source_id, "recipient": row.recipient, "subject": row.subject,
        "status": row.status, "attempts": row.attempts, "last_error": row.last_error,
        "next_attempt_at": row.next_attempt_at, "sent_at": row.sent_at,
    } for row in rows])
