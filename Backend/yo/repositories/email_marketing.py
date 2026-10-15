from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from yo.models.contact import Contact
from yo.models.email_marketing import EmailMarketing, EmailMarketingRecipient


class EmailMarketingRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_campaign(self, campaign_id: UUID):
        result = await self.session.execute(
            select(EmailMarketing).where(
                EmailMarketing.id == campaign_id,
                EmailMarketing.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def list_campaigns(
        self,
        search: str | None = None,
        page: int = 1,
        per_page: int = 10,
    ):
        conditions = [EmailMarketing.deleted_at.is_(None)]

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
            )
            objects.append(obj)

        if objects:
            self.session.add_all(objects)
            await self.session.flush()

        return objects

    async def get_recipients_by_tag(
        self,
        tag_id: UUID,
        selection_mode: str,
        tag_contact_ids: list[UUID],
        selected_contact_ids: list[UUID] | None = None,
    ) -> list[dict]:
        """
        Retrieve eligible contacts from the existing contacts table.

        tag_contact_ids:
            Contact IDs associated with the selected tag,
            supplied by the caller.

        selection_mode:
            "all"      -> all IDs in tag_contact_ids
            "selected" -> selected_contact_ids only

        IMPORTANT:
            The Contact model has no tag relationship.
            This method cannot independently validate that
            tag_contact_ids belong to tag_id.
        """
        if selection_mode not in ("all", "selected"):
            raise ValueError(
                "selection_mode must be 'all' or 'selected'"
            )

        tag_ids = set(tag_contact_ids or [])
        selected_ids = set(selected_contact_ids or [])

        if not tag_ids:
            return []

        if selection_mode == "all":
            if selected_ids:
                raise ValueError(
                    "selected_contact_ids must be empty for Select All"
                )
            contact_ids = tag_ids

        else:
            if not selected_ids:
                raise ValueError(
                    "Select at least one contact"
                )

            if not selected_ids.issubset(tag_ids):
                raise ValueError(
                    "Some selected contacts are not in the supplied tag contact list"
                )

            contact_ids = selected_ids

        query = (
            select(Contact.id, Contact.email)
            .where(
                Contact.id.in_(contact_ids),
                Contact.deleted_at.is_(None),
                Contact.email.is_not(None),
                Contact.email_opt_out.is_(False),
                func.length(func.trim(Contact.email)) > 0,
            )
            .distinct()
        )

        result = await self.session.execute(query)

        return [
            {
                "contact_id": contact_id,
                "email": email.strip(),
            }
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
                EmailMarketing.deleted_at.is_(None),
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
                EmailMarketing.deleted_at.is_(None),
            )
            .values(
                click_count=EmailMarketing.click_count + 1
            )
        )

        await self.session.flush()
        return True
