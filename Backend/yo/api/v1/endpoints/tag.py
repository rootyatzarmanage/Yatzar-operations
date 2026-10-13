import logging
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from yo.core.database import DatabaseSession
from yo.core.schemas.responses import SuccessResponse
from yo.core.auth.dependencies import CurrentUser
from yo.repositories.tag import TagRepository
from yo.services.tag import TagService
from yo.schemas.requests.tag import TagCreateRequest, TagUpdateRequest
from yo.schemas.responses.tag import TagResponse
from yo.core.exceptions import AppException

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tags", tags=["Tags"])


@router.post("", response_model=SuccessResponse[TagResponse],status_code=status.HTTP_201_CREATED)
async def create_tag(payload: TagCreateRequest,session: DatabaseSession,current_user: CurrentUser):
    service = TagService(TagRepository(session))
    try:
        tag = await service.create_tag(payload, current_user.id)
        return SuccessResponse(
            success=True,
            message="Tag created successfully",
            data=TagResponse.model_validate(tag),
        )
    except AppException:
        raise
    except Exception:
        logger.exception("Failed to create tag")
        raise HTTPException(500, "Failed to create tag.")


@router.get("", response_model=SuccessResponse[list[TagResponse]])
async def list_tags(session: DatabaseSession,current_user: CurrentUser,include_inactive: bool = Query(default=False)):
    service = TagService(TagRepository(session))
    try:
        tags = await service.list_tags(include_inactive)
        return SuccessResponse(
            success=True,
            message="Tags fetched successfully",
            data=[TagResponse.model_validate(tag) for tag in tags],
        )
    except AppException:
        raise
    except Exception:
        logger.exception("Failed to fetch tags")
        raise HTTPException(500, "Failed to fetch tags.")


@router.get("/{tag_id}", response_model=SuccessResponse[TagResponse])
async def get_tag(tag_id: UUID,session: DatabaseSession,current_user: CurrentUser):
    service = TagService(TagRepository(session))
    try:
        tag = await service.get_tag(tag_id)
        return SuccessResponse(
            success=True,
            message="Tag fetched successfully",
            data=TagResponse.model_validate(tag),
        )
    except AppException:
        raise
    except Exception:
        logger.exception("Failed to fetch tag")
        raise HTTPException(500, "Failed to fetch tag.")


@router.put("/{tag_id}", response_model=SuccessResponse[TagResponse])
async def update_tag(tag_id: UUID,payload: TagUpdateRequest,session: DatabaseSession,current_user: CurrentUser):
    service = TagService(TagRepository(session))
    try:
        tag = await service.update_tag(tag_id, payload)
        return SuccessResponse(
            success=True,
            message="Tag updated successfully",
            data=TagResponse.model_validate(tag),
        )
    except AppException:
        raise
    except Exception:
        logger.exception("Failed to update tag")
        raise HTTPException(500, "Failed to update tag.")


@router.delete("/{tag_id}", response_model=SuccessResponse[None])
async def delete_tag(tag_id: UUID,session: DatabaseSession,current_user: CurrentUser):
    service = TagService(TagRepository(session))
    try:
        await service.delete_tag(tag_id, current_user.id)
        return SuccessResponse(
            success=True,
            message="Tag deleted successfully",
            data=None,
        )
    except AppException:
        raise
    except Exception:
        logger.exception("Failed to delete tag")
        raise HTTPException(500, "Failed to delete tag.")