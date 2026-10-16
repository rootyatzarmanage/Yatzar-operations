"""user permission

Revision ID: 6a5637ad4d21
Revises: 6f8a2c4d9e10
Create Date: 2026-10-17 00:31:53.461290

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6a5637ad4d21'
down_revision: Union[str, None] = '6f8a2c4d9e10'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
