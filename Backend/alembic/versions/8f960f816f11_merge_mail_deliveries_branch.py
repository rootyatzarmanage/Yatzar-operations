"""merge mail_deliveries branch

Revision ID: 8f960f816f11
Revises: 20261125_user_profile_fields, b8447a10c790
Create Date: 2026-11-27 15:44:57.718324

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8f960f816f11'
down_revision: Union[str, None] = ('20261125_user_profile_fields', 'b8447a10c790')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
