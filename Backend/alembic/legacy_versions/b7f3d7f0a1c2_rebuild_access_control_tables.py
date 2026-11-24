"""rebuild users and access-control tables with audit fields

Revision ID: b7f3d7f0a1c2
Revises: 9ccd0fcb23d2
Create Date: 2026-10-01

"""
from typing import Sequence, Union

from alembic import op

from yo.models.base import Base
import yo.models.employee  # noqa: F401
import yo.models.permission  # noqa: F401
import yo.models.user  # noqa: F401


revision: str = "b7f3d7f0a1c2"
down_revision: Union[str, None] = "9ccd0fcb23d2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind)
    Base.metadata.create_all(bind=bind)


def downgrade() -> None:
    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind)
