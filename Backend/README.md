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
