import hashlib
import hmac
import logging
from datetime import datetime, timezone

from urllib.parse import quote
from uuid import UUID

from bs4 import BeautifulSoup
from sqlalchemy import delete, or_, select

from yo.services.workspace import WorkspaceService
from yo.core.config import settings
from yo.core.email import send_email
from yo.core.exceptions import AppException, NotFoundException
from yo.repositories.email_marketing import EmailMarketingRepository
from yo.schemas.requests.email_marketing import EmailMarketingCreateRequest
from yo.models.email_marketing import EmailMarketingRecipient
from yo.models.mail_delivery import MailDelivery


logger = logging.getLogger(__name__)


class EmailMarketingService:

    def __init__(self, repository: EmailMarketingRepository, user_id: UUID | None = None):
        self.repository = repository
        self.user_id = user_id
        self.tracking_base_url = settings.EMAIL_TRACKING_BASE_URL.rstrip("/")
        self.tracking_secret = settings.EMAIL_TRACKING_SECRET or settings.SESSION_SECRET

    async def get_campaign(self, campaign_id: UUID):
        await WorkspaceService(self.repository.session).ensure_access(
            self.user_id, self.repository.workspace_id,
        )
        campaign = await self.repository.get_campaign(campaign_id)

        if not campaign:
            raise NotFoundException("Email marketing campaign", str(campaign_id))

        return campaign

    async def list_campaigns(self, search: str | None = None, page: int = 1, per_page: int = 10):
        if self.repository.workspace_id is not None:
            await WorkspaceService(self.repository.session).ensure_access(
                self.user_id, self.repository.workspace_id,
            )
        return await self.repository.list_campaigns(
            user_id=self.user_id,
            search=search,
            page=page,
            per_page=per_page,
        )

    async def list_recipients(self, campaign_id: UUID, page: int, per_page: int):
        await WorkspaceService(self.repository.session).ensure_access(
            self.user_id, self.repository.workspace_id,
        )
        await self.get_campaign(campaign_id)

        return await self.repository.list_recipients(
            campaign_id,
            page,
            per_page,
        )

    def generate_signature(self, campaign_id: UUID, user_id: UUID, original_url: str | None = None) -> str:
        if not self.tracking_secret:
            raise RuntimeError("EMAIL_TRACKING_SECRET is not configured")

        if original_url is None:
            message = f"open:{campaign_id}:{user_id}".encode()
        else:
            message = f"click:{campaign_id}:{user_id}:{original_url}".encode()

        return hmac.new(
            self.tracking_secret.encode(),
            message,
            hashlib.sha256,
        ).hexdigest()

    def verify_signature(self, campaign_id: UUID, user_id: UUID, signature: str, original_url: str | None = None) -> bool:
        expected = self.generate_signature(campaign_id, user_id, original_url)
        return hmac.compare_digest(expected, signature)

    def create_open_tracking_url(self, campaign_id: UUID, user_id: UUID) -> str:
        signature = self.generate_signature(campaign_id, user_id)

        return (
            f"{self.tracking_base_url}/track/open"
            f"?campaign_id={campaign_id}"
            f"&user_id={user_id}"
            f"&signature={signature}"
        )

    def create_click_tracking_url(self, campaign_id: UUID, user_id: UUID, original_url: str) -> str:
        signature = self.generate_signature(campaign_id, user_id, original_url)
        encoded_url = quote(original_url, safe="")

        return (
            f"{self.tracking_base_url}/track/click"
            f"?campaign_id={campaign_id}"
            f"&user_id={user_id}"
            f"&url={encoded_url}"
            f"&signature={signature}"
        )

    def prepare_email_content(self, html_content: str, campaign_id: UUID, user_id: UUID) -> str:
        soup = BeautifulSoup(html_content, "html.parser")

        for anchor in soup.find_all("a", href=True):
            original_url = anchor.get("href")

            if not original_url:
                continue

            if not original_url.startswith(("http://", "https://")):
                continue

            anchor["href"] = self.create_click_tracking_url(
                campaign_id=campaign_id,
                user_id=user_id,
                original_url=original_url,
            )

        open_url = self.create_open_tracking_url(campaign_id, user_id)

        pixel = soup.new_tag("img")
        pixel["src"] = open_url
        pixel["width"] = "1"
        pixel["height"] = "1"
        pixel["style"] = "width:1px;height:1px;border:0;"
        pixel["alt"] = ""

        if soup.body:
            soup.body.append(pixel)
        else:
            soup.append(pixel)

        return str(soup)

    async def _prepare_campaign(self, payload: EmailMarketingCreateRequest, logged_user_id: UUID):
        await WorkspaceService(self.repository.session).ensure_access(
            self.user_id, self.repository.workspace_id,
        )
        values = payload.model_dump(exclude={"selection_mode", "selected_user_ids"})
        values["from_email"] = str(payload.from_email)
        values["to_email"] = str(payload.to_email) if payload.to_email else None
        values.update(created_by=logged_user_id, updated_by=logged_user_id,
                      status="Scheduled" if payload.scheduled_at else "Queued")
        if payload.mail_type == "Test Email":
            recipients_data = [{"user_id": logged_user_id, "email": str(payload.to_email)}]
        else:
            if await self.repository.get_active_tag_ids(payload.tag_ids) != set(payload.tag_ids):
                raise AppException("Some selected tags do not exist or are inactive.", 400)
            recipients_data = await self.repository.get_recipients_by_tags(
                tag_ids=payload.tag_ids, selection_mode=payload.selection_mode,
                selected_contact_ids=payload.selected_user_ids, user_id=logged_user_id,
            )
            if not recipients_data:
                raise AppException("No eligible recipients found for selected tags", 400)
            if payload.selection_mode == "selected" and (
                not set(payload.selected_user_ids).issubset({item["user_id"] for item in recipients_data})
            ):
                raise AppException("Some selected contacts are not eligible for these tags", 400)
        return values, recipients_data

    async def create_and_send(self, payload: EmailMarketingCreateRequest, logged_user_id: UUID):
        """Persist recipients before the worker performs any external delivery."""
        values, recipients_data = await self._prepare_campaign(payload, logged_user_id)
        campaign = await self.repository.create_campaign(values)
        await self.repository.create_recipients(campaign.id, recipients_data)
        return campaign

    async def edit_campaign(self, campaign_id: UUID, payload: EmailMarketingCreateRequest):
        await WorkspaceService(self.repository.session).ensure_access(
            self.user_id, self.repository.workspace_id,
        )
        campaign = await self.repository.get_campaign(campaign_id, for_update=True)
        if not campaign:
            raise NotFoundException("Email marketing campaign", str(campaign_id))
        is_test = campaign.mail_type == "Test Email" and campaign.status in {"Test", "Failed", "Queued", "Draft"}
        if not is_test:
            attempted = await self.repository.session.scalar(select(or_(
                select(MailDelivery.id).where(
                    MailDelivery.source_type == "marketing", MailDelivery.source_id == campaign.id,
                    MailDelivery.attempts > 0,
                ).exists(),
                select(EmailMarketingRecipient.id).where(
                    EmailMarketingRecipient.email_marketing_id == campaign.id,
                    EmailMarketingRecipient.sent.is_(True),
                ).exists(),
            )))
            if campaign.status not in {"Draft", "Queued", "Scheduled"} or campaign.sent_count or attempted:
                raise AppException("Campaigns can only be edited before sending starts. Replicate a sent campaign instead.", 409)
        else:
            # Allow a test campaign to be sent again after editing.
            await self.repository.session.execute(delete(MailDelivery).where(
                MailDelivery.source_type == "marketing", MailDelivery.source_id == campaign.id,
            ))
        values, recipients_data = await self._prepare_campaign(payload, self.user_id)
        values.pop("created_by", None)
        for field, value in values.items():
            setattr(campaign, field, value)
        await self.repository.session.execute(delete(EmailMarketingRecipient).where(
            EmailMarketingRecipient.email_marketing_id == campaign.id,
        ))
        await self.repository.create_recipients(campaign.id, recipients_data)
        await self.repository.session.flush()
        return campaign

    async def send_email(self, from_email: str, to_email: str, subject: str, html_content: str):
        await send_email(to_email, subject, html_content, reply_to=from_email)

    async def schedule_campaign(self, campaign_id: UUID, scheduled_at: datetime):
        await WorkspaceService(self.repository.session).ensure_access(
            self.user_id, self.repository.workspace_id,
        )
        # The sender takes the same row lock before SMTP delivery, so changing
        # the time cannot race with a worker that has already begun sending.
        campaign = await self.repository.get_campaign(campaign_id, for_update=True)
        if not campaign:
            raise NotFoundException("Email marketing campaign", str(campaign_id))
        if campaign.status not in {"Queued", "Scheduled"} or campaign.sent_count:
            raise AppException("Only queued or scheduled campaigns can be rescheduled before sending starts.", 409)
        if scheduled_at <= datetime.now(timezone.utc):
            raise AppException("scheduled_at must be a future date and time.", 400)
        has_recipients = await self.repository.session.scalar(select(
            select(EmailMarketingRecipient.id).where(
                EmailMarketingRecipient.email_marketing_id == campaign.id,
                EmailMarketingRecipient.is_enabled.is_(True),
                EmailMarketingRecipient.sent.is_(False),
            ).exists()
        ))
        if not has_recipients:
            raise AppException("The campaign has no enabled recipients to send to.", 400)
        campaign.scheduled_at = scheduled_at
        campaign.status = "Scheduled"
        campaign.updated_by = self.user_id
        await self.repository.session.flush()
        return campaign

    async def track_open(self, campaign_id: UUID, user_id: UUID, signature: str) -> bool:
        if not self.verify_signature(campaign_id, user_id, signature):
            raise AppException("Invalid tracking signature", 403)

        return await self.repository.register_open(
            campaign_id,
            user_id,
        )

    async def track_click(self, campaign_id: UUID, user_id: UUID, signature: str, url: str) -> bool:
        if not self.verify_signature(campaign_id, user_id, signature, url):
            raise AppException("Invalid tracking signature", 403)

        return await self.repository.register_click(
            campaign_id,
            user_id,
        )

    async def update_recipient_status(self, recipient_id: UUID, is_enabled: bool):
        await WorkspaceService(self.repository.session).ensure_access(
            self.user_id, self.repository.workspace_id,
        )
        recipient = await self.repository.get_recipient_by_id(recipient_id)

        if not recipient:
            raise NotFoundException("Recipient", str(recipient_id))

        # Use the same campaign lock as the worker: a completed status change
        # must be visible before a subsequent delivery starts.
        campaign = await self.repository.get_campaign(recipient.email_marketing_id, for_update=True)
        if not campaign:
            raise NotFoundException("Email marketing campaign", str(recipient.email_marketing_id))
        await self.repository.session.refresh(recipient)
        if recipient.sent:
            raise AppException("Recipient status cannot be changed after delivery.", 409)
        if campaign.status not in {"Draft", "Queued", "Scheduled", "Sending"}:
            raise AppException("Recipient status can only be changed before campaign delivery finishes.", 409)

        return await self.repository.update_recipient_status(
            recipient,
            is_enabled,
        )

    async def get_report(self, campaign_id: UUID):
        await WorkspaceService(self.repository.session).ensure_access(
            self.user_id, self.repository.workspace_id,
        )
        campaign = await self.get_campaign(campaign_id)

        return {
            "campaign_id": campaign.id,
            "campaign_name": campaign.campaign_name,
            "sent": campaign.sent_count,
            "opens": campaign.open_count,
            "clicks": campaign.click_count,
            "last_edited": campaign.updated_at,
        }

    async def delete_campaign(self, campaign_id: UUID, user_id: UUID):
        await WorkspaceService(self.repository.session).ensure_access(
            self.user_id, self.repository.workspace_id,
        )
        campaign = await self.get_campaign(campaign_id)
        await self.repository.delete_campaign(campaign, user_id)

    async def replicate_campaign(self, campaign_id: UUID, user_id: UUID):
        await WorkspaceService(self.repository.session).ensure_access(
            self.user_id, self.repository.workspace_id,
        )
        old_campaign = await self.get_campaign(campaign_id)

        values = {
            "workspace_id": old_campaign.workspace_id,
            "campaign_name": f"{old_campaign.campaign_name} - Copy",
            "platform": old_campaign.platform,
            "from_email": old_campaign.from_email,
            "mail_type": old_campaign.mail_type,
            "to_email": old_campaign.to_email,
            "tag_id": old_campaign.tag_id,
            "tag_ids": list(old_campaign.tag_ids),
            "subject": old_campaign.subject,
            "content": old_campaign.content,
            "status": "Draft",
            "sent_count": 0,
            "open_count": 0,
            "click_count": 0,
            "created_by": user_id,
            "updated_by": user_id,
        }

        return await self.repository.create_campaign(values)
