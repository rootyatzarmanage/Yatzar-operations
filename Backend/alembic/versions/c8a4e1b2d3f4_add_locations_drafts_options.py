"""add locations, employee drafts, and dropdown options

Revision ID: c8a4e1b2d3f4
Revises: b7f3d7f0a1c2
Create Date: 2026-10-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from yo.models.base import Base
import yo.models.support  # noqa: F401


revision: str = "c8a4e1b2d3f4"
down_revision: Union[str, None] = "b7f3d7f0a1c2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    Base.metadata.create_all(bind=op.get_bind())


def downgrade() -> None:
    bind = op.get_bind()
    for table_name in ("dropdown_options", "employee_drafts", "locations"):
        # The legacy draft model is no longer part of ORM metadata.
        if sa.inspect(bind).has_table(table_name):
            sa.Table(table_name, sa.MetaData(), autoload_with=bind).drop(bind=bind)
