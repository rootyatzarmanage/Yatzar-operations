from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from yo.repositories.workspace import WorkspaceRepository

from yo.models.contact import Contact
from yo.models.tag import Tag
from yo.repositories.contact import ContactRepository
from yo.models.email_marketing import EmailMarketing, EmailMarketingRecipient


class EmailMarketingRepository:
    def __init__(self, session: AsyncSession, workspace_id: UUID | None = None):
        self.session = session
        self.workspace_id = workspace_id

    async def get_campaign(self, campaign_id: UUID, *, for_update: bool = False):
        query = select(EmailMarketing).where(
            EmailMarketing.id == campaign_id,
            EmailMarketing.deleted_at.is_(None),
            or_(self.workspace_id is None, EmailMarketing.workspace_id == self.workspace_id),
        )
        if for_update:
            query = query.with_for_update().execution_options(populate_existing=True)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def list_campaigns(
        self,
        user_id: UUID,
        search: str | None = None,
        page: int = 1,
        per_page: int = 10,
    ):
        conditions = [
            EmailMarketing.deleted_at.is_(None),
            WorkspaceRepository.scope_condition(EmailMarketing.workspace_id, user_id, self.workspace_id),
        ]

        if search and search.strip():
            search_term = f"%{search.strip()}%"
            conditions.append(
                or_(
                    EmailMarketing.campaign_name.ilike(search_term),
                    EmailMarketing.subject.ilike(search_term),
                    EmailMarketing.from_email.ilike(search_term),
                    EmailMarketing.platform.ilike(search_term),
                    EmailMarketing.mail_type.ilike(search_term),
                    EmailMarketing.status.ilike(search_term),
                )
            )

        total_result = await self.session.execute(
            select(func.count(EmailMarketing.id)).where(*conditions)
        )
        total = total_result.scalar_one()

        result = await self.session.execute(
            select(EmailMarketing)
            .where(*conditions)
            .order_by(EmailMarketing.updated_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )

        return {
            "items": result.scalars().all(),
            "total": total,
            "page": page,
            "per_page": per_page,
        }

    async def create_campaign(self, values: dict):
        campaign = EmailMarketing(**values)
        self.session.add(campaign)
        await self.session.flush()
        await self.session.refresh(campaign)
        return campaign

    async def delete_campaign(
        self,
        campaign: EmailMarketing,
        user_id: UUID,
    ):
        campaign.deleted_at = datetime.now(timezone.utc)
        campaign.deleted_by = user_id
        await self.session.flush()

    async def create_recipient(
        self,
        campaign_id: UUID,
        user_id: UUID | None,
        email: str,
    ):
        recipient = EmailMarketingRecipient(
            email_marketing_id=campaign_id,
            user_id=user_id,
            email=email,
        )
        self.session.add(recipient)
        await self.session.flush()
        return recipient

    async def create_recipients(
        self,
        campaign_id: UUID,
        recipients: list[dict],
    ):
        objects = []

        for recipient in recipients:
            obj = EmailMarketingRecipient(
                email_marketing_id=campaign_id,
                user_id=recipient.get("user_id"),
                email=recipient["email"],
                is_enabled=recipient.get("is_enabled", True),
            )
            objects.append(obj)

        if objects:
            self.session.add_all(objects)
            await self.session.flush()

        return objects

    async def get_active_tag_ids(self, tag_ids: list[UUID]) -> set[UUID]:
        return set(await self.session.scalars(select(Tag.id).where(
            Tag.id.in_(tag_ids), Tag.deleted_at.is_(None), Tag.status == 1,
        )))

    async def get_recipients_by_tags(
        self,
        tag_ids: list[UUID],
        selection_mode: str,
        selected_contact_ids: list[UUID],
        *, user_id: UUID,
    ) -> list[dict]:
        query = select(Contact.id, Contact.email).join(Tag, Tag.id == Contact.tag_id).where(
            Contact.tag_id.in_(tag_ids),
            Tag.deleted_at.is_(None), Tag.status == 1,
            Contact.workspace_id == self.workspace_id,
            ContactRepository.access_condition(user_id),
            Contact.deleted_at.is_(None),
            Contact.email.is_not(None),
            Contact.email_opt_out.is_(False),
            func.length(func.trim(Contact.email)) > 0,
        )
        query = query.order_by(Contact.created_at, Contact.id)
        result = await self.session.execute(query)
        enabled_ids = set(selected_contact_ids)
        return [
            {"user_id": contact_id, "email": email.strip().lower(),
             "is_enabled": selection_mode == "all" or contact_id in enabled_ids}
            for contact_id, email in result.all()
        ]

    async def get_recipient(
        self,
        campaign_id: UUID,
        user_id: UUID,
    ):
        result = await self.session.execute(
            select(EmailMarketingRecipient).where(
                EmailMarketingRecipient.email_marketing_id == campaign_id,
                EmailMarketingRecipient.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_recipient_by_id(self, recipient_id: UUID):
        result = await self.session.execute(
            select(EmailMarketingRecipient).where(
                EmailMarketingRecipient.id == recipient_id
            )
        )
        return result.scalar_one_or_none()

    async def list_recipients(
        self,
        campaign_id: UUID,
        page: int,
        per_page: int,
    ):
        total_result = await self.session.execute(
            select(func.count(EmailMarketingRecipient.id)).where(
                EmailMarketingRecipient.email_marketing_id == campaign_id
            )
        )
        total = total_result.scalar_one()

        result = await self.session.execute(
            select(EmailMarketingRecipient)
            .where(
                EmailMarketingRecipient.email_marketing_id == campaign_id
            )
            .order_by(EmailMarketingRecipient.created_at.asc())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )

        return {
            "items": result.scalars().all(),
            "total": total,
            "page": page,
            "per_page": per_page,
        }

    async def update_recipient_status(
        self,
        recipient: EmailMarketingRecipient,
        is_enabled: bool,
    ):
        recipient.is_enabled = is_enabled
        await self.session.flush()
        await self.session.refresh(recipient)
        return recipient

    async def mark_recipient_sent(
        self,
        recipient: EmailMarketingRecipient,
    ):
        recipient.sent = True
        await self.session.flush()

    async def mark_campaign_sent(
        self,
        campaign: EmailMarketing,
        sent_count: int,
    ):
        campaign.sent_count = sent_count
        campaign.status = "Email Sent"
        campaign.sent_at = datetime.now(timezone.utc)
        await self.session.flush()
        await self.session.refresh(campaign)
        return campaign

    async def register_open(
        self,
        campaign_id: UUID,
        user_id: UUID,
    ) -> bool:
        result = await self.session.execute(
            select(EmailMarketingRecipient)
            .where(
                EmailMarketingRecipient.email_marketing_id == campaign_id,
                EmailMarketingRecipient.user_id == user_id,
                EmailMarketingRecipient.is_enabled.is_(True),
            )
            .with_for_update()
        )

        recipient = result.scalar_one_or_none()

        if recipient is None:
            return False

        campaign = await self.get_campaign(campaign_id)

        if campaign is None:
            return False

        now = datetime.now(timezone.utc)

        if recipient.last_opened_at is not None:
            last_opened = recipient.last_opened_at

            if last_opened.tzinfo is None:
                last_opened = last_opened.replace(
                    tzinfo=timezone.utc
                )

            if now - last_opened < timedelta(minutes=2):
                return False

        recipient.open_count += 1

        if recipient.first_opened_at is None:
            recipient.first_opened_at = now

        recipient.last_opened_at = now

        await self.session.execute(
            update(EmailMarketing)
            .where(
                EmailMarketing.id == campaign_id,
                EmailMarketing.deleted_at.is_(None), or_(self.workspace_id is None, EmailMarketing.workspace_id == self.workspace_id),
            )
            .values(
                open_count=EmailMarketing.open_count + 1
            )
        )

        await self.session.flush()
        return True

    async def register_click(
        self,
        campaign_id: UUID,
        user_id: UUID,
    ) -> bool:
        result = await self.session.execute(
            select(EmailMarketingRecipient)
            .where(
                EmailMarketingRecipient.email_marketing_id == campaign_id,
                EmailMarketingRecipient.user_id == user_id,
                EmailMarketingRecipient.is_enabled.is_(True),
            )
            .with_for_update()
        )

        recipient = result.scalar_one_or_none()

        if recipient is None:
            return False

        campaign = await self.get_campaign(campaign_id)

        if campaign is None:
            return False

        now = datetime.now(timezone.utc)

        recipient.click_count += 1

        if recipient.first_clicked_at is None:
            recipient.first_clicked_at = now

        recipient.last_clicked_at = now

        await self.session.execute(
            update(EmailMarketing)
            .where(
                EmailMarketing.id == campaign_id,
                EmailMarketing.deleted_at.is_(None), or_(self.workspace_id is None, EmailMarketing.workspace_id == self.workspace_id),
            )
            .values(
                click_count=EmailMarketing.click_count + 1
            )
        )

        await self.session.flush()
        return True
