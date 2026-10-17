from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '22ba85f62106'
down_revision: Union[str, None] = 'af2e8fcf6a31'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "employee_workspaces",
        sa.Column(
            "employee_id",
            sa.Uuid(),
            nullable=False,
        ),
        sa.Column(
            "workspace_id",
            sa.Uuid(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["employee_id"],
            ["employees.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["workspace_id"],
            ["workspaces.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint(
            "employee_id",
            "workspace_id",
        ),
    )



def downgrade() -> None:
    op.drop_table("employee_workspaces")