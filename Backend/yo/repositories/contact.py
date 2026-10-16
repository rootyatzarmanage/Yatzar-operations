import uuid

from sqlalchemy import and_, or_, select, func
from sqlalchemy.ext.asyncio import AsyncSession

from yo.models.contact import Contact
from yo.repositories.workspace import WorkspaceRepository
from yo.repositories.base import BaseRepository


class ContactRepository(BaseRepository[Contact]):

    def __init__(self, session: AsyncSession):
        super().__init__(Contact, session)

    @staticmethod
    def access_condition(user_id: uuid.UUID):
        return or_(
            Contact.workspace_id.in_(WorkspaceRepository.accessible_ids(user_id)),
            and_(Contact.workspace_id.is_(None), WorkspaceRepository.privileged_user(user_id)),
        )

    async def get_detail(
        self,
        contact_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Contact | None:
        query = select(Contact).where(
            Contact.id == contact_id,
            self.access_condition(user_id),
            Contact.deleted_at.is_(None),
        )

        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def list_by_stage(
        self,
        *,
        user_id: uuid.UUID,
        stage: str,
        workspace_id: uuid.UUID | None = None,
        search: str | None = None,
        page: int = 1,
        per_page: int = 5,
    ) -> dict:
        query = select(Contact).where(
            Contact.stage == stage,
            self.access_condition(user_id),
            Contact.deleted_at.is_(None),
        )

        if workspace_id is not None:
            query = query.where(Contact.workspace_id == workspace_id)

        if search:
            search_term = f"%{search.strip()}%"
            query = query.where(
                or_(
                    Contact.first_name.ilike(search_term),
                    Contact.last_name.ilike(search_term),
                    Contact.company.ilike(search_term),
                    Contact.email.ilike(search_term),
                    Contact.phone.ilike(search_term),
                )
            )

        count_query = select(func.count()).select_from(
            query.order_by(None).subquery()
        )
        count_result = await self.session.execute(count_query)
        total = count_result.scalar_one()

        query = (
            query.order_by(Contact.created_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )

        result = await self.session.execute(query)

        return {
            "items": list(result.scalars().all()),
            "total": total,
            "page": page,
            "per_page": per_page,
        }

    async def soft_delete_many(
        self,
        ids: list[uuid.UUID],
        deleted_by: uuid.UUID,
    ) -> int:
        query = select(Contact).where(
            Contact.id.in_(ids),
            self.access_condition(deleted_by),
            Contact.deleted_at.is_(None),
        )

        result = await self.session.execute(query)
        contacts = list(result.scalars().all())

        for contact in contacts:
            contact.deleted_at = func.now()
            contact.deleted_by = deleted_by

        await self.session.flush()
        return len(contacts)