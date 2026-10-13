import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from yo.models.tag import Tag
from yo.repositories.base import BaseRepository


class TagRepository(BaseRepository[Tag]):

    def __init__(self, session: AsyncSession):
        super().__init__(Tag, session)

    async def list_tags(self,include_inactive: bool = False,) -> list[Tag]:
        query = select(Tag).where(Tag.deleted_at.is_(None))
        if not include_inactive:
            query = query.where(Tag.status == 1)
        query = query.order_by(Tag.name.asc())
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_tag(self, tag_id: uuid.UUID) -> Tag | None:
        query = select(Tag).where(
            Tag.id == tag_id,
            Tag.deleted_at.is_(None),
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def create_tag(self,name: str,status: int,user_id: uuid.UUID,) -> Tag:
        tag = Tag(
            name=name.strip(),
            status=status,
            created_by=user_id,
        )
        self.session.add(tag)
        await self.session.flush()
        return tag

    async def update_tag(self,tag: Tag,values: dict,) -> Tag:
        for key, value in values.items():
            setattr(tag, key, value)

        await self.session.flush()
        return tag

    async def delete_tag(self,tag: Tag,user_id: uuid.UUID,) -> None:
        tag.deleted_at = datetime.now(timezone.utc)
        tag.deleted_by = user_id
        tag.status = 0
        await self.session.flush()