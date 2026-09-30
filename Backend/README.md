# YCPA FastAPI Backend - Architecture & Learning Guide

A production-ready FastAPI backend built strictly following the layered clean architecture described in the **Backend Field Guide**:

```
Client ➔ 1. Route ➔ 2. Request Schema ➔ 3. Service ➔ 4. Repository ➔ 5. Model ➔ PostgreSQL/SQLite
                                                                            │
Client 🠔 7. JSON Response 🠔 6. Response Schema 🠔────────────────────────────┘
```

---

## 🗂️ Project Structure

```
ycb/
├── alembic/                      # Database migrations
│   ├── env.py                    # Async migration setup with Base.metadata
│   ├── script.py.mako            # Migration template
│   └── versions/                 # Revision scripts
├── ycpa/                         # Main application package
│   ├── api/                      # Routing layer
│   │   └── v1/
│   │       ├── endpoints/
│   │       │   └── person.py     # 1. Route (HTTP endpoints for Person)
│   │       └── router.py         # Router aggregation
│   ├── core/                     # Shared foundations
│   │   ├── config.py             # Settings from .env via Pydantic
│   │   ├── database.py           # Async DB engine & DatabaseSession dependency
│   │   ├── exceptions.py         # Custom domain exceptions & handlers
│   │   └── schemas/
│   │       └── responses.py      # SuccessResponse and ErrorResponse
│   ├── models/                   # 5. Database ORM entities
│   │   ├── base.py               # DeclarativeBase & TimestampMixin
│   │   └── person.py             # Person entity (name, age, phno)
│   ├── repositories/             # 4. Database queries & persistence
│   │   └── person.py             # PersonRepository
│   ├── schemas/                  # 2 & 6. Validation & Serialization
│   │   └── person.py             # PersonCreateRequest, PersonUpdateRequest, PersonResponse
│   ├── services/                 # 3. Business logic & orchestration
│   │   └── person.py             # PersonService
│   └── main.py                   # FastAPI app, lifespan, CORS, and routers
├── .env                          # Local environment variables
├── .env.example                  # Environment template
├── alembic.ini                   # Alembic config
├── requirements.txt              # Project dependencies
├── run.py                        # Server launcher
├── test_api.py                   # End-to-end verification script
└── README.md
```

---

## 🚀 Step-by-Step Layer Trace for `Person` (`name`, `age`, `phno`)

### 1. Model (`ycpa/models/person.py`)
Defines the database table columns, types, and constraints:
```python
class Person(Base, TimestampMixin):
    __tablename__ = "persons"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    phno: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
```

### 2. Request & Response Schemas (`ycpa/schemas/person.py`)
Validates incoming data and serializes output:
```python
class PersonCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    age: int = Field(..., gt=0, le=150)
    phno: str = Field(..., min_length=7, max_length=20)

class PersonResponse(BaseModel):
    id: UUID
    name: str
    age: int
    phno: str
    created_at: datetime
    updated_at: datetime
```

### 3. Repository Layer (`ycpa/repositories/person.py`)
Isolated database queries:
```python
class PersonRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, person: Person) -> Person: ...
    async def get_by_id(self, person_id: UUID) -> Optional[Person]: ...
    async def get_by_phno(self, phno: str) -> Optional[Person]: ...
    async def list_all(self, skip: int, limit: int) -> Sequence[Person]: ...
    async def update(self, person: Person) -> Person: ...
    async def delete(self, person: Person) -> None: ...
```

### 4. Service Layer (`ycpa/services/person.py`)
Coordinates business logic (e.g. checking phone number uniqueness before creating):
```python
class PersonService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repository = PersonRepository(session)

    async def create(self, body: PersonCreateRequest) -> Person:
        existing = await self.repository.get_by_phno(body.phno)
        if existing:
            raise ConflictException(f"Person with phone number '{body.phno}' already exists.")
        
        person = Person(name=body.name, age=body.age, phno=body.phno)
        return await self.repository.create(person)
```

### 5. HTTP Endpoint (`ycpa/api/v1/endpoints/person.py`)
Receives HTTP request, injects `DatabaseSession`, delegates to `PersonService`, and returns standard `SuccessResponse`:
```python
@router.post("", status_code=201, response_model=SuccessResponse[PersonResponse])
async def create_person(body: PersonCreateRequest, session: DatabaseSession):
    person = await PersonService(session).create(body)
    return SuccessResponse(
        message="Person created successfully",
        data=PersonResponse.model_validate(person)
    )
```

---

## ⚡ Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Run Verification Test
You can immediately test all 5 layers end-to-end:
```bash
python test_api.py
```

### 3. Start the FastAPI Development Server
```bash
python run.py
```
Or directly with Uvicorn:
```bash
uvicorn ycpa.main:app --reload --port 8000
```

### 4. Open Swagger UI
Navigate to [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) in your browser.

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/persons` | Create a new person (`name`, `age`, `phno`) |
| `GET` | `/api/v1/persons` | List persons with pagination (`?skip=0&limit=50`) |
| `GET` | `/api/v1/persons/{id}` | Get person by UUID |
| `PUT` | `/api/v1/persons/{id}` | Update person's `name`, `age`, and/or `phno` |
| `DELETE` | `/api/v1/persons/{id}` | Delete person by UUID |

### Sample `POST /api/v1/persons` Payload:
```json
{
  "name": "Bruce Wayne",
  "age": 35,
  "phno": "+1-202-555-0143"
}
```

### Sample Response:
```json
{
  "success": true,
  "message": "Person created successfully",
  "data": {
    "id": "7f9c2d12-1cb3-4876-80f4-5f1107567bdf",
    "name": "Bruce Wayne",
    "age": 35,
    "phno": "+1-202-555-0143",
    "created_at": "2026-09-26T20:25:00Z",
    "updated_at": "2026-09-26T20:25:00Z"
  }
}
```

---

## 🗄️ Database Configurations

- **Default (Zero-Config SQLite Async):**
  Works out of the box with zero external services needed:
  ```env
  DATABASE_URL="sqlite+aiosqlite:///./ycpa.db"
  ```
- **PostgreSQL Async (Production):**
  Simply update `.env` to your PostgreSQL database credentials:
  ```env
  DATABASE_URL="postgresql+asyncpg://postgres:password@localhost:5432/ycpa_db"
  ```

### Database Migrations with Alembic:
Create a new migration revision:
```bash
alembic revision --autogenerate -m "create persons table"
```
Apply migrations:
```bash
alembic upgrade head
```
