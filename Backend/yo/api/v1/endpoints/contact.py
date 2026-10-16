import logging
from uuid import UUID

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status

from yo.core.database import DatabaseSession
from yo.core.exceptions import AppException
from yo.core.schemas.responses import SuccessResponse
from yo.core.auth.dependencies import CurrentUser
from yo.repositories.contact import ContactRepository
from yo.schemas.requests.contact import (
    ContactCreateRequest,
    ContactUpdateRequest,
    ContactBulkDeleteRequest,
)
from yo.schemas.responses.contact import (
    ContactResponse,
    ContactListResponse,
)

from yo.services.contact import ContactService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/contacts",
    tags=["Contacts"],
)


@router.get(
    "",
    response_model=SuccessResponse[ContactListResponse],
    status_code=status.HTTP_200_OK,
    summary="Get contacts, leads or customers",
)
async def list_contacts(
    session: DatabaseSession,
    current_user: CurrentUser,
    stage: str = Query(
        default="contact",
        pattern="^(contact|lead|customer)$",
    ),
    workspace_id: UUID | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=5, ge=1, le=100),
) -> SuccessResponse[ContactListResponse]:
    try:
        repository = ContactRepository(session)
        service = ContactService(repository)
        result = await service.list_by_stage(
            user_id=current_user.id, workspace_id=workspace_id,
            stage=stage,
            search=search,
            page=page,
            per_page=per_page,
        )

        items = result["items"]
        total = result["total"]
        data = ContactListResponse(
            items=[
                ContactResponse.model_validate(item)
                for item in items
            ],
            total=total,
            page=page,
            per_page=per_page,
        )

        logger.info(
            "Contact records fetched successfully",
            extra={
                "stage": stage,
                "count": len(items),
                "page": page,
            },
        )

        return SuccessResponse(
            success=True,
            message=f"{stage.title()} records fetched successfully",
            data=data,
        )
    except (HTTPException, AppException):
        raise
    except Exception:
        logger.exception("Failed to fetch contact records")
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch contact records.",
        )

@router.post(
    "/{contact_id}/image",
    response_model=SuccessResponse[ContactResponse],
    status_code=status.HTTP_200_OK,
    summary="Upload contact image",
)
async def upload_contact_image(
    contact_id: UUID,
    session: DatabaseSession,
    current_user: CurrentUser,
    file: UploadFile = File(...),
) -> SuccessResponse[ContactResponse]:
    repository = ContactRepository(session)
    service = ContactService(repository)

    contact = await service.get_by_id(contact_id, current_user.id)

    image_path = await service.save_contact_image(
        current_user.id,
        contact_id,
        file,
    )

    await repository.update_by_id(
        contact_id,
        {
            "photo": image_path,
            "updated_by": current_user.id,
        },
    )

    contact = await service.get_by_id(contact_id, current_user.id)

    return SuccessResponse(
        success=True,
        message="Contact image uploaded successfully",
        data=ContactResponse.model_validate(contact),
    )

@router.post(
    "",
    response_model=SuccessResponse[ContactResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create a contact",
)
async def create_contact(
    payload: ContactCreateRequest,
    session: DatabaseSession,
    current_user: CurrentUser
) -> SuccessResponse[ContactResponse]:
    try:
        repository = ContactRepository(session)
        service = ContactService(repository)

        contact = await service.create(payload, current_user.id)

        return SuccessResponse(
            success=True,
            message="Contact created successfully",
            data=ContactResponse.model_validate(contact),
        )
    except (HTTPException, AppException):
        raise
    except Exception:
        logger.exception("Failed to create contact")
        raise HTTPException(
            status_code=500,
            detail="Failed to create contact.",
        )


@router.get(
    "/{contact_id}",
    response_model=SuccessResponse[ContactResponse],
    status_code=status.HTTP_200_OK,
    summary="Get contact by ID",
)
async def get_contact(
    contact_id: UUID,
    session: DatabaseSession,
    current_user: CurrentUser
) -> SuccessResponse[ContactResponse]:
    try:
        repository = ContactRepository(session)
        service = ContactService(repository)

        contact = await service.get_by_id(contact_id, current_user.id)

        return SuccessResponse(
            success=True,
            message="Contact fetched successfully",
            data=ContactResponse.model_validate(contact),
        )
    except (HTTPException, AppException):
        raise
    except Exception:
        logger.exception(
            "Failed to fetch contact",
            extra={"contact_id": str(contact_id)},
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch contact.",
        )


@router.put(
    "/{contact_id}",
    response_model=SuccessResponse[ContactResponse],
    status_code=status.HTTP_200_OK,
    summary="Update a contact",
)
async def update_contact(
    contact_id: UUID,
    payload: ContactUpdateRequest,
    session: DatabaseSession,
    current_user: CurrentUser
) -> SuccessResponse[ContactResponse]:
    try:
        repository = ContactRepository(session)
        service = ContactService(repository)

        contact = await service.update(
            contact_id,
            payload,
            current_user.id,
        )

        return SuccessResponse(
            success=True,
            message="Contact updated successfully",
            data=ContactResponse.model_validate(contact),
        )
    except (HTTPException, AppException):
        raise
    except Exception:
        logger.exception(
            "Failed to update contact",
            extra={"contact_id": str(contact_id)},
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to update contact.",
        )


@router.post(
    "/{contact_id}/move-to-lead",
    response_model=SuccessResponse[ContactResponse],
    status_code=status.HTTP_200_OK,
    summary="Move contact to leads",
)
async def move_to_lead(
    contact_id: UUID,
    session: DatabaseSession,
    current_user: CurrentUser
) -> SuccessResponse[ContactResponse]:
    try:
        repository = ContactRepository(session)
        service = ContactService(repository)

        contact = await service.move_to(
            contact_id,
            "lead",
            current_user.id,
        )

        return SuccessResponse(
            success=True,
            message="Contact moved to leads successfully",
            data=ContactResponse.model_validate(contact),
        )
    except (HTTPException, AppException):
        raise
    except Exception:
        logger.exception("Failed to move contact to lead")
        raise HTTPException(
            status_code=500,
            detail="Failed to move contact to lead.",
        )


@router.post(
    "/{contact_id}/move-to-customer",
    response_model=SuccessResponse[ContactResponse],
    status_code=status.HTTP_200_OK,
    summary="Move contact to customers",
)
async def move_to_customer(
    contact_id: UUID,
    session: DatabaseSession,
    current_user: CurrentUser
) -> SuccessResponse[ContactResponse]:
    try:
        repository = ContactRepository(session)
        service = ContactService(repository)

        contact = await service.move_to(
            contact_id,
            "customer",
            current_user.id,
        )

        return SuccessResponse(
            success=True,
            message="Contact moved to customers successfully",
            data=ContactResponse.model_validate(contact),
        )
    except (HTTPException, AppException):
        raise
    except Exception:
        logger.exception("Failed to move contact to customer")
        raise HTTPException(
            status_code=500,
            detail="Failed to move contact to customer.",
        )


@router.post(
    "/bulk-delete",
    response_model=SuccessResponse[dict[str, int]],
    status_code=status.HTTP_200_OK,
    summary="Bulk delete contacts",
)
async def bulk_delete_contacts(
    payload: ContactBulkDeleteRequest,
    session: DatabaseSession,
    current_user: CurrentUser
) -> SuccessResponse[dict[str, int]]:
    try:
        repository = ContactRepository(session)
        service = ContactService(repository)

        deleted = await service.bulk_delete(
            payload.ids,
            current_user.id,
        )

        return SuccessResponse(
            success=True,
            message="Contacts deleted successfully",
            data={"deleted": deleted},
        )
    except (HTTPException, AppException):
        raise
    except Exception:
        logger.exception("Failed to bulk delete contacts")
        raise HTTPException(
            status_code=500,
            detail="Failed to bulk delete contacts.",
        )


@router.delete(
    "/{contact_id}",
    response_model=SuccessResponse[dict[str, str]],
    status_code=status.HTTP_200_OK,
    summary="Delete a contact",
)
async def delete_contact(
    contact_id: UUID,
    session: DatabaseSession,
    current_user: CurrentUser
) -> SuccessResponse[dict[str, str]]:
    try:
        repository = ContactRepository(session)
        service = ContactService(repository)

        await service.delete(contact_id, current_user.id)

        return SuccessResponse(
            success=True,
            message="Contact deleted successfully",
            data={"deleted_id": str(contact_id)},
        )
    except (HTTPException, AppException):
        raise
    except Exception:
        logger.exception("Failed to delete contact")
        raise HTTPException(
            status_code=500,
            detail="Failed to delete contact.",
        )
