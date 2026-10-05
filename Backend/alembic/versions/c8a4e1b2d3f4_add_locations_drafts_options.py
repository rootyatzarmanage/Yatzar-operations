"""add locations, employee drafts, and dropdown options

Revision ID: c8a4e1b2d3f4
Revises: b7f3d7f0a1c2
Create Date: 2026-10-01

"""
from typing import Sequence, Union

from alembic import op

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
        Base.metadata.tables[table_name].drop(bind=bind)
