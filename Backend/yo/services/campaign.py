from uuid import UUID

from fastapi import HTTPException

from yo.repositories.campaign import CampaignRepository
from yo.schemas.requests.campaign import (
    CampaignCreateRequest,
    CampaignUpdateRequest,
)


class CampaignService:
    def __init__(self, repository: CampaignRepository):
        self.repository = repository

    async def get_campaign(self, campaign_id: UUID):
        campaign = await self.repository.get_campaign(campaign_id)

        if campaign is None:
            raise HTTPException(404, "Campaign not found.")

        return campaign

    async def list_campaigns(
        self,
        search: str | None = None,
        page: int = 1,
        per_page: int = 5,
    ):
        return await self.repository.list_campaigns(
            search=search,
            page=page,
            per_page=per_page,
        )

    async def get_campaign_options(self):
        return await self.repository.get_campaign_options()

    async def create_campaign(
        self,
        payload: CampaignCreateRequest,
        user_id: UUID,
    ):
        values = payload.model_dump()
        values["created_by"] = user_id
        values["updated_by"] = user_id

        return await self.repository.create_campaign(values)

    async def update_campaign(
        self,
        campaign_id: UUID,
        payload: CampaignUpdateRequest,
        user_id: UUID,
    ):
        campaign = await self.get_campaign(campaign_id)
        values = payload.model_dump(exclude_unset=True)

        values["updated_by"] = user_id

        return await self.repository.update_campaign(
            campaign,
            values,
        )

    async def delete_campaign(
        self,
        campaign_id: UUID,
        user_id: UUID,
    ):
        campaign = await self.get_campaign(campaign_id)

        await self.repository.soft_delete_campaign(
            campaign,
            user_id,
        )

    async def bulk_delete_campaigns(
        self,
        campaign_ids: list[UUID],
        user_id: UUID,
    ):
        deleted_count = await self.repository.soft_delete_many(
            campaign_ids,
            user_id,
        )

        return {"deleted_count": deleted_count}
