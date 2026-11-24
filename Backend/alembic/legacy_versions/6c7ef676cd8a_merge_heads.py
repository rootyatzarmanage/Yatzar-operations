"""merge heads

Revision ID: 6c7ef676cd8a
Revises: 8d2f4a6c9b10
Create Date: 2026-10-17 09:15:54.858024

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6c7ef676cd8a'
down_revision: Union[str, None] = '8d2f4a6c9b10'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
