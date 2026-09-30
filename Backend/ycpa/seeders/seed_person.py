import asyncio
from ycpa.core.database import AsyncSessionLocal
from ycpa.models.person import Person
from ycpa.repositories.person import PersonRepository

INITIAL_PERSONS = [
    {"name": "Admin User", "age": 30, "phno": "+1000000001"},
    {"name": "Regular Member", "age": 25, "phno": "+1000000002"},
]


async def seed_data():
    print("[*] Seeding initial Person data...")
    async with AsyncSessionLocal() as session:
        repo = PersonRepository(session)
        for data in INITIAL_PERSONS:
            existing = await repo.get_by_phno(data["phno"])
            if not existing:
                person = Person(**data)
                await repo.create(person)
                print(f"  + Added: {person.name} ({person.phno})")
            else:
                print(f"  = Exists: {data['name']} ({data['phno']})")
        await session.commit()
    print("[OK] Seeding completed.")


if __name__ == "__main__":
    asyncio.run(seed_data())
