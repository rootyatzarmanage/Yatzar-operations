import uuid

from yo.core.exceptions import AppException, NotFoundException
from yo.repositories.tag import TagRepository
from yo.schemas.requests.tag import TagCreateRequest, TagUpdateRequest


class TagService:

    def __init__(self, repository: TagRepository):
        self.repository = repository

    async def list_tags(self, include_inactive: bool = False):
        return await self.repository.list_tags(include_inactive)

    async def get_tag(self, tag_id: uuid.UUID):
        tag = await self.repository.get_tag(tag_id)
        if not tag:
            raise NotFoundException("Tag", str(tag_id))
        return tag

    async def create_tag(self,request: TagCreateRequest,user_id: uuid.UUID):
        name = request.name.strip()
        if not name:
            raise AppException("Tag name cannot be empty.", 400)

        existing = await self.repository.get_by_field("name", name)
        if existing:
            raise AppException("Tag name already exists.", 409)

        return await self.repository.create_tag(
            name=name,
            status=request.status,
            user_id=user_id,
        )

    async def update_tag(self,tag_id: uuid.UUID,request: TagUpdateRequest):
        tag = await self.get_tag(tag_id)
        values = request.model_dump(exclude_unset=True)

        if "name" in values:
            values["name"] = values["name"].strip()
            if not values["name"]:
                raise AppException("Tag name cannot be empty.", 400)

            existing = await self.repository.get_by_field(
                "name",
                values["name"],
            )
            if existing and existing.id != tag_id:
                raise AppException("Tag name already exists.", 409)

        return await self.repository.update_tag(tag, values)

    async def delete_tag(self,tag_id: uuid.UUID,user_id: uuid.UUID):
        tag = await self.get_tag(tag_id)
        await self.repository.delete_tag(tag, user_id)