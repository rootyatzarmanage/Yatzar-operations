from uuid import UUID

from fastapi import HTTPException

from yo.services.workspace import WorkspaceService
from yo.repositories.campaign import CampaignRepository
from yo.schemas.requests.campaign import (
    CampaignCreateRequest,
    CampaignUpdateRequest,
)


class CampaignService:
    def __init__(self, repository: CampaignRepository, user_id: UUID):
        self.repository = repository
        self.user_id = user_id

    async def get_campaign(self, campaign_id: UUID):
        await WorkspaceService(self.repository.session).ensure_access(
            self.user_id, self.repository.workspace_id,
        )
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

    async def get_campaign_options(self):
        await WorkspaceService(self.repository.session).ensure_access(
            self.user_id, self.repository.workspace_id,
        )
        return await self.repository.get_campaign_options()

    async def create_campaign(
        self,
        payload: CampaignCreateRequest,
        user_id: UUID,
    ):
        await WorkspaceService(self.repository.session).ensure_access(
            self.user_id, self.repository.workspace_id,
        )
        if payload.campaign_owner_id is not None:
            await WorkspaceService(self.repository.session).ensure_access(
                payload.campaign_owner_id, self.repository.workspace_id,
            )
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
        await WorkspaceService(self.repository.session).ensure_access(
            self.user_id, self.repository.workspace_id,
        )
        campaign = await self.get_campaign(campaign_id)
        if payload.campaign_owner_id is not None:
            await WorkspaceService(self.repository.session).ensure_access(
                payload.campaign_owner_id, self.repository.workspace_id,
            )
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
        await WorkspaceService(self.repository.session).ensure_access(
            self.user_id, self.repository.workspace_id,
        )
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
        await WorkspaceService(self.repository.session).ensure_access(
            self.user_id, self.repository.workspace_id,
        )
        for campaign_id in set(campaign_ids):
            await self.get_campaign(campaign_id)
        deleted_count = await self.repository.soft_delete_many(
            campaign_ids,
            user_id,
        )

        return {"deleted_count": deleted_count}
