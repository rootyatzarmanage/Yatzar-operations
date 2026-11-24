"""Consolidated schema baseline, preserving existing application data.

The JSON snapshot is frozen with this revision. It deliberately does not import
live ORM models: future model changes belong in subsequent migrations.
"""
import json
from pathlib import Path

from alembic import context, op
import sqlalchemy as sa

revision = "20261017_baseline"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    snapshot = json.loads(Path(__file__).parents[1].joinpath("baseline_schema_20261017.json").read_text())
    offline = context.is_offline_mode()
    bind = None if offline else op.get_bind()
    op.execute("SET LOCAL search_path TO public")
    # Fresh databases receive the complete schema; existing tables are retained.
    for table in snapshot:
        op.execute(table["create"])
    if not offline:
        for table in snapshot:
            existing = {c["name"] for c in sa.inspect(bind).get_columns(table["name"])}
            for column in table["columns"]:
                if column["name"] not in existing:
                    # Never fabricate missing required business data. PostgreSQL
                    # rejects a new NOT NULL column on populated legacy tables
                    # unless the frozen definition has a safe server default.
                    op.execute(f'ALTER TABLE "{table["name"]}" ADD COLUMN {column["definition"]}')
        # Preserve saved employee rows while accommodating the draft workflow.
        op.execute("ALTER TABLE employees ALTER COLUMN photo TYPE TEXT")
        op.execute("ALTER TABLE employees ALTER COLUMN status SET DEFAULT 0")
        for column in next(t for t in snapshot if t["name"] == "employees")["columns"]:
            if "NOT NULL" not in column["definition"]:
                op.execute(f'ALTER TABLE employees ALTER COLUMN "{column["name"]}" DROP NOT NULL')
        for table in snapshot:
            inspector = sa.inspect(bind)
            primary_key = inspector.get_pk_constraint(table["name"])["constrained_columns"]
            if list(primary_key or []) != table["primary_key"]:
                raise RuntimeError(f'Unexpected primary key on {table["name"]}; baseline aborted without dropping data.')
            for constraint in table["constraints"]:
                kind = constraint["kind"]
                if kind == "ForeignKeyConstraint":
                    present = any(c["constrained_columns"] == constraint["columns"] and c["referred_table"] == constraint["target"]
                                  for c in inspector.get_foreign_keys(table["name"]))
                elif kind == "UniqueConstraint":
                    present = any(c["column_names"] == constraint["columns"] for c in inspector.get_unique_constraints(table["name"]))
                    present = present or any(c["unique"] and c["column_names"] == constraint["columns"]
                                              for c in inspector.get_indexes(table["name"]))
                else:
                    present = any(c["name"] == constraint["name"] for c in inspector.get_check_constraints(table["name"]))
                if not present:
                    op.execute(constraint["sql"])
    for table in snapshot:
        for index in table["indexes"]:
            op.execute(index["sql"])
    # Backfill only employee assignments that were already explicitly stored.
    op.execute("""INSERT INTO user_workspaces (user_id, workspace_id)
        SELECT DISTINCT e.user_id, ew.workspace_id
        FROM employee_workspaces ew JOIN employees e ON e.id = ew.employee_id
        WHERE e.user_id IS NOT NULL
        ON CONFLICT (user_id, workspace_id) DO NOTHING""")
    for statement in CUSTOMER_NUMBERS:
        op.execute(statement)


def downgrade():
    raise RuntimeError("The consolidated baseline cannot be downgraded destructively. Restore a database backup instead.")


CUSTOMER_NUMBERS = ('ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS customer_id VARCHAR(40)',
 'CREATE TABLE IF NOT EXISTS public.customer_number_counters (\n'
 '        year INTEGER PRIMARY KEY,\n'
 '        last_number INTEGER NOT NULL\n'
 '    )',
 'LOCK TABLE public.contacts IN ACCESS EXCLUSIVE MODE',
 'LOCK TABLE public.customer_number_counters IN ACCESS EXCLUSIVE MODE',
 'CREATE UNIQUE INDEX IF NOT EXISTS uq_contacts_customer_id ON public.contacts (customer_id)',
 'INSERT INTO public.customer_number_counters AS counters (year, last_number)\n'
 "    SELECT split_part(customer_id, '-', 2)::INTEGER,\n"
 "           MAX(split_part(customer_id, '-', 3)::INTEGER)\n"
 '    FROM public.contacts\n'
 "    WHERE customer_id ~ '^CUS-[0-9]{4}-[0-9]+$'\n"
 "    GROUP BY split_part(customer_id, '-', 2)::INTEGER\n"
 '    ON CONFLICT (year) DO UPDATE\n'
 '    SET last_number = GREATEST(counters.last_number, EXCLUDED.last_number)',
 'WITH config AS (\n'
 "        SELECT EXTRACT(YEAR FROM CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::INTEGER AS "
 'year\n'
 '    ), numbered AS (\n'
 '        SELECT c.id, config.year,\n'
 '               COALESCE(counter.last_number, 0) +\n'
 '               ROW_NUMBER() OVER (ORDER BY c.created_at NULLS LAST, c.id) AS number\n'
 '        FROM public.contacts c\n'
 '        CROSS JOIN config\n'
 '        LEFT JOIN public.customer_number_counters counter ON counter.year = config.year\n'
 "        WHERE c.stage = 'customer' AND c.customer_id IS NULL\n"
 '    )\n'
 '    UPDATE public.contacts c\n'
 "    SET customer_id = 'CUS-' || numbered.year::TEXT || '-' ||\n"
 "        LPAD(numbered.number::TEXT, GREATEST(4, LENGTH(numbered.number::TEXT)), '0')\n"
 '    FROM numbered WHERE c.id = numbered.id',
 'INSERT INTO public.customer_number_counters AS counters (year, last_number)\n'
 "    SELECT split_part(customer_id, '-', 2)::INTEGER,\n"
 "           MAX(split_part(customer_id, '-', 3)::INTEGER)\n"
 '    FROM public.contacts\n'
 "    WHERE customer_id ~ '^CUS-[0-9]{4}-[0-9]+$'\n"
 "    GROUP BY split_part(customer_id, '-', 2)::INTEGER\n"
 '    ON CONFLICT (year) DO UPDATE\n'
 '    SET last_number = GREATEST(counters.last_number, EXCLUDED.last_number)')
