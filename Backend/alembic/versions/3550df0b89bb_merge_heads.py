"""merge heads

Revision ID: 3550df0b89bb
Revises: c8a4e1b2d3f4
Create Date: 2026-10-03 14:27:48.179643

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3550df0b89bb'
down_revision: Union[str, None] = 'c8a4e1b2d3f4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
