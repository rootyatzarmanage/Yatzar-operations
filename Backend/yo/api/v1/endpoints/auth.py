from uuid import UUID

from fastapi import APIRouter, Cookie, Depends, Header, Response
from sqlalchemy import or_, select
from sqlalchemy.orm import joinedload

from yo.core.config import settings
from yo.core.database import DatabaseSession
from yo.core.exceptions import AppException
from yo.core.security import decode_session, encode_session, verify_password
from yo.models.user import User
from yo.schemas.requests.auth import LoginRequest
from yo.schemas.responses.auth import AuthUserResponse
from yo.core.schemas.responses import SuccessResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _user_response(user: User, token: str | None = None) -> AuthUserResponse:
    return AuthUserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        employee_name=user.employee.employee_name if user.employee else None,
        display_name=user.employee.display_name if user.employee else None,
        role=user.role.name if user.role else "",
        photo=user.employee.photo if user.employee else None,
        token=token,
    )


async def _get_session_user(session: DatabaseSession, session_token: str | None) -> User:
    user_id = decode_session(session_token)
    if not user_id:
        raise AppException("Authentication is required.", 401)
    user = await session.scalar(
        select(User)
        .options(joinedload(User.employee), joinedload(User.role))
        .where(User.id == UUID(user_id), User.is_active.is_(True), User.deleted_at.is_(None))
    )
    if not user:
        raise AppException("Authentication is required.", 401)
    return user


async def get_token_from_request(
    authorization: str | None = Header(default=None),
    x_session_token: str | None = Header(default=None, alias="X-Session-Token"),
    yatzar_session: str | None = Cookie(default=None, alias=settings.SESSION_COOKIE_NAME),
) -> str | None:
    if authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            return parts[1]
        elif len(parts) == 1:
            return parts[0]
    if x_session_token:
        return x_session_token
    return yatzar_session


async def require_user(
    session: DatabaseSession,
    token: str | None = Depends(get_token_from_request),
) -> User:
    return await _get_session_user(session, token)


@router.post("/login", response_model=SuccessResponse[AuthUserResponse])
async def login(
    request: LoginRequest, response: Response, session: DatabaseSession
) -> SuccessResponse[AuthUserResponse]:
    user = await session.scalar(
        select(User)
        .options(joinedload(User.employee), joinedload(User.role))
        .where(
            or_(User.email == request.identifier.strip().lower(), User.username == request.identifier.strip()),
            User.is_active.is_(True),
            User.deleted_at.is_(None),
        )
    )
    if not user or not verify_password(request.password, user.password_hash):
        raise AppException("Invalid username/email or password.", 401)
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
    return SuccessResponse(message="Signed in successfully", data=_user_response(user, token=session_token))


@router.get("/me", response_model=SuccessResponse[AuthUserResponse])
async def current_user(
    user: User = Depends(require_user),
    token: str | None = Depends(get_token_from_request),
) -> SuccessResponse[AuthUserResponse]:
    return SuccessResponse(message="Current user retrieved successfully", data=_user_response(user, token=token))


@router.post("/logout", response_model=SuccessResponse[None])
async def logout(response: Response) -> SuccessResponse[None]:
    response.delete_cookie(settings.SESSION_COOKIE_NAME)
    return SuccessResponse(message="Signed out successfully")
