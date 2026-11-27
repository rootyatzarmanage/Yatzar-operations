"""merge mail_deliveries branch

Revision ID: dc3f0e09a17c
Revises: 20261128_email_notifications, 8f960f816f11
Create Date: 2026-11-27 15:57:39.307381

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'dc3f0e09a17c'
down_revision: Union[str, None] = ('20261128_email_notifications', '8f960f816f11')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
