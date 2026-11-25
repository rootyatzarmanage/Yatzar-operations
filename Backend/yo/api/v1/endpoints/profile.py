import logging

from fastapi import APIRouter, HTTPException

from yo.core.auth.dependencies import CurrentUser
from yo.core.database import DatabaseSession
from yo.core.exceptions import AppException
from yo.core.schemas.responses import SuccessResponse
from yo.repositories.user import UserRepository
from yo.schemas.requests.profile import ChangePasswordRequest, ProfileUpdateRequest
from yo.schemas.responses.profile import ProfileResponse
from yo.services.profile import ProfileService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/profile", tags=["Profile"])


@router.get("", response_model=SuccessResponse[ProfileResponse])
async def get_profile(current_user: CurrentUser):
    return SuccessResponse(
        success=True,
        message="Profile retrieved successfully",
        data=ProfileService.get_profile(current_user),
    )


@router.put("", response_model=SuccessResponse[ProfileResponse])
async def update_profile(
    payload: ProfileUpdateRequest,
    session: DatabaseSession,
    current_user: CurrentUser,
):
    try:
        profile = await ProfileService(UserRepository(session)).update_profile(current_user, payload)
        return SuccessResponse(
            success=True,
            message="Profile updated successfully",
            data=profile,
        )
    except AppException:
        raise
    except Exception:
        logger.exception("Failed to update profile")
        raise HTTPException(500, "Failed to update profile.")


@router.post("/change-password", response_model=SuccessResponse[None])
async def change_password(payload: ChangePasswordRequest, session: DatabaseSession, current_user: CurrentUser):
    try:
        await ProfileService(UserRepository(session)).change_password(current_user, payload)
        return SuccessResponse(success=True, message="Password changed successfully", data=None)
    except AppException:
        raise
    except Exception:
        logger.exception("Failed to change password")
        raise HTTPException(500, "Failed to change password.")

