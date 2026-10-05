from typing import Any, List
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from yo.core.database import DatabaseSession
from yo.core.schemas.responses import SuccessResponse
from yo.models.support import DropdownOption, EmployeeDraft, Location
from yo.schemas.requests.support import DraftRequest, DropdownOptionRequest

router = APIRouter(tags=["Support data"])


@router.get("/locations/countries", response_model=SuccessResponse[List[str]])
async def list_countries(session: DatabaseSession) -> SuccessResponse[List[str]]:
    result = await session.execute(select(Location.name).where(Location.kind == "country", Location.deleted_at.is_(None)).order_by(Location.name))
    return SuccessResponse(message="Countries retrieved successfully", data=list(result.scalars().all()))


async def child_locations(session, parent_name: str, kind: str) -> list[str]:
    parent = await session.scalar(select(Location).where(Location.name == parent_name, Location.deleted_at.is_(None)))
    if not parent:
        return []
    result = await session.execute(select(Location.name).where(Location.parent_id == parent.id, Location.kind == kind, Location.deleted_at.is_(None)).order_by(Location.name))
    return list(result.scalars().all())


@router.get("/locations/states", response_model=SuccessResponse[List[str]])
async def list_states(session: DatabaseSession, country: str = Query(..., min_length=1)) -> SuccessResponse[List[str]]:
    return SuccessResponse(message="States retrieved successfully", data=await child_locations(session, country, "state"))


@router.get("/locations/districts", response_model=SuccessResponse[List[str]])
async def list_districts(session: DatabaseSession, state: str = Query(..., min_length=1)) -> SuccessResponse[List[str]]:
    return SuccessResponse(message="Districts retrieved successfully", data=await child_locations(session, state, "district"))


@router.get("/options/{kind}", response_model=SuccessResponse[List[dict[str, Any]]])
async def list_options(kind: str, session: DatabaseSession) -> SuccessResponse[List[dict[str, Any]]]:
    result = await session.execute(select(DropdownOption).where(DropdownOption.kind == kind, DropdownOption.deleted_at.is_(None)).order_by(DropdownOption.value))
    return SuccessResponse(message="Options retrieved successfully", data=[{"id": item.id, "value": item.value} for item in result.scalars().all()])


@router.post("/options/{kind}", status_code=status.HTTP_201_CREATED, response_model=SuccessResponse[dict[str, Any]])
async def create_option(kind: str, request: DropdownOptionRequest, session: DatabaseSession) -> SuccessResponse[dict[str, Any]]:
    exists = await session.scalar(select(DropdownOption).where(DropdownOption.kind == kind, DropdownOption.value == request.value, DropdownOption.deleted_at.is_(None)))
    if exists:
        raise HTTPException(status_code=409, detail="That option already exists.")
    option = DropdownOption(kind=kind, value=request.value.strip())
    session.add(option)
    await session.flush()
    return SuccessResponse(message="Option created successfully", data={"id": option.id, "value": option.value})


@router.put("/options/{option_id}", response_model=SuccessResponse[dict[str, Any]])
async def update_option(option_id: UUID, request: DropdownOptionRequest, session: DatabaseSession) -> SuccessResponse[dict[str, Any]]:
    option = await session.scalar(select(DropdownOption).where(DropdownOption.id == option_id, DropdownOption.deleted_at.is_(None)))
    if not option:
        raise HTTPException(status_code=404, detail="Option not found.")
    option.value = request.value.strip()
    await session.flush()
    return SuccessResponse(message="Option updated successfully", data={"id": option.id, "value": option.value})


@router.delete("/options/{option_id}", response_model=SuccessResponse[dict[str, str]])
async def delete_option(option_id: UUID, session: DatabaseSession) -> SuccessResponse[dict[str, str]]:
    option = await session.scalar(select(DropdownOption).where(DropdownOption.id == option_id, DropdownOption.deleted_at.is_(None)))
    if not option:
        raise HTTPException(status_code=404, detail="Option not found.")
    from datetime import datetime, timezone
    option.deleted_at = datetime.now(timezone.utc)
    await session.flush()
    return SuccessResponse(message="Option deleted successfully", data={"deleted_id": str(option_id)})


@router.post("/employee-drafts", status_code=status.HTTP_201_CREATED, response_model=SuccessResponse[dict[str, Any]])
async def create_draft(request: DraftRequest, session: DatabaseSession) -> SuccessResponse[dict[str, Any]]:
    draft = EmployeeDraft(data=request.data)
    session.add(draft)
    await session.flush()
    return SuccessResponse(message="Employee draft saved successfully", data={"id": draft.id, "data": draft.data})


@router.get("/employee-drafts", response_model=SuccessResponse[List[dict[str, Any]]])
async def list_drafts(session: DatabaseSession) -> SuccessResponse[List[dict[str, Any]]]:
    result = await session.execute(select(EmployeeDraft).where(EmployeeDraft.deleted_at.is_(None)).order_by(EmployeeDraft.updated_at.desc()))
    return SuccessResponse(message="Employee drafts retrieved successfully", data=[{"id": draft.id, "data": draft.data, "updated_at": draft.updated_at} for draft in result.scalars().all()])


@router.put("/employee-drafts/{draft_id}", response_model=SuccessResponse[dict[str, Any]])
async def update_draft(draft_id: UUID, request: DraftRequest, session: DatabaseSession) -> SuccessResponse[dict[str, Any]]:
    draft = await session.scalar(select(EmployeeDraft).where(EmployeeDraft.id == draft_id, EmployeeDraft.deleted_at.is_(None)))
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found.")
    draft.data = request.data
    await session.flush()
    return SuccessResponse(message="Employee draft updated successfully", data={"id": draft.id, "data": draft.data})