# YO Backend

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

Set the connection string in `.env`:

```env
PROJECT_NAME="YO Backend API"
API_V1_PREFIX="/api/v1"
DEBUG=True
HOST=127.0.0.1
PORT=8000
DATABASE_URL="postgresql+asyncpg://yo_user:change_this_password@localhost:5432/yo_db"
DEFAULT_SUPER_ADMIN_USERNAME="superadmin"
DEFAULT_SUPER_ADMIN_EMAIL="admin@yatzar.com"
DEFAULT_SUPER_ADMIN_PASSWORD="replace-this-before-deployment"
```

Never commit `.env` because it can contain database credentials. Use `.env.example` as the template.

On first startup, the backend seeds the configured user with the `Super Admin` role. The password is stored as a salted PBKDF2 hash in `users.password_hash`; change the default password in `.env` before running outside a local demo.

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

The `users` table stores login accounts and hashed passwords. The `employees` table stores employee details and links each Teams employee to one user account. Employee deletes are soft deletes and deactivate the linked account.
The `menus`, `roles`, and `role_permissions` tables back App Permission. Roles and permission rows are soft-deletable and carry created/updated/deleted audit columns.
The `workspaces` table stores workspace names, descriptions, status, and audit timestamps. Workspace deletion is soft deletion; active workspace names are case-insensitively unique.

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
├── api/v1/endpoints/       HTTP endpoints
├── core/config/            application settings
├── core/database/          base, engine, session, dependencies
├── core/schemas/           common response envelopes
├── models/                 SQLAlchemy models
├── repositories/           database queries
├── schemas/requests/       validated request schemas
├── schemas/responses/      response schemas
├── services/               business logic
└── main.py                 FastAPI application
```

All request bodies are validated before service execution. Successful responses include `"validation": {}`.

## API Endpoints

| Method | Endpoint                          | Description             |
| ------ | --------------------------------- | ----------------------- |
| POST   | `/api/v1/employees`               | Create a Teams employee |
| GET    | `/api/v1/employees`               | List active employees   |
| GET    | `/api/v1/employees/{employee_id}` | Get an employee         |
| PUT    | `/api/v1/employees/{employee_id}` | Update an employee      |
| DELETE | `/api/v1/employees/{employee_id}` | Soft-delete an employee |
| GET    | `/api/v1/roles`                   | List active roles       |
| POST   | `/api/v1/roles`                   | Create a role           |
| PUT    | `/api/v1/roles/{role_id}`         | Update role permissions |
| DELETE | `/api/v1/roles/{role_id}`         | Soft-delete a role      |
| GET    | `/api/v1/locations/countries`     | List configured countries |
| GET    | `/api/v1/locations/states?country=India` | List states for a country |
| GET    | `/api/v1/locations/districts?state=Maharashtra` | List districts for a state |
| GET    | `/api/v1/options/{kind}`           | List configured dropdown values |
| POST   | `/api/v1/employee-drafts`         | Save an employee form draft |
| GET    | `/api/v1/employee-drafts`         | List active employee drafts |
| GET    | `/api/v1/employee-drafts/{draft_id}` | Retrieve a draft |
| PUT    | `/api/v1/employee-drafts/{draft_id}` | Update a draft |
| DELETE | `/api/v1/employee-drafts/{draft_id}` | Soft-delete a draft |
| GET    | `/api/v1/workspaces`              | List active workspaces (supports `skip` and `limit`) |
| POST   | `/api/v1/workspaces`              | Create a workspace |
| GET    | `/api/v1/workspaces/{workspace_id}` | Get a workspace |
| PUT    | `/api/v1/workspaces/{workspace_id}` | Update workspace fields |
| DELETE | `/api/v1/workspaces/{workspace_id}` | Soft-delete a workspace |

The Teams frontend uses these employee, role, dropdown, location, and draft
endpoints. Employee codes are generated by the API when not provided; login
passwords are hashed before storage. Draft payloads must not include a password.
The Workspace frontend uses the workspace endpoints; active names are unique
without regard to letter case. Workspace records are seeded with the four
sample entries shown in the UI on first startup.

**Deployment note:** These routes do not currently require authentication.
Employee records include sensitive personal and financial information, so
configure authenticated access and production CORS/storage policies before
exposing the API outside a trusted development environment. Document fields
currently store references/paths; this API does not upload or serve document
files.

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

## Verify the API

There is no `test_api.py` script in this backend. To check that the API starts
and responds:

1. Start PostgreSQL and configure `.env` as described above.
2. Start the backend from the `Backend` directory:

   ```powershell
   python run.py
   ```

3. In a second PowerShell window, request the health endpoint:

   ```powershell
   Invoke-RestMethod http://127.0.0.1:8000/
   ```

   A healthy response includes `"health": "ok"`. You can also open
   [Swagger UI](http://127.0.0.1:8000/docs) to inspect and manually exercise
   the available endpoints.
