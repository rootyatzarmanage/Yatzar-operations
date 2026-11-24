"""allow uploaded profile photos to be stored as data URLs

Revision ID: d4e5f6a7b8c9
Revises: c8a4e1b2d3f4
"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy import String, Text


revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, None] = "c8a4e1b2d3f4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("employees", "photo", type_=Text(), existing_type=String(length=500))


def downgrade() -> None:
    op.alter_column("employees", "photo", type_=String(length=500), existing_type=Text())
