"""merge heads

Revision ID: cbfbe398bf9f
Revises: acd0abdac0b3, d4e5f6a7b8c9, d9e8f7a6b5c4
Create Date: 2026-10-15 21:02:47.311546

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cbfbe398bf9f'
down_revision: Union[str, None] = ('acd0abdac0b3', 'd4e5f6a7b8c9', 'd9e8f7a6b5c4')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
