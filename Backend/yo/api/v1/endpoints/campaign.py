import logging
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from yo.services.role import RoleService
from yo.core.exceptions import AppException
from yo.core.auth.dependencies import CurrentUser
from yo.core.database.dependencies import DatabaseSession
from yo.core.schemas.responses import SuccessResponse
from yo.repositories.campaign import CampaignRepository
from yo.schemas.requests.campaign import (
    CampaignCreateRequest,
    CampaignUpdateRequest,
    CampaignBulkDeleteRequest,
)
from yo.schemas.responses.campaign import (
    CampaignListResponse,
    CampaignResponse,
)
from yo.services.campaign import CampaignService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/campaigns", tags=["Campaigns"])


def get_service(session: DatabaseSession, workspace_id: UUID | None, user_id: UUID) -> CampaignService:
    return CampaignService(CampaignRepository(session, workspace_id), user_id)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_campaign(payload: CampaignCreateRequest,session: DatabaseSession,current_user: CurrentUser):
    await RoleService(session).check_permission(current_user, "campaigns", "create")
    try:
        campaign = await get_service(session, payload.workspace_id, current_user.id).create_campaign(payload, current_user.id)

        return SuccessResponse(
            success=True,
            message="Campaign created successfully",
            data=CampaignResponse.model_validate(campaign),
        )

    except (HTTPException, AppException):
        raise
    except Exception:
        logger.exception("Failed to create campaign")
        raise HTTPException(
            status_code=500,
            detail="Failed to create campaign",
        )


@router.get("")
async def get_campaigns(
    session: DatabaseSession,
    current_user: CurrentUser,
    workspace_id: UUID | None = Query(default=None),
    campaign_id: UUID | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=5, ge=1, le=100),
    include_options: bool = Query(default=False),
):
    await RoleService(session).check_permission(current_user, "campaigns", "view")
    try:
        service = get_service(session, workspace_id, current_user.id)

        if campaign_id is not None:
            campaign = await service.get_campaign(campaign_id)

            data = CampaignResponse.model_validate(campaign)
            message = "Campaign retrieved successfully"

        else:
            result = await service.list_campaigns(
                search=search,
                page=page,
                per_page=per_page,
            )

            data = CampaignListResponse(
                items=[
                    CampaignResponse.model_validate(item)
                    for item in result["items"]
                ],
                total=result["total"],
                page=result["page"],
                per_page=result["per_page"],
            )
            message = "Campaigns retrieved successfully"

        response_data = {"campaigns": data}

        if include_options:
            response_data["options"] = await service.get_campaign_options()

        return SuccessResponse(
            success=True,
            message=message,
            data=response_data,
        )

    except (HTTPException, AppException):
        raise
    except Exception:
        logger.exception("Failed to retrieve campaigns")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve campaigns",
        )


@router.put("/{campaign_id}")
async def update_campaign(
    campaign_id: UUID,
    payload: CampaignUpdateRequest,
    session: DatabaseSession,
    current_user: CurrentUser,
    workspace_id: UUID | None = Query(default=None),
):
    await RoleService(session).check_permission(current_user, "campaigns", "update")
    try:
        campaign = await get_service(session, workspace_id, current_user.id).update_campaign(
            campaign_id,
            payload,
            current_user.id,
        )

        return SuccessResponse(
            success=True,
            message="Campaign updated successfully",
            data=CampaignResponse.model_validate(campaign),
        )

    except (HTTPException, AppException):
        raise
    except Exception:
        logger.exception("Failed to update campaign")
        raise HTTPException(
            status_code=500,
            detail="Failed to update campaign",
        )


@router.delete("/{campaign_id}")
async def delete_campaign(
    campaign_id: UUID,
    session: DatabaseSession,
    current_user: CurrentUser,
    workspace_id: UUID | None = Query(default=None),
):
    await RoleService(session).check_permission(current_user, "campaigns", "delete")
    try:
        await get_service(session, workspace_id, current_user.id).delete_campaign(
            campaign_id,
            current_user.id,
        )

        return SuccessResponse(
            success=True,
            message="Campaign deleted successfully",
            data=None,
        )

    except (HTTPException, AppException):
        raise
    except Exception:
        logger.exception("Failed to delete campaign")
        raise HTTPException(
            status_code=500,
            detail="Failed to delete campaign",
        )


@router.post("/bulk-delete")
async def bulk_delete_campaigns(
    payload: CampaignBulkDeleteRequest,
    session: DatabaseSession,
    current_user: CurrentUser,
    workspace_id: UUID | None = Query(default=None),
):
    await RoleService(session).check_permission(current_user, "campaigns", "delete")
    try:
        result = await get_service(session, workspace_id, current_user.id).bulk_delete_campaigns(
            payload.ids,
            current_user.id,
        )

        return SuccessResponse(
            success=True,
            message="Campaigns deleted successfully",
            data=result,
        )

    except (HTTPException, AppException):
        raise
    except Exception:
        logger.exception("Failed to bulk delete campaigns")
        raise HTTPException(
            status_code=500,
            detail="Failed to delete campaigns",
        )
