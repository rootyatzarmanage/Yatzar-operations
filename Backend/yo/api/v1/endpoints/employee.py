import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from yo.core.auth.dependencies import CurrentUser
from yo.core.auth.permissions import require_permission, require_workspace_admin, is_workspace_admin
from yo.core.database.dependencies import DatabaseSession
from yo.core.schemas.responses import SuccessResponse
from yo.repositories.employee import EmployeeRepository
from yo.schemas.requests.employee import (
    EmployeeCreateRequest,
    EmployeeDraftRequest,
    EmployeeUpdateRequest,
)
from yo.schemas.responses.employee import (
    EmployeeCodeResponse,
    EmployeeListResponse,
    EmployeeResponse,
)
from yo.services.employee import EmployeeService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/employees", tags=["Employees"])


def get_service(session: DatabaseSession) -> EmployeeService:
    return EmployeeService(EmployeeRepository(session))


def employee_data(result, current_user):
    data = (EmployeeListResponse.model_validate(result) if isinstance(result, dict)
            else EmployeeResponse.model_validate(result))
    if not is_workspace_admin(current_user):
        allowed = {
            workspace.id for workspace in current_user.workspaces
            if workspace.deleted_at is None and workspace.status == "Enabled"
        }
        items = data.items if isinstance(data, EmployeeListResponse) else [data]
        for item in items:
            item.workspaces = [workspace for workspace in item.workspaces if workspace.id in allowed]
    return data


@router.get("/codes", response_model=SuccessResponse[EmployeeCodeResponse], dependencies=[Depends(require_permission("teams", "view"))])
async def get_employee_codes(session: DatabaseSession, current_user: CurrentUser):
    try:
        codes = await get_service(session).get_employee_codes()
        return SuccessResponse(
            success=True, message="Employee codes retrieved successfully",
            data=EmployeeCodeResponse(employee_codes=codes),
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to retrieve employee codes")
        raise HTTPException(status_code=500, detail="Failed to retrieve employee codes")


@router.get("/drafts", response_model=SuccessResponse[EmployeeResponse | EmployeeListResponse], dependencies=[Depends(require_permission("teams", "view"))])
async def get_employee_drafts(
    session: DatabaseSession,
    current_user: CurrentUser,
    employee_id: UUID | None = Query(default=None),
    employee_code: str | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=5, ge=1, le=100),
):
    try:
        result = await get_service(session).get_drafts(
            employee_id=employee_id, employee_code=employee_code,
            search=search, page=page, per_page=per_page,
        )
        if employee_id is not None or employee_code is not None:
            data = employee_data(result, current_user)
            message = "Employee draft retrieved successfully"
        else:
            data = employee_data(result, current_user)
            message = "Employee drafts retrieved successfully"
        return SuccessResponse(success=True, message=message, data=data)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to retrieve employee drafts")
        raise HTTPException(status_code=500, detail="Failed to retrieve employee drafts")


@router.post("/draft", status_code=status.HTTP_201_CREATED, response_model=SuccessResponse[EmployeeResponse], dependencies=[Depends(require_permission("teams", "create"))])
async def create_employee_draft(
    request: EmployeeDraftRequest, session: DatabaseSession, current_user: CurrentUser,
):
    if request.workspace_ids and not is_workspace_admin(current_user):
        raise HTTPException(403, "Only administrators can assign workspaces.")
    try:
        employee = await get_service(session).create_draft(request, current_user.id)
        return SuccessResponse(
            success=True, message="Employee draft saved successfully",
            data=employee_data(employee, current_user),
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to create employee draft")
        raise HTTPException(status_code=500, detail="Failed to create employee draft")


@router.post("", status_code=status.HTTP_201_CREATED, response_model=SuccessResponse[EmployeeResponse], dependencies=[Depends(require_permission("teams", "create")), Depends(require_workspace_admin)])
async def create_employee(
    request: EmployeeCreateRequest, session: DatabaseSession, current_user: CurrentUser,
):
    try:
        employee = await get_service(session).create_employee(request, current_user.id)
        return SuccessResponse(
            success=True, message="Employee created successfully",
            data=employee_data(employee, current_user),
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to create employee")
        raise HTTPException(status_code=500, detail="Failed to create employee")


@router.get("", response_model=SuccessResponse[EmployeeResponse | EmployeeListResponse], dependencies=[Depends(require_permission("teams", "view"))])
async def get_employees(
    session: DatabaseSession,
    current_user: CurrentUser,
    employee_id: UUID | None = Query(default=None),
    employee_code: str | None = Query(default=None),
    search: str | None = Query(default=None),
    status: int | None = Query(default=None, ge=0, le=1),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=5, ge=1, le=100),
):
    try:
        service = get_service(session)
        if employee_id is not None or employee_code is not None:
            employee = await service.get_employee(
                employee_id=employee_id, employee_code=employee_code, status=status,
            )
            data = employee_data(employee, current_user)
            message = "Employee retrieved successfully"
        else:
            result = await service.list_employees(
                search=search, status=status, page=page, per_page=per_page,
            )
            data = employee_data(result, current_user)
            message = "Employees retrieved successfully"
        return SuccessResponse(success=True, message=message, data=data)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to retrieve employees")
        raise HTTPException(status_code=500, detail="Failed to retrieve employees")


@router.put("/{employee_id}", response_model=SuccessResponse[EmployeeResponse], dependencies=[Depends(require_permission("teams", "update"))])
async def update_employee(
    employee_id: UUID, request: EmployeeUpdateRequest,
    session: DatabaseSession, current_user: CurrentUser,
):
    if not is_workspace_admin(current_user) and (
        request.model_fields_set & (EmployeeService.ACCOUNT_FIELDS | {"workspace_ids"})
    ):
        raise HTTPException(403, "Only administrators can change accounts or workspace assignments.")
    try:
        employee = await get_service(session).update_employee(employee_id, request, current_user.id)
        return SuccessResponse(
            success=True, message="Employee updated successfully",
            data=employee_data(employee, current_user),
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to update employee")
        raise HTTPException(status_code=500, detail="Failed to update employee")


@router.put("/{employee_id}/save", response_model=SuccessResponse[EmployeeResponse], dependencies=[Depends(require_permission("teams", "update")), Depends(require_workspace_admin)])
async def save_employee_draft(
    employee_id: UUID, request: EmployeeCreateRequest,
    session: DatabaseSession, current_user: CurrentUser,
):
    try:
        employee = await get_service(session).save_draft(employee_id, request, current_user.id)
        return SuccessResponse(
            success=True, message="Employee draft saved as employee successfully",
            data=employee_data(employee, current_user),
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to save employee draft")
        raise HTTPException(status_code=500, detail="Failed to save employee draft")


@router.delete("/{employee_id}", response_model=SuccessResponse[dict[str, str]], dependencies=[Depends(require_permission("teams", "delete"))])
async def delete_employee(
    employee_id: UUID, session: DatabaseSession, current_user: CurrentUser,
):
    try:
        await get_service(session).delete_employee(employee_id, current_user.id)
        return SuccessResponse(
            success=True, message="Employee deleted successfully",
            data={"deleted_id": str(employee_id)},
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to delete employee")
        raise HTTPException(status_code=500, detail="Failed to delete employee")
