from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from yo.core.database import DatabaseSession
from yo.core.auth.dependencies import CurrentUser
from yo.core.schemas.responses import SuccessResponse
from yo.models.control_panel import EmailNotificationSettings
from yo.schemas.requests.control_panel import EmailNotificationSettingsRequest

router = APIRouter(prefix="/control-panel", tags=["Control Panel"])


def require_super_admin(current_user: CurrentUser):
    if not current_user.role or current_user.role.name != "Super Admin":
        raise HTTPException(status_code=403, detail="Super Admin role required")


@router.get("/email-notifications", response_model=SuccessResponse[EmailNotificationSettingsRequest])
async def get_email_notification_settings(session: DatabaseSession, current_user: CurrentUser):
    require_super_admin(current_user)
    row = await session.get(EmailNotificationSettings, True)
    return SuccessResponse(data={"to_emails": row.to_emails if row else [], "cc_emails": row.cc_emails if row else []})


@router.put("/email-notifications", response_model=SuccessResponse[EmailNotificationSettingsRequest])
async def save_email_notification_settings(
    payload: EmailNotificationSettingsRequest,
    session: DatabaseSession,
    current_user: CurrentUser,
):
    require_super_admin(current_user)
    row = await session.scalar(select(EmailNotificationSettings).where(
        EmailNotificationSettings.singleton.is_(True),
    ).with_for_update())
    if row is None:
        row = EmailNotificationSettings(singleton=True)
        session.add(row)
    row.to_emails = payload.to_emails
    row.cc_emails = payload.cc_emails
    await session.flush()
    return SuccessResponse(message="Email notification settings saved", data=payload)
