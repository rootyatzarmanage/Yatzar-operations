"""Shared authentication dependencies; route files use typed aliases only."""
from typing import Annotated

from fastapi import Cookie, Depends, Header

from yo.core.config import settings
from yo.core.database import DatabaseSession
from yo.models.user import User
from yo.services.auth import AuthService


async def get_token_from_request(
    authorization: str | None = Header(default=None),
    x_session_token: str | None = Header(default=None, alias="X-Session-Token"),
    yatzar_session: str | None = Cookie(default=None, alias=settings.SESSION_COOKIE_NAME),
) -> str | None:
    if authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            return parts[1]
        if len(parts) == 1:
            return parts[0]
    return x_session_token or yatzar_session


SessionToken = Annotated[str | None, Depends(get_token_from_request)]


async def require_user(session: DatabaseSession, token: SessionToken) -> User:
    return await AuthService(session).get_session_user(token)


CurrentUser = Annotated[User, Depends(require_user)]
