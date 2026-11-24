"""Add the workspace image path."""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "7c9e1a3b5d20"
down_revision: Union[str, None] = "6a5637ad4d21"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("workspaces", sa.Column("image", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("workspaces", "image")
