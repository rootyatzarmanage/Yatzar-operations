from typing import List
from uuid import UUID

from fastapi import APIRouter, Query, status

from yo.core.database import DatabaseSession
from yo.core.schemas.responses import SuccessResponse
from yo.schemas.requests.person import PersonCreateRequest, PersonUpdateRequest
from yo.schemas.responses.person import PersonResponse
from yo.services.person import PersonService


router = APIRouter(prefix="/persons", tags=["Persons"])


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=SuccessResponse[PersonResponse],
)
async def create_person(
    request: PersonCreateRequest,
    session: DatabaseSession,
) -> SuccessResponse[PersonResponse]:
    person = await PersonService(session).create(request)
    return SuccessResponse(
        message="Person created successfully",
        data=PersonResponse.model_validate(person),
    )


@router.get("", response_model=SuccessResponse[List[PersonResponse]])
async def list_persons(
    session: DatabaseSession,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
) -> SuccessResponse[List[PersonResponse]]:
    persons = await PersonService(session).list_all(skip=skip, limit=limit)
    return SuccessResponse(
        message="Persons retrieved successfully",
        data=[PersonResponse.model_validate(person) for person in persons],
    )


@router.get("/{person_id}", response_model=SuccessResponse[PersonResponse])
async def get_person(
    person_id: UUID,
    session: DatabaseSession,
) -> SuccessResponse[PersonResponse]:
    person = await PersonService(session).get_by_id(person_id)
    return SuccessResponse(
        message="Person retrieved successfully",
        data=PersonResponse.model_validate(person),
    )


@router.put("/{person_id}", response_model=SuccessResponse[PersonResponse])
async def update_person(
    person_id: UUID,
    request: PersonUpdateRequest,
    session: DatabaseSession,
) -> SuccessResponse[PersonResponse]:
    person = await PersonService(session).update(person_id, request)
    return SuccessResponse(
        message="Person updated successfully",
        data=PersonResponse.model_validate(person),
    )


@router.delete("/{person_id}", response_model=SuccessResponse[dict[str, str]])
async def delete_person(
    person_id: UUID,
    session: DatabaseSession,
) -> SuccessResponse[dict[str, str]]:
    await PersonService(session).delete(person_id)
    return SuccessResponse(
        message="Person deleted successfully",
        data={"deleted_id": str(person_id)},
    )
