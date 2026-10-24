"""add mail deliveries and scheduling

Revision ID: b8447a10c790
Revises: 20261027_email_multiple_tags
Create Date: 2026-10-23 12:45:49.862342

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'b8447a10c790'
down_revision: Union[str, None] = '20261027_email_multiple_tags'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('mail_deliveries',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('delivery_key', sa.String(length=64), nullable=False),
    sa.Column('workspace_id', sa.Uuid(), nullable=True),
    sa.Column('source_type', sa.String(length=30), nullable=False),
    sa.Column('source_id', sa.Uuid(), nullable=False),
    sa.Column('recipient', sa.String(length=320), nullable=False),
    sa.Column('subject', sa.String(length=500), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('attempts', sa.Integer(), nullable=False),
    sa.Column('last_error', sa.String(length=500), nullable=True),
    sa.Column('next_attempt_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('delivery_key')
    )
    op.create_index(op.f('ix_mail_deliveries_source_id'), 'mail_deliveries', ['source_id'], unique=False)
    op.create_index(op.f('ix_mail_deliveries_workspace_id'), 'mail_deliveries', ['workspace_id'], unique=False)
    op.add_column('contacts', sa.Column('customer_id', sa.String(length=40), nullable=True))
    op.create_index('uq_contacts_customer_id', 'contacts', ['customer_id'], unique=True)
    op.add_column('email_marketing', sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index(op.f('ix_email_marketing_scheduled_at'), 'email_marketing', ['scheduled_at'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_email_marketing_scheduled_at'), table_name='email_marketing')
    op.drop_column('email_marketing', 'scheduled_at')
    op.drop_index('uq_contacts_customer_id', table_name='contacts')
    op.drop_column('contacts', 'customer_id')
    op.drop_index(op.f('ix_mail_deliveries_workspace_id'), table_name='mail_deliveries')
    op.drop_index(op.f('ix_mail_deliveries_source_id'), table_name='mail_deliveries')
    op.drop_table('mail_deliveries')