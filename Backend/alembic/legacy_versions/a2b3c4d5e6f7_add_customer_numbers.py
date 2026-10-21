from alembic import op

revision = "a2b3c4d5e6f7"
down_revision = "f1a2b3c4d5e6"
branch_labels = None
depends_on = None

STATEMENTS = (
    "ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS customer_id VARCHAR(40)",
    """CREATE TABLE IF NOT EXISTS public.customer_number_counters (
        year INTEGER PRIMARY KEY,
        last_number INTEGER NOT NULL
    )""",
    "LOCK TABLE public.contacts IN ACCESS EXCLUSIVE MODE",
    "LOCK TABLE public.customer_number_counters IN ACCESS EXCLUSIVE MODE",
    "CREATE UNIQUE INDEX IF NOT EXISTS uq_contacts_customer_id ON public.contacts (customer_id)",
    """INSERT INTO public.customer_number_counters AS counters (year, last_number)
    SELECT split_part(customer_id, '-', 2)::INTEGER,
           MAX(split_part(customer_id, '-', 3)::INTEGER)
    FROM public.contacts
    WHERE customer_id ~ '^CUS-[0-9]{4}-[0-9]+$'
    GROUP BY split_part(customer_id, '-', 2)::INTEGER
    ON CONFLICT (year) DO UPDATE
    SET last_number = GREATEST(counters.last_number, EXCLUDED.last_number)""",
    """WITH config AS (
        SELECT EXTRACT(YEAR FROM CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::INTEGER AS year
    ), numbered AS (
        SELECT c.id, config.year,
               COALESCE(counter.last_number, 0) +
               ROW_NUMBER() OVER (ORDER BY c.created_at NULLS LAST, c.id) AS number
        FROM public.contacts c
        CROSS JOIN config
        LEFT JOIN public.customer_number_counters counter ON counter.year = config.year
        WHERE c.stage = 'customer' AND c.customer_id IS NULL
    )
    UPDATE public.contacts c
    SET customer_id = 'CUS-' || numbered.year::TEXT || '-' ||
        LPAD(numbered.number::TEXT, GREATEST(4, LENGTH(numbered.number::TEXT)), '0')
    FROM numbered WHERE c.id = numbered.id""",
    """INSERT INTO public.customer_number_counters AS counters (year, last_number)
    SELECT split_part(customer_id, '-', 2)::INTEGER,
           MAX(split_part(customer_id, '-', 3)::INTEGER)
    FROM public.contacts
    WHERE customer_id ~ '^CUS-[0-9]{4}-[0-9]+$'
    GROUP BY split_part(customer_id, '-', 2)::INTEGER
    ON CONFLICT (year) DO UPDATE
    SET last_number = GREATEST(counters.last_number, EXCLUDED.last_number)""",
)


def upgrade():
    for statement in STATEMENTS:
        op.execute(statement)


def downgrade():
    op.drop_index("uq_contacts_customer_id", table_name="contacts", schema="public")
    op.drop_column("contacts", "customer_id", schema="public")
    op.drop_table("customer_number_counters", schema="public")
