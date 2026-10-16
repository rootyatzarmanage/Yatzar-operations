import logging
from typing import List
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from yo.core.auth.dependencies import CurrentUser
from yo.core.exceptions import AppException
from yo.core.database.dependencies import DatabaseSession
from yo.core.schemas.responses import SuccessResponse
from yo.schemas.requests.support import (
    DropdownOptionRequest,
)
from yo.schemas.responses.support import (
    DropdownOptionResponse,
)
from yo.services.support import SupportService


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/support",
    tags=["Support data"],
)


def get_service(session: DatabaseSession) -> SupportService:
    return SupportService(session)


@router.get("/locations/countries")
async def list_countries(
    session: DatabaseSession,
    current_user: CurrentUser,
):
    try:
        countries = await get_service(session).list_countries()

        return SuccessResponse(
            success=True,
            message="Countries retrieved successfully",
            data=countries,
        )

    except (HTTPException, AppException):
        raise
    except Exception:
        logger.exception("Failed to retrieve countries")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve countries",
        )


@router.get("/locations/states")
async def list_states(
    session: DatabaseSession,
    current_user: CurrentUser,
    country: str = Query(..., min_length=1),
):
    try:
        states = await get_service(session).list_states(country)

        return SuccessResponse(
            success=True,
            message="States retrieved successfully",
            data=states,
        )

    except (HTTPException, AppException):
        raise
    except Exception:
        logger.exception("Failed to retrieve states")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve states",
        )


@router.get("/locations/districts")
async def list_districts(
    session: DatabaseSession,
    current_user: CurrentUser,
    state: str = Query(..., min_length=1),
):
    try:
        districts = await get_service(session).list_districts(state)

        return SuccessResponse(
            success=True,
            message="Districts retrieved successfully",
            data=districts,
        )

    except (HTTPException, AppException):
        raise
    except Exception:
        logger.exception("Failed to retrieve districts")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve districts",
        )


@router.get("/options/{kind}")
async def list_options(
    kind: str,
    session: DatabaseSession,
    current_user: CurrentUser,
):
    try:
        options = await get_service(session).list_options(kind)

        return SuccessResponse(
            success=True,
            message="Options retrieved successfully",
            data=[
                DropdownOptionResponse.model_validate(item)
                for item in options
            ],
        )

    except (HTTPException, AppException):
        raise
    except Exception:
        logger.exception("Failed to retrieve options")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve options",
        )


@router.post(
    "/options/{kind}",
    status_code=status.HTTP_201_CREATED,
)
async def create_option(
    kind: str,
    payload: DropdownOptionRequest,
    session: DatabaseSession,
    current_user: CurrentUser,
):
    try:
        option = await get_service(session).create_option(
            kind,
            payload,
        )

        return SuccessResponse(
            success=True,
            message="Option created successfully",
            data=DropdownOptionResponse.model_validate(option),
        )

    except (HTTPException, AppException):
        raise
    except Exception:
        logger.exception("Failed to create option")
        raise HTTPException(
            status_code=500,
            detail="Failed to create option",
        )


@router.put("/options/{option_id}")
async def update_option(
    option_id: UUID,
    payload: DropdownOptionRequest,
    session: DatabaseSession,
    current_user: CurrentUser,
):
    try:
        option = await get_service(session).update_option(
            option_id,
            payload,
        )

        return SuccessResponse(
            success=True,
            message="Option updated successfully",
            data=DropdownOptionResponse.model_validate(option),
        )

    except (HTTPException, AppException):
        raise
    except Exception:
        logger.exception("Failed to update option")
        raise HTTPException(
            status_code=500,
            detail="Failed to update option",
        )


@router.delete("/options/{option_id}")
async def delete_option(
    option_id: UUID,
    session: DatabaseSession,
    current_user: CurrentUser,
):
    try:
        await get_service(session).delete_option(option_id)

        return SuccessResponse(
            success=True,
            message="Option deleted successfully",
            data={
                "deleted_id": str(option_id),
            },
        )

    except (HTTPException, AppException):
        raise
    except Exception:
        logger.exception("Failed to delete option")
        raise HTTPException(
            status_code=500,
            detail="Failed to delete option",
        )
