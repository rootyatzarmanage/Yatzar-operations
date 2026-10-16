"""merge heads

Revision ID: 010223019a73
Revises: cbfbe398bf9f, e2f4a6b8c0d1
Create Date: 2026-10-16 15:07:12.689088

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '010223019a73'
down_revision: Union[str, None] = ('cbfbe398bf9f', 'e2f4a6b8c0d1')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
