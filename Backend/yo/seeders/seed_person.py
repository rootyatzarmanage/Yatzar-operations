import asyncio
from yo.core.database import AsyncSessionLocal
from yo.models.person import Person
from yo.repositories.person import PersonRepository

INITIAL_PERSONS = [
    {"name": "Admin User", "age": 30, "phone_number": "+1000000001"},
    {"name": "Regular Member", "age": 25, "phone_number": "+1000000002"},
]


async def seed_data():
    print("[*] Seeding initial Person data...")
    async with AsyncSessionLocal() as session:
        repo = PersonRepository(session)
        for data in INITIAL_PERSONS:
            existing = await repo.get_by_phone_number(data["phone_number"])
            if not existing:
                person = Person(**data)
                await repo.create(person)
                print(f"  + Added: {person.name} ({person.phone_number})")
            else:
                print(f"  = Exists: {data['name']} ({data['phone_number']})")
        await session.commit()
    print("[OK] Seeding completed.")


if __name__ == "__main__":
    asyncio.run(seed_data())
