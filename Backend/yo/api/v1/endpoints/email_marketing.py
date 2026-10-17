import base64
import logging

from uuid import UUID
from urllib.parse import urlsplit

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import RedirectResponse, Response

from yo.core.auth.permissions import require_permission
from yo.core.database import DatabaseSession
from yo.core.schemas.responses import SuccessResponse
from yo.core.auth.dependencies import CurrentUser
from yo.core.exceptions import AppException

from yo.repositories.email_marketing import EmailMarketingRepository
from yo.services.email_marketing import EmailMarketingService

from yo.schemas.requests.email_marketing import (
    EmailMarketingCreateRequest,
    EmailMarketingRecipientStatusRequest,
)

from yo.schemas.responses.email_marketing import (
    EmailMarketingListItemResponse,
    EmailMarketingListResponse,
    EmailMarketingRecipientListResponse,
    EmailMarketingRecipientResponse,
    EmailMarketingReportResponse,
    EmailMarketingResponse,
)


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/email-marketing",
    tags=["Email Marketing"],
)

TRANSPARENT_GIF = base64.b64decode(
    "R0lGODlhAQABAIAAAAAAAP///"
    "ywAAAAAAQABAAACAUwAOw=="
)


def get_service(session: DatabaseSession, workspace_id: UUID | None = None, user_id: UUID | None = None) -> EmailMarketingService:
    repository = EmailMarketingRepository(session, workspace_id)
    return EmailMarketingService(repository, user_id)


@router.get(
    "/track/open",
    include_in_schema=False,
)
async def track_email_open(
    campaign_id: UUID,
    user_id: UUID,
    signature: str,
    session: DatabaseSession,
):
    service = get_service(session)

    counted = await service.track_open(
        campaign_id=campaign_id,
        user_id=user_id,
        signature=signature,
    )

    logger.info(
        "Email open tracking request processed",
        extra={
            "campaign_id": str(campaign_id),
            "counted": counted,
        },
    )

    return Response(
        content=TRANSPARENT_GIF,
        media_type="image/gif",
        headers={
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    )


@router.get(
    "/track/click",
    include_in_schema=False,
)
async def track_email_click(
    campaign_id: UUID,
    user_id: UUID,
    url: str,
    signature: str,
    session: DatabaseSession,
):
    service = get_service(session)

    parsed_url = urlsplit(url)

    if (
        parsed_url.scheme not in {"http", "https"}
        or not parsed_url.hostname
        or parsed_url.username is not None
        or parsed_url.password is not None
    ):
        raise AppException("Invalid redirect URL", 400)

    await service.track_click(
        campaign_id=campaign_id,
        user_id=user_id,
        signature=signature,
        url=url,
    )

    return RedirectResponse(
        url=url,
        status_code=status.HTTP_302_FOUND,
    )


@router.post(
    "",
    response_model=SuccessResponse[EmailMarketingResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Queue email campaign for immediate or scheduled SMTP delivery",
    dependencies=[Depends(require_permission("emailMarketing", "create"))],
)
async def create_email_campaign(
    payload: EmailMarketingCreateRequest,
    session: DatabaseSession,
    current_user: CurrentUser,
) -> SuccessResponse[EmailMarketingResponse]:
    service = get_service(session, payload.workspace_id, current_user.id)

    campaign = await service.create_and_send(
        payload,
        current_user.id,
    )

    logger.info(
        "Email marketing campaign processed",
        extra={"campaign_id": str(campaign.id)},
    )

    return SuccessResponse(
        success=True,
        message="Email marketing campaign queued for delivery",
        data=EmailMarketingResponse.model_validate(campaign),
    )


@router.get(
    "",
    status_code=status.HTTP_200_OK,
    summary="Get email marketing campaigns",
    dependencies=[Depends(require_permission("emailMarketing", "view"))],
)
async def get_email_campaigns(
    session: DatabaseSession,
    current_user: CurrentUser,
    workspace_id: UUID | None = Query(default=None),
    campaign_id: UUID | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=10, ge=1, le=100),
):
    service = get_service(session, workspace_id, current_user.id)

    if campaign_id:
        campaign = await service.get_campaign(campaign_id)

        return SuccessResponse(
            success=True,
            message="Email marketing campaign fetched successfully",
            data=EmailMarketingResponse.model_validate(campaign),
        )

    result = await service.list_campaigns(
        search=search,
        page=page,
        per_page=per_page,
    )

    data = EmailMarketingListResponse(
        items=[
            EmailMarketingListItemResponse.model_validate(item)
            for item in result["items"]
        ],
        total=result["total"],
        page=result["page"],
        per_page=result["per_page"],
    )

    return SuccessResponse(
        success=True,
        message="Email marketing campaigns fetched successfully",
        data=data,
    )


@router.get(
    "/{campaign_id}/recipients",
    response_model=SuccessResponse[EmailMarketingRecipientListResponse],
    status_code=status.HTTP_200_OK,
    summary="Get email marketing campaign recipients",
    dependencies=[Depends(require_permission("emailMarketing", "view"))],
)
async def get_email_recipients(
    campaign_id: UUID,
    session: DatabaseSession,
    current_user: CurrentUser,
    workspace_id: UUID | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=10, ge=1, le=100),
) -> SuccessResponse[EmailMarketingRecipientListResponse]:
    service = get_service(session, workspace_id, current_user.id)

    result = await service.list_recipients(
        campaign_id,
        page,
        per_page,
    )

    data = EmailMarketingRecipientListResponse(
        items=[
            EmailMarketingRecipientResponse.model_validate(item)
            for item in result["items"]
        ],
        total=result["total"],
        page=result["page"],
        per_page=result["per_page"],
    )

    return SuccessResponse(
        success=True,
        message="Email recipients fetched successfully",
        data=data,
    )


@router.patch(
    "/recipients/{recipient_id}/status",
    response_model=SuccessResponse[EmailMarketingRecipientResponse],
    status_code=status.HTTP_200_OK,
    summary="Enable or disable email recipient",
    dependencies=[Depends(require_permission("emailMarketing", "update"))],
)
async def update_recipient_status(
    recipient_id: UUID,
    payload: EmailMarketingRecipientStatusRequest,
    session: DatabaseSession,
    current_user: CurrentUser,
    workspace_id: UUID | None = Query(default=None),
) -> SuccessResponse[EmailMarketingRecipientResponse]:
    service = get_service(session, workspace_id, current_user.id)

    recipient = await service.update_recipient_status(
        recipient_id,
        payload.is_enabled,
    )

    return SuccessResponse(
        success=True,
        message="Recipient status updated successfully",
        data=EmailMarketingRecipientResponse.model_validate(recipient),
    )


@router.get(
    "/{campaign_id}/report",
    response_model=SuccessResponse[EmailMarketingReportResponse],
    status_code=status.HTTP_200_OK,
    summary="Get email marketing campaign report",
    dependencies=[Depends(require_permission("emailMarketing", "view"))],
)
async def get_campaign_report(
    campaign_id: UUID,
    session: DatabaseSession,
    current_user: CurrentUser,
    workspace_id: UUID | None = Query(default=None),
) -> SuccessResponse[EmailMarketingReportResponse]:
    service = get_service(session, workspace_id, current_user.id)

    report = await service.get_report(campaign_id)

    return SuccessResponse(
        success=True,
        message="Email marketing report fetched successfully",
        data=EmailMarketingReportResponse(**report),
    )


@router.post(
    "/{campaign_id}/replicate",
    response_model=SuccessResponse[EmailMarketingResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Replicate email marketing campaign",
    dependencies=[Depends(require_permission("emailMarketing", "create"))],
)
async def replicate_campaign(
    campaign_id: UUID,
    session: DatabaseSession,
    current_user: CurrentUser,
    workspace_id: UUID | None = Query(default=None),
) -> SuccessResponse[EmailMarketingResponse]:
    service = get_service(session, workspace_id, current_user.id)

    campaign = await service.replicate_campaign(
        campaign_id,
        current_user.id,
    )

    return SuccessResponse(
        success=True,
        message="Email marketing campaign replicated successfully",
        data=EmailMarketingResponse.model_validate(campaign),
    )


@router.delete(
    "/{campaign_id}",
    response_model=SuccessResponse[dict[str, str]],
    status_code=status.HTTP_200_OK,
    summary="Delete email marketing campaign",
    dependencies=[Depends(require_permission("emailMarketing", "delete"))],
)
async def delete_email_campaign(
    campaign_id: UUID,
    session: DatabaseSession,
    current_user: CurrentUser,
    workspace_id: UUID | None = Query(default=None),
) -> SuccessResponse[dict[str, str]]:
    service = get_service(session, workspace_id, current_user.id)

    await service.delete_campaign(
        campaign_id,
        current_user.id,
    )

    return SuccessResponse(
        success=True,
        message="Email marketing campaign deleted successfully",
        data={"deleted_id": str(campaign_id)},
    )
