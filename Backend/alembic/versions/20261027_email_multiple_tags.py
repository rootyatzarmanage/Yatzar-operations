"""Store multiple email recipient tags on the existing campaign table."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20261027_email_multiple_tags"
down_revision = "20261026_contact_customer_ids"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("email_marketing", sa.Column(
        "tag_ids", postgresql.ARRAY(postgresql.UUID(as_uuid=True)),
        nullable=False, server_default=sa.text("'{}'::uuid[]"),
    ))
    op.execute("""UPDATE email_marketing SET tag_ids = ARRAY[tag_id]
        WHERE tag_id IS NOT NULL""")


def downgrade():
    op.execute("""DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM email_marketing WHERE cardinality(tag_ids) > 1) THEN
            RAISE EXCEPTION 'Cannot downgrade campaigns containing multiple tags';
        END IF;
    END $$""")
    op.execute("UPDATE email_marketing SET tag_id = tag_ids[1]")
    op.drop_column("email_marketing", "tag_ids")
