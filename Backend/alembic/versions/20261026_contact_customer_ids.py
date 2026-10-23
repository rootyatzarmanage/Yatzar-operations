from alembic import op

revision = "20261026_contact_customer_ids"
down_revision = "20261025_assigned_to"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("DROP TABLE IF EXISTS public.customer_number_counters")


def downgrade():
    op.execute("""CREATE TABLE public.customer_number_counters (
        year INTEGER PRIMARY KEY,
        last_number INTEGER NOT NULL
    )""")
    op.execute("""INSERT INTO public.customer_number_counters (year, last_number)
        SELECT split_part(customer_id, '-', 2)::INTEGER,
               MAX(split_part(customer_id, '-', 3)::INTEGER)
        FROM public.contacts
        WHERE customer_id ~ '^CUS-[0-9]{4}-[0-9]+$'
        GROUP BY split_part(customer_id, '-', 2)::INTEGER""")
