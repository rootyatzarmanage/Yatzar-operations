from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from yo.models.campaign import Campaign
from yo.models.user import User


class CampaignRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_campaign(self, campaign_id: UUID):
        result = await self.session.execute(
            select(Campaign).where(
                Campaign.id == campaign_id,
                Campaign.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def list_campaigns(self,search: str | None = None,page: int = 1,per_page: int = 5):
        conditions = [Campaign.deleted_at.is_(None)]
        if search and search.strip():
            search_term = f"%{search.strip()}%"
            conditions.append(
                or_(
                    Campaign.campaign_name.ilike(search_term),
                    Campaign.campaign_subject.ilike(search_term),
                    Campaign.sender_name.ilike(search_term),
                    Campaign.sender_address.ilike(search_term),
                    Campaign.reply_to_address.ilike(search_term),
                    Campaign.type.ilike(search_term),
                    Campaign.status.ilike(search_term),
                    Campaign.description.ilike(search_term),
                )
            )
        total_result = await self.session.execute(
            select(func.count(Campaign.id)).where(*conditions)
        )
        total = total_result.scalar_one()
        result = await self.session.execute(
            select(Campaign)
            .where(*conditions)
            .order_by(Campaign.created_at.desc())
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
        campaign = Campaign(**values)
        self.session.add(campaign)
        await self.session.flush()
        await self.session.refresh(campaign)
        return campaign

    async def update_campaign(self, campaign: Campaign, values: dict):
        for key, value in values.items():
            setattr(campaign, key, value)

        await self.session.flush()
        await self.session.refresh(campaign)
        return campaign

    async def soft_delete_campaign(
        self,
        campaign: Campaign,
        user_id: UUID,
    ) -> None:
        campaign.deleted_at = datetime.now(timezone.utc)
        campaign.deleted_by = user_id
        await self.session.flush()

    async def soft_delete_many(
        self,
        campaign_ids: list[UUID],
        user_id: UUID,
    ) -> int:
        result = await self.session.execute(
            select(Campaign).where(
                Campaign.id.in_(campaign_ids),
                Campaign.deleted_at.is_(None),
            )
        )
        campaigns = list(result.scalars().all())

        for campaign in campaigns:
            campaign.deleted_at = datetime.now(timezone.utc)
            campaign.deleted_by = user_id

        await self.session.flush()
        return len(campaigns)

    async def get_campaign_options(self) -> dict:
        owners_result = await self.session.execute(
            select(User.id, User.username)
            .order_by(User.username.asc())
        )

        owners = [
            {"id": str(user_id), "name": username}
            for user_id, username in owners_result.all()
        ]

        sender_result = await self.session.execute(
            select(Campaign.sender_address)
            .where(
                Campaign.deleted_at.is_(None),
                Campaign.sender_address.is_not(None),
            )
            .distinct()
        )

        reply_result = await self.session.execute(
            select(Campaign.reply_to_address)
            .where(
                Campaign.deleted_at.is_(None),
                Campaign.reply_to_address.is_not(None),
            )
            .distinct()
        )

        return {
            "owners": owners,
            "sender_addresses": [
                address for address, in sender_result.all()
            ],
            "reply_to_addresses": [
                address for address, in reply_result.all()
            ],
        }
