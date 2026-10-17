from fastapi import APIRouter, Response

from yo.core.auth.dependencies import CurrentUser, SessionToken
from yo.core.config import settings
from yo.core.database import DatabaseSession
from yo.core.security import encode_session
from yo.models.user import User
from yo.services.auth import AuthService
from yo.services.role import RoleService
from yo.schemas.requests.auth import LoginRequest
from yo.schemas.responses.auth import AuthUserResponse
from yo.core.schemas.responses import SuccessResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


async def _user_response(user: User, session: DatabaseSession, token: str | None = None) -> AuthUserResponse:
    return AuthUserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        employee_name=user.employee.employee_name if user.employee else None,
        display_name=user.employee.display_name if user.employee else None,
        role=user.role.name if user.role else "",
        photo=user.employee.photo if user.employee else None,
        token=token,
        permissions=await RoleService(session).effective_permissions(user),
        workspaces=[
            {"id": workspace.id, "name": workspace.name}
            for workspace in user.workspaces
            if workspace.deleted_at is None and workspace.status == "Enabled"
        ],
    )


@router.post("/login", response_model=SuccessResponse[AuthUserResponse])
async def login(
    request: LoginRequest, response: Response, session: DatabaseSession
) -> SuccessResponse[AuthUserResponse]:
    user = await AuthService(session).authenticate(request)
    session_token = encode_session(str(user.id))
    response.set_cookie(
        settings.SESSION_COOKIE_NAME,
        value=session_token,
        max_age=settings.SESSION_MAX_AGE,
        httponly=True,
        path="/",
        samesite="lax",
        secure=False,
    )
    return SuccessResponse(message="Signed in successfully", data=await _user_response(user, session, token=session_token))


@router.get("/me", response_model=SuccessResponse[AuthUserResponse])
async def current_user(
    session: DatabaseSession,
    user: CurrentUser,
    token: SessionToken,
) -> SuccessResponse[AuthUserResponse]:
    return SuccessResponse(message="Current user retrieved successfully", data=await _user_response(user, session, token=token))


@router.post("/logout", response_model=SuccessResponse[None])
async def logout(response: Response) -> SuccessResponse[None]:
    response.delete_cookie(settings.SESSION_COOKIE_NAME)
    return SuccessResponse(message="Signed out successfully")
