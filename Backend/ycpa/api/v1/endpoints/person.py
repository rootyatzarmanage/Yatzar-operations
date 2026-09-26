from uuid import UUID
from typing import List
from fastapi import APIRouter, Query, status
from ycpa.core.database import DatabaseSession
from ycpa.core.schemas.responses import SuccessResponse
from ycpa.schemas.person import (
    PersonCreateRequest,
    PersonUpdateRequest,
    PersonResponse,
)
from ycpa.services.person import PersonService

router = APIRouter(prefix="/persons", tags=["Persons"])


@router.post("", status_code=status.HTTP_201_CREATED, response_model=SuccessResponse[PersonResponse])
async def create_person(
    body: PersonCreateRequest,
    session: DatabaseSession
):
    """
    Step 1: Endpoint receives HTTP POST request
    Step 2: Request schema validates name, age, phno
    Step 3: Service executes business logic
    Step 4: Repository runs DB queries
    Step 5: Returns SuccessResponse
    """
    person = await PersonService(session).create(body)
    return SuccessResponse(
        message="Person created successfully",
        data=PersonResponse.model_validate(person)
    )


@router.get("", response_model=SuccessResponse[List[PersonResponse]])
async def list_persons(
    session: DatabaseSession,
    skip: int = Query(0, ge=0, description="Offset for pagination"),
    limit: int = Query(50, ge=1, le=100, description="Max items to retrieve")
):
    """Retrieve all persons with pagination."""
    persons = await PersonService(session).list_all(skip=skip, limit=limit)
    return SuccessResponse(
        message="Persons retrieved successfully",
        data=[PersonResponse.model_validate(p) for p in persons]
    )


@router.get("/{person_id}", response_model=SuccessResponse[PersonResponse])
async def get_person(
    person_id: UUID,
    session: DatabaseSession
):
    """Retrieve a single person by their UUID."""
    person = await PersonService(session).get_by_id(person_id)
    return SuccessResponse(
        message="Person retrieved successfully",
        data=PersonResponse.model_validate(person)
    )


@router.put("/{person_id}", response_model=SuccessResponse[PersonResponse])
async def update_person(
    person_id: UUID,
    body: PersonUpdateRequest,
    session: DatabaseSession
):
    """Update name, age, and/or phno for an existing person."""
    person = await PersonService(session).update(person_id, body)
    return SuccessResponse(
        message="Person updated successfully",
        data=PersonResponse.model_validate(person)
    )


@router.delete("/{person_id}", response_model=SuccessResponse[dict])
async def delete_person(
    person_id: UUID,
    session: DatabaseSession
):
    """Delete a person by their UUID."""
    await PersonService(session).delete(person_id)
    return SuccessResponse(
        message="Person deleted successfully",
        data={"deleted_id": str(person_id)}
    )
