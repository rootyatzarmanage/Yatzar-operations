import hashlib
import hmac
import logging
import os

from urllib.parse import quote
from uuid import UUID

from bs4 import BeautifulSoup

from yo.services.workspace import WorkspaceService
from yo.core.exceptions import AppException, NotFoundException
from yo.repositories.email_marketing import EmailMarketingRepository
from yo.schemas.requests.email_marketing import EmailMarketingCreateRequest


logger = logging.getLogger(__name__)


class EmailMarketingService:

    def __init__(self, repository: EmailMarketingRepository, user_id: UUID | None = None):
        self.repository = repository
        self.user_id = user_id
        self.tracking_base_url = os.environ.get(
            "EMAIL_TRACKING_BASE_URL",
            "http://localhost:8000/api/v1/email-marketing",
        ).rstrip("/")
        self.tracking_secret = os.environ.get("EMAIL_TRACKING_SECRET", "")

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

    async def create_and_send(self, payload: EmailMarketingCreateRequest, logged_user_id: UUID):
        await WorkspaceService(self.repository.session).ensure_access(
            self.user_id, self.repository.workspace_id,
        )
        mail_type = payload.mail_type.strip().lower()

        values = payload.model_dump(
            exclude={"selection_mode", "selected_user_ids"}
        )

        values["from_email"] = str(payload.from_email)

        if payload.to_email:
            values["to_email"] = str(payload.to_email)

        values["created_by"] = logged_user_id
        values["updated_by"] = logged_user_id
        values["status"] = "Sending"

        if mail_type == "test email":
            if not payload.to_email:
                raise AppException("Recipient email is required for test email", 400)

            campaign = await self.repository.create_campaign(values)

            recipient = await self.repository.create_recipient(
                campaign_id=campaign.id,
                user_id=logged_user_id,
                email=str(payload.to_email),
            )

            html = self.prepare_email_content(
                payload.content,
                campaign.id,
                recipient.user_id,
            )

            await self.send_email(
                from_email=str(payload.from_email),
                to_email=recipient.email,
                subject=payload.subject,
                html_content=html,
            )

            await self.repository.mark_recipient_sent(recipient)

            return await self.repository.mark_campaign_sent(campaign, 1)

        if mail_type != "bulk email":
            raise AppException("mail_type must be Test Email or Bulk Email", 400)

        if not payload.tag_id:
            raise AppException("Tag ID is required for bulk email", 400)

        if payload.selection_mode not in ("all", "selected"):
            raise AppException("selection_mode must be all or selected", 400)

        if payload.selection_mode == "selected" and not payload.selected_user_ids:
            raise AppException("Select at least one recipient", 400)

        if payload.selection_mode == "all" and payload.selected_user_ids:
            raise AppException("selected_user_ids must be empty for Select All", 400)

        recipients_data = await self.repository.get_recipients_by_tag(
            tag_id=payload.tag_id,
            selection_mode=payload.selection_mode,
            selected_contact_ids=payload.selected_user_ids,
            user_id=logged_user_id,
        )

        if not recipients_data:
            raise AppException("No eligible recipients found for selected tag", 400)

        if payload.selection_mode == "selected":
            found_ids = {recipient["user_id"] for recipient in recipients_data}
            requested_ids = set(payload.selected_user_ids)

            if found_ids != requested_ids:
                raise AppException(
                    "Some selected users do not belong to this tag or are not eligible",
                    400,
                )

        campaign = await self.repository.create_campaign(values)

        recipients = await self.repository.create_recipients(
            campaign.id,
            recipients_data,
        )

        sent_count = 0

        for recipient in recipients:
            if not recipient.is_enabled:
                continue

            if recipient.user_id is None:
                logger.warning(
                    "Skipping recipient without user ID",
                    extra={"recipient_id": str(recipient.id)},
                )
                continue

            try:
                html = self.prepare_email_content(
                    payload.content,
                    campaign.id,
                    recipient.user_id,
                )

                await self.send_email(
                    from_email=str(payload.from_email),
                    to_email=recipient.email,
                    subject=payload.subject,
                    html_content=html,
                )

                await self.repository.mark_recipient_sent(recipient)
                sent_count += 1

            except Exception:
                logger.exception(
                    "Failed to send marketing email",
                    extra={"recipient_id": str(recipient.id)},
                )
                continue

        return await self.repository.mark_campaign_sent(campaign, sent_count)

    async def send_email(self, from_email: str, to_email: str, subject: str, html_content: str):
        raise NotImplementedError("Connect existing email sender here")

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

        await self.get_campaign(recipient.email_marketing_id)

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
