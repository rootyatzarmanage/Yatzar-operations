"""create_persons_table

Revision ID: 9ccd0fcb23d2
Revises: 
Create Date: 2026-09-26 20:30:44.922755

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9ccd0fcb23d2'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'persons',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('age', sa.Integer(), nullable=False),
        sa.Column('phone_number', sa.String(length=20), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('deleted_by', sa.Uuid(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_persons_name', 'persons', ['name'], unique=False)
    op.create_index('ix_persons_phone_number', 'persons', ['phone_number'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_persons_phone_number', table_name='persons')
    op.drop_index('ix_persons_name', table_name='persons')
    op.drop_table('persons')
