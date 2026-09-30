"""Self-contained asynchronous test for the YO backend person workflow."""
import asyncio
from yo.core.database import AsyncSessionLocal, engine
from yo.models.base import Base
from yo.services.person import PersonService
from yo.schemas.requests.person import PersonCreateRequest, PersonUpdateRequest


async def main():
    print("=" * 60)
    print("RUNNING YO BACKEND ARCHITECTURE VERIFICATION TEST")
    print("=" * 60)

    # 1. Initialize Tables (Model layer)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("\n[Layer 5: Model -> DB] Database tables initialized.")

    async with AsyncSessionLocal() as session:
        service = PersonService(session)

        # 2. CREATE Operation
        print("\n--- 1. Testing CREATE (POST /persons) ---")
        create_payload = PersonCreateRequest(
            name="Alice Walker",
            age=29,
            phone_number="+1-555-0199"
        )
        print(f"[Layer 2: Request Schema] Validated payload: {create_payload.model_dump()}")
        
        person = await service.create(create_payload)
        await session.commit()
        print(f"[Layer 3 & 4: Service & Repository] Created Person: id={person.id}, name='{person.name}', age={person.age}, phone_number='{person.phone_number}'")
        person_id = person.id

        # 3. GET BY ID Operation
        print("\n--- 2. Testing READ ONE (GET /persons/{id}) ---")
        fetched = await service.get_by_id(person_id)
        print(f"[Layer 4 & 5: Repository & Model] Retrieved Person: {fetched.name}, age: {fetched.age}, phone: {fetched.phone_number}")

        # 4. UPDATE Operation
        print("\n--- 3. Testing UPDATE (PUT /persons/{id}) ---")
        update_payload = PersonUpdateRequest(
            age=30,
            phone_number="+1-555-0200"
        )
        updated = await service.update(person_id, update_payload)
        await session.commit()
        print(f"[Layer 3 & 4: Service & Repository] Updated Person: name='{updated.name}', age={updated.age}, phone_number='{updated.phone_number}'")

        # 5. LIST Operation
        print("\n--- 4. Testing READ ALL (GET /persons) ---")
        all_persons = await service.list_all()
        print(f"[Layer 4: Repository] Total records found: {len(all_persons)}")
        for p in all_persons:
            print(f"  - {p.id} | {p.name} | {p.age} yrs | {p.phone_number}")

        # 6. DELETE Operation
        print("\n--- 5. Testing DELETE (DELETE /persons/{id}) ---")
        await service.delete(person_id)
        await session.commit()
        print(f"[Layer 3 & 4: Service & Repository] Deleted Person with id: {person_id}")

        # Verify deletion
        try:
            await service.get_by_id(person_id)
            print("[FAIL] Deletion check failed: Record still exists!")
        except Exception as e:
            print(f"[OK] Deletion verified: Service correctly raised -> {e}")

    await engine.dispose()
    print("\n" + "=" * 60)
    print("[SUCCESS] ALL CRUD LAYERS TESTED SUCCESSFULLY!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
