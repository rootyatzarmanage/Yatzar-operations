# Yatzar Operations Backend

FastAPI backend using PostgreSQL, SQLAlchemy async sessions, Pydantic validation, and Alembic migrations.

## Requirements

- Python 3.11 or newer
- PostgreSQL 14 or newer
- A PostgreSQL database named `yo_db`

## PostgreSQL Setup

Create the database and user, or use an existing PostgreSQL installation:

```sql
CREATE USER yo_user WITH PASSWORD 'change_this_password';
CREATE DATABASE yo_db OWNER yo_user;
```

Copy `.env.example` to `.env` and set every field before starting the API:

```env
PROJECT_NAME="Yatzar Operations API"
API_V1_PREFIX="/api/v1"
DEBUG=True
HOST=127.0.0.1
PORT=8000
DATABASE_URL="postgresql+asyncpg://yo_user:change_this_password@localhost:5432/yo_db"
DEFAULT_SUPER_ADMIN_USERNAME="superadmin"
DEFAULT_SUPER_ADMIN_EMAIL="admin@yatzar.com"
DEFAULT_SUPER_ADMIN_PASSWORD="replace-this-before-deployment"
SESSION_SECRET="replace-with-a-long-random-secret"
SESSION_COOKIE_NAME="yatzar_session"
SESSION_MAX_AGE=28800
FRONTEND_ORIGINS="http://localhost:5173,http://127.0.0.1:5173"
```

The backend reads all settings from `Backend/.env`. `Backend/.env.example` is the complete safe template and must be updated whenever a setting is added, removed, or renamed. Never commit `.env` because it contains database credentials and login secrets.

| Setting | Purpose |
| --- | --- |
| `PROJECT_NAME` | API/application name shown by FastAPI |
| `API_V1_PREFIX` | Prefix for all versioned API routes |
| `DEBUG` | Enables reload when running through `run.py` |
| `HOST` / `PORT` | API bind address and port |
| `DATABASE_URL` | PostgreSQL async connection string; must use `postgresql+asyncpg://` |
| `DEFAULT_SUPER_ADMIN_USERNAME` | Username repaired/created by startup seeding |
| `DEFAULT_SUPER_ADMIN_EMAIL` | Email repaired/created by startup seeding |
| `DEFAULT_SUPER_ADMIN_PASSWORD` | Password used when the initial Super Admin account is created |
| `SESSION_SECRET` | Secret used to sign authentication cookies |
| `SESSION_COOKIE_NAME` | HttpOnly session-cookie name |
| `SESSION_MAX_AGE` | Session lifetime in seconds |
| `FRONTEND_ORIGINS` | Comma-separated frontend origins allowed to send cookies |

On every startup, the backend ensures the configured user has the `Super Admin` role, is active, has the configured email, and has full permissions for the seeded menus. The configured password is written as a salted PBKDF2 hash in `users.password_hash` on startup, so changing `DEFAULT_SUPER_ADMIN_PASSWORD` updates the local Super Admin login on the next restart. Use a strong value outside local development.

## Install

From the `Backend` directory:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

On macOS or Linux, activate the environment with:

```bash
source .venv/bin/activate
```

## Database Migration

Run migrations from the `Backend` directory:

```powershell
alembic upgrade head
```

The active history is consolidated into `20261017_baseline`. It creates a fresh
database or reconciles existing tables without dropping application data. It
also applies the SMTP schedule/delivery schema and annual customer numbers.
Existing recognized legacy revision markers are adopted transactionally during
upgrade; do not run `alembic stamp head` to bypass schema changes.

Historical scripts are preserved in `alembic/legacy_versions/` and are not
executed. The baseline uses a frozen JSON schema snapshot, not live ORM models.
Future changes should be new revisions following this baseline. The baseline
itself refuses destructive downgrades. Backups provide recovery across the
consolidation boundary.

Run migrations before starting the API. Startup now validates the schema instead
of creating tables outside Alembic. `alembic heads` should report one head;
`alembic current` after upgrading should report `20261027_email_multiple_tags`.
Customer IDs use `CUS-YYYY-NNNN`, with an annual series shared across workspaces.
The repository reads the highest numeric suffix from `contacts.customer_id`,
including soft-deleted contacts and contacts moved to another stage. A PostgreSQL
transaction advisory lock serializes allocation until the contact update commits;
the existing unique index provides additional duplicate protection. No counter
table is required; migration `20261026_contact_customer_ids` removes the historical counter table if
present. Permanently deleting the highest numbered contact can allow its number
to be reused. Normal soft deletion preserves the number.

The `users` table stores login accounts and hashed passwords. The `employees` table stores employee details and links each Teams employee to one user account. Employee deletes are soft deletes and deactivate the linked account.
Authentication uses an HttpOnly signed session cookie. Set `SESSION_SECRET` to a strong private value in `.env` before deployment.
`FRONTEND_ORIGINS` must include the exact origin used by the Vite frontend so browsers can send the session cookie.
The `menus`, `roles`, and `role_permissions` tables back App Permission. Roles and permission rows are soft-deletable and carry created/updated/deleted audit columns.

## Run the API

```powershell
python run.py
```

Alternatively:

```powershell
uvicorn yo.main:app --reload --host 127.0.0.1 --port 8000
```

Open the API documentation at:

- Swagger UI: http://127.0.0.1:8000/docs
- ReDoc: http://127.0.0.1:8000/redoc

## Project Structure

```text
yo/
â”œâ”€â”€ api/v1/endpoints/       HTTP endpoints
â”œâ”€â”€ core/config/            application settings
â”œâ”€â”€ core/database/          base, engine, session, dependencies
â”œâ”€â”€ core/schemas/           common response envelopes
â”œâ”€â”€ models/                 SQLAlchemy models
â”œâ”€â”€ repositories/           database queries
â”œâ”€â”€ schemas/requests/       validated request schemas
â”œâ”€â”€ schemas/responses/      response schemas
â”œâ”€â”€ services/               business logic
â””â”€â”€ main.py                 FastAPI application
```

All request bodies are validated before service execution. Successful responses include `"validation": {}`.

## API Endpoints

### Bulk email tags and recipient switches

`POST /api/v1/email-marketing` and `PUT /api/v1/email-marketing/{campaign_id}`
accept multiple tags in `tag_ids`. Existing clients can still send scalar
`tag_id`; responses include `tag_ids` and the first tag as legacy `tag_id`.
The existing `email_marketing` table stores the UUID array. The migration
backfills existing single-tag campaigns without changing their recipients.
No additional application tables are created.

Example bulk campaign body (replace the example UUIDs with existing records):

```json
{
  "workspace_id": "11111111-1111-4111-8111-111111111111",
  "campaign_name": "Department update",
  "from_email": "marketing@example.com",
  "mail_type": "Bulk Email",
  "tag_ids": [
    "22222222-2222-4222-8222-222222222222",
    "33333333-3333-4333-8333-333333333333"
  ],
  "selection_mode": "selected",
  "selected_user_ids": ["44444444-4444-4444-8444-444444444444"],
  "subject": "Department update",
  "content": "<p>Hello!</p>",
  "scheduled_at": null
}
```

`selected_user_ids` contains **contact UUIDs**, not login-user UUIDs. With
`selection_mode: "selected"`, those contacts are enabled and all other eligible
contacts across the selected tags are saved as disabled in the existing
`email_marketing_recipients` table. With `selection_mode: "all"`, every eligible
contact is enabled and `selected_user_ids` must be empty. Invalid/inactive tags,
contacts outside the selected workspace/tags, opt-outs, deleted contacts and
contacts without email addresses cannot be selected for delivery.

List saved recipient rows with
`GET /api/v1/email-marketing/{campaign_id}/recipients?workspace_id=...`.
Toggle a saved recipient using
`PATCH /api/v1/email-marketing/recipients/{recipient_id}/status?workspace_id=...`
with `{"is_enabled": false}` or `{"is_enabled": true}`. A change locks the
campaign against the sender; already-sent recipients and completed campaigns
return 409. The worker only sends to enabled rows and rechecks tag membership,
active tags, workspace, opt-outs and current email before delivery. Shared email
addresses use the existing delivery log to avoid sending the same message twice.
Null/omitted `scheduled_at` queues immediately, so send the intended enabled
contact list in the create request; use a future schedule when switches need
to be changed before delivery.

| Method | Endpoint                          | Description             |
| ------ | --------------------------------- | ----------------------- |
| POST   | `/api/v1/auth/login`              | Sign in with a username/email and password |
| GET    | `/api/v1/auth/me`                 | Get the current signed-in user |
| POST   | `/api/v1/auth/logout`             | Clear the signed-in session |
| POST   | `/api/v1/employees`               | Create a Teams employee |
| GET    | `/api/v1/employees`               | List active employees   |
| GET    | `/api/v1/employees/{employee_id}` | Get an employee         |
| PUT    | `/api/v1/employees/{employee_id}` | Update an employee      |
| DELETE | `/api/v1/employees/{employee_id}` | Soft-delete an employee |
| GET    | `/api/v1/roles`                   | List active roles       |
| POST   | `/api/v1/roles`                   | Create a role           |
| PUT    | `/api/v1/roles/{role_id}`         | Update role permissions |
| DELETE | `/api/v1/roles/{role_id}`         | Soft-delete a role      |

Example request:

```json
{
  "employee_name": "Aarav Mehta",
  "employee_type": "Full-time",
  "date_of_birth": "1995-04-12",
  "gender": "Male",
  "mobile_number": "+91-9000000000",
  "email": "aarav.mehta@example.com",
  "address_line1": "1 Main Street",
  "country": "India",
  "state": "Maharashtra",
  "district": "Mumbai",
  "pincode": "400001",
  "date_of_joining": "2026-10-01",
  "department": "Operations",
  "designation": "Manager",
  "work_location": "Mumbai HQ",
  "employment_status": "Active",
  "username": "aarav.mehta",
  "login_email": "aarav.mehta@example.com",
  "password": "change-me-now",
  "role": "Employee",
  "is_active": true
}
```

## Verification

The customer-number integration tests use disposable PostgreSQL schemas and
require a database user with permission to create schemas. From `Backend`, run:

```bash
RUN_DATABASE_TESTS=1 venv/bin/python -m unittest discover -s tests -v
```

After PostgreSQL is running and `.env` is configured:

```powershell
python test_api.py
```

## Configuration and documentation maintenance

Update this README and `Backend/.env.example` in the same change whenever you:

1. Add, remove, or rename a `Settings` field.
2. Change authentication, cookies, CORS, database, or startup-seeding behavior.
3. Add or remove an API endpoint.
4. Change a migration, required dependency, or startup command.

After each such change:

```powershell
alembic upgrade head
python -m compileall yo
```

Run the frontend build from `Frontend`:

```powershell
npm run build
```

For local development, keep `Frontend/.env` aligned with the backend URL and keep `FRONTEND_ORIGINS` aligned with the browser origin. Update the relevant README section immediately so configuration and behavior are never documented only in source code.

# Alembic 

alembic upgrade head

alembic current

# To Run use this 

# Create virtual environment

python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Upgrade pip
python -m pip install --upgrade pip

# Install requirements
pip install -r requirements.txt

# to run
python run.py


## Employee drafts and employee codes

Run `alembic upgrade head` from `Backend` before starting the API, including for
existing databases without a recorded revision. The consolidated baseline adds
missing employee status fields, marks older rows as saved when that field is
newly added, and permits incomplete drafts in the `employees` table. The legacy
`employee_drafts` table is retained as an archive; its old JSON records are not
exposed or automatically converted by these endpoints.

All employee routes require authentication and use the configured API v1 prefix.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/employees` | Create a complete employee with `status=1` and a user account. |
| POST | `/employees/draft` | Create an incomplete employee with `status=0`; accepts employee fields only. |
| GET | `/employees` | Retrieve by optional `employee_id` or `employee_code`, or list with `search`, optional `status`, `page=1`, and `per_page=5`. |
| GET | `/employees/drafts` | Retrieve or search only drafts, with the same optional identifiers and pagination. |
| PUT | `/employees/{employee_id}` | Update employee fields; saved employees also accept account changes. |
| PUT | `/employees/{employee_id}/save` | Submit the complete employee creation payload to finalize a draft and create its account. |
| DELETE | `/employees/{employee_id}` | Soft-delete a draft or saved employee. |
| GET | `/employees/codes` | Return `employee_codes`, containing all codes stored on non-deleted employees, including drafts. |

Draft saving preserves its assigned code. Supply account credentials only when
creating a saved employee or finalizing a draft. Use the save endpoint to change
a draft's status to `1`; the normal update endpoint does not accept status.
Duplicate codes or account identifiers return HTTP 409, including concurrent
creation conflicts. New frontend integrations should use these employee routes
instead of the removed support draft routes.

Employee and draft retrieval responses put a single `EmployeeResponse` directly
in `data` when an identifier is supplied, otherwise `data` contains `items`,
`total`, `page`, and `per_page`. `employee_id` takes precedence if both identifiers
are supplied. Search and pagination apply to lists. Optional `status` filters
employee lists and individual employee lookups; `/employees/drafts` always
restricts results to status `0`. Blank searches are ignored. Deleted employees
are excluded from retrieval and the codes API, while their codes remain reserved
for uniqueness. Code generation is private service logic used only on creation.
There are no GET routes with path parameters in the Employee router.
