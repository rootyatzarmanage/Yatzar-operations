import uuid
from datetime import datetime, timezone

from sqlalchemy import String, cast, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from yo.repositories.workspace import WorkspaceRepository

from yo.models.call import Call
from yo.models.contact import Contact
from yo.repositories.contact import ContactRepository


class CallRepository:
    def __init__(self, session: AsyncSession, workspace_id: uuid.UUID | None):
        self.session = session
        self.workspace_id = workspace_id

    def access_condition(self, user_id: uuid.UUID):
        return select(Contact.id).where(
            Contact.id == Call.contact_id, Contact.deleted_at.is_(None),
            ContactRepository.access_condition(user_id),
            Contact.workspace_id == Call.workspace_id,
        ).exists()

    async def get_contact(self, contact_id: uuid.UUID, user_id: uuid.UUID):
        result = await self.session.execute(
            select(Contact).where(
                Contact.id == contact_id,
                ContactRepository.access_condition(user_id),
                Contact.workspace_id == self.workspace_id,
                Contact.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def get_call(self, call_id: uuid.UUID, user_id: uuid.UUID):
        result = await self.session.execute(
            select(Call).where(
                Call.id == call_id,
                self.access_condition(user_id),
                Call.deleted_at.is_(None),
                Call.workspace_id == self.workspace_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_calls(
        self,
        user_id: uuid.UUID,
        search: str | None = None,
        page: int = 1,
        per_page: int = 5,
        call_id: uuid.UUID | None = None,
    ) -> dict:
        conditions = [
            Call.deleted_at.is_(None),
            WorkspaceRepository.scope_condition(Call.workspace_id, user_id, self.workspace_id),
            self.access_condition(user_id),
        ]

        if call_id is not None:
            conditions.append(Call.id == call_id)

        if search and search.strip():
            term = f"%{search.strip()}%"

            contact_exists = (
                select(Contact.id)
                .where(
                    Contact.id == Call.contact_id,
                    Contact.deleted_at.is_(None),
                    or_(
                        Contact.first_name.ilike(term),
                        Contact.last_name.ilike(term),
                        Contact.company.ilike(term),
                    ),
                )
                .exists()
            )

            conditions.append(
                or_(
                    Call.subject.ilike(term),
                    Call.call_type.ilike(term),
                    Call.call_status.ilike(term),
                    Call.related_to.ilike(term),
                    Call.call_purpose.ilike(term),
                    Call.call_agenda.ilike(term),
                    cast(Call.contact_id, String).ilike(term),
                    contact_exists,
                )
            )

        total_result = await self.session.execute(
            select(func.count(Call.id)).where(*conditions)
        )
        total = total_result.scalar_one()

        result = await self.session.execute(
            select(Call)
            .where(*conditions)
            .order_by(Call.call_start_time.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )

        return {
            "items": list(result.scalars().all()),
            "total": total,
            "page": page,
            "per_page": per_page,
        }

    async def create_call(self, values: dict) -> Call:
        call = Call(**values)
        self.session.add(call)
        await self.session.flush()
        await self.session.refresh(call)
        return call

    async def update_call(self, call: Call, values: dict) -> Call:
        for key, value in values.items():
            setattr(call, key, value)

        await self.session.flush()
        await self.session.refresh(call)
        return call

    async def soft_delete_call(
        self,
        call: Call,
        user_id: uuid.UUID,
    ) -> None:
        call.deleted_at = datetime.now(timezone.utc)
        call.deleted_by = user_id
        await self.session.flush()
