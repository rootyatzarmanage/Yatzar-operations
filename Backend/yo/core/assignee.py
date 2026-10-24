from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from yo.models.user import User
from yo.repositories.workspace import WorkspaceRepository


async def validate_assignee(session: AsyncSession, assigned_to: UUID | None, workspace_id: UUID | None) -> None:
    """The assignee must be an active user who can access the record's workspace."""
    if assigned_to is None:
        return
    user_id = await session.scalar(select(User.id).where(
        User.id == assigned_to, User.is_active.is_(True), User.deleted_at.is_(None),
    ))
    if user_id is None or workspace_id is None or not await WorkspaceRepository(session).user_has_workspace(
        assigned_to, workspace_id,
    ):
        raise HTTPException(400, "Assigned user does not exist or has no access to this workspace.")
