import base64
import logging

from uuid import UUID
from urllib.parse import urlsplit

from fastapi import APIRouter, Query, status
from fastapi.responses import RedirectResponse, Response

from yo.services.role import RoleService
from yo.core.database import DatabaseSession
from yo.core.schemas.responses import SuccessResponse
from yo.core.auth.dependencies import CurrentUser
from yo.core.exceptions import AppException

from yo.repositories.email_marketing import EmailMarketingRepository
from yo.services.email_marketing import EmailMarketingService

from yo.schemas.requests.email_marketing import (
    EmailMarketingCreateRequest,
    EmailMarketingRecipientStatusRequest,
    EmailMarketingScheduleRequest,
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
    description="For Bulk Email, pass tag_ids and selection_mode: all enables every eligible contact across the tags; selected enables only selected_user_ids and saves the others as disabled. Legacy tag_id is accepted. Set scheduled_at for future delivery or omit it to queue immediately. Only saved enabled recipients are sent mail.",
)
async def create_email_campaign(
    payload: EmailMarketingCreateRequest,
    session: DatabaseSession,
    current_user: CurrentUser,
) -> SuccessResponse[EmailMarketingResponse]:
    await RoleService(session).check_permission(current_user, "emailMarketing", "create")
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


@router.put(
    "/{campaign_id}",
    response_model=SuccessResponse[EmailMarketingResponse],
    summary="Edit an email campaign before sending starts",
    description="Replace campaign details and recipients using the same body as creation. Draft, Queued and Scheduled campaigns can be edited before any delivery attempt. Sent or Sending campaigns return 409. Include scheduled_at to retain or change the schedule; null/omitted queues immediate delivery.",
)
async def edit_email_campaign(
    campaign_id: UUID,
    payload: EmailMarketingCreateRequest,
    session: DatabaseSession,
    current_user: CurrentUser,
) -> SuccessResponse[EmailMarketingResponse]:
    await RoleService(session).check_permission(current_user, "emailMarketing", "update")
    campaign = await get_service(session, payload.workspace_id, current_user.id).edit_campaign(
        campaign_id, payload,
    )
    return SuccessResponse(
        message="Email campaign updated and queued for its saved recipients",
        data=EmailMarketingResponse.model_validate(campaign),
    )


@router.patch(
    "/{campaign_id}/schedule",
    response_model=SuccessResponse[EmailMarketingResponse],
    summary="Set or change the send time before campaign delivery starts",
)
async def schedule_email_campaign(
    campaign_id: UUID,
    payload: EmailMarketingScheduleRequest,
    session: DatabaseSession,
    current_user: CurrentUser,
    workspace_id: UUID = Query(...),
) -> SuccessResponse[EmailMarketingResponse]:
    await RoleService(session).check_permission(current_user, "emailMarketing", "update")
    campaign = await get_service(session, workspace_id, current_user.id).schedule_campaign(
        campaign_id, payload.scheduled_at,
    )
    return SuccessResponse(
        message="Campaign scheduled for delivery to its saved recipients",
        data=EmailMarketingResponse.model_validate(campaign),
    )


@router.get(
    "",
    status_code=status.HTTP_200_OK,
    summary="Get email marketing campaigns",
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
    await RoleService(session).check_permission(current_user, "emailMarketing", "view")
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
)
async def get_email_recipients(
    campaign_id: UUID,
    session: DatabaseSession,
    current_user: CurrentUser,
    workspace_id: UUID | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=10, ge=1, le=100),
) -> SuccessResponse[EmailMarketingRecipientListResponse]:
    await RoleService(session).check_permission(current_user, "emailMarketing", "view")
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
)
async def update_recipient_status(
    recipient_id: UUID,
    payload: EmailMarketingRecipientStatusRequest,
    session: DatabaseSession,
    current_user: CurrentUser,
    workspace_id: UUID | None = Query(default=None),
) -> SuccessResponse[EmailMarketingRecipientResponse]:
    await RoleService(session).check_permission(current_user, "emailMarketing", "update")
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
)
async def get_campaign_report(
    campaign_id: UUID,
    session: DatabaseSession,
    current_user: CurrentUser,
    workspace_id: UUID | None = Query(default=None),
) -> SuccessResponse[EmailMarketingReportResponse]:
    await RoleService(session).check_permission(current_user, "emailMarketing", "view")
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
)
async def replicate_campaign(
    campaign_id: UUID,
    session: DatabaseSession,
    current_user: CurrentUser,
    workspace_id: UUID | None = Query(default=None),
) -> SuccessResponse[EmailMarketingResponse]:
    await RoleService(session).check_permission(current_user, "emailMarketing", "create")
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
)
async def delete_email_campaign(
    campaign_id: UUID,
    session: DatabaseSession,
    current_user: CurrentUser,
    workspace_id: UUID | None = Query(default=None),
) -> SuccessResponse[dict[str, str]]:
    await RoleService(session).check_permission(current_user, "emailMarketing", "delete")
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
