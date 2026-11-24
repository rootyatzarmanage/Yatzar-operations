"""merge heads

Revision ID: acd0abdac0b3
Revises: 3550df0b89bb
Create Date: 2026-10-03 14:31:45.792281

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'acd0abdac0b3'
down_revision: Union[str, None] = '3550df0b89bb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
