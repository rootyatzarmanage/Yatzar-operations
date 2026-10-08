from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from yo.core.database import DatabaseSession
from yo.core.schemas.responses import SuccessResponse
from yo.schemas.requests.employee import EmployeeCreateRequest, EmployeeUpdateRequest
from yo.schemas.responses.employee import EmployeeResponse
from yo.services.employee import EmployeeService
from yo.api.v1.endpoints.auth import require_user

router = APIRouter(prefix="/employees", tags=["Employees"], dependencies=[Depends(require_user)])


@router.post("", status_code=status.HTTP_201_CREATED, response_model=SuccessResponse[EmployeeResponse])
async def create_employee(request: EmployeeCreateRequest, session: DatabaseSession) -> SuccessResponse[EmployeeResponse]:
    employee = await EmployeeService(session).create(request)
    return SuccessResponse(message="Employee created successfully", data=EmployeeResponse.model_validate(employee))


@router.get("", response_model=SuccessResponse[List[EmployeeResponse]])
async def list_employees(session: DatabaseSession, skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100)) -> SuccessResponse[List[EmployeeResponse]]:
    employees = await EmployeeService(session).list_all(skip, limit)
    return SuccessResponse(message="Employees retrieved successfully", data=[EmployeeResponse.model_validate(item) for item in employees])


@router.get("/{employee_id}", response_model=SuccessResponse[EmployeeResponse])
async def get_employee(employee_id: UUID, session: DatabaseSession) -> SuccessResponse[EmployeeResponse]:
    employee = await EmployeeService(session).get_by_id(employee_id)
    return SuccessResponse(message="Employee retrieved successfully", data=EmployeeResponse.model_validate(employee))


@router.put("/{employee_id}", response_model=SuccessResponse[EmployeeResponse])
async def update_employee(employee_id: UUID, request: EmployeeUpdateRequest, session: DatabaseSession) -> SuccessResponse[EmployeeResponse]:
    employee = await EmployeeService(session).update(employee_id, request)
    return SuccessResponse(message="Employee updated successfully", data=EmployeeResponse.model_validate(employee))


@router.delete("/{employee_id}", response_model=SuccessResponse[dict[str, str]])
async def delete_employee(employee_id: UUID, session: DatabaseSession) -> SuccessResponse[dict[str, str]]:
    await EmployeeService(session).delete(employee_id)
    return SuccessResponse(message="Employee deleted successfully", data={"deleted_id": str(employee_id)})