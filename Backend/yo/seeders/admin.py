from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from yo.core.config import settings
from yo.core.security import hash_password
from yo.models.employee import Employee
from yo.models.permission import Menu, Role, RolePermission
from yo.models.support import DropdownOption, Location
from yo.models.user import User


MENU_SEEDS = [
    ("Teams", "teams", "/teams"),
    ("App Permission", "appPermission", "/app-permission"),
    ("Workspace", "workspace", "/workspace"),
    ("Contacts", "contacts", "/contacts"),
]

ROLE_SEEDS = {
    "Super Admin": {"all": True},
    "Admin": {"Teams": (True, True, True, True), "Workspace": (True, True, True, False), "Contacts": (True, True, True, False)},
    "Manager": {"Teams": (True, True, True, False), "Workspace": (False, True, True, False), "Contacts": (True, True, True, False)},
    "Team Leader": {"Teams": (False, True, True, False), "Workspace": (False, True, False, False), "Contacts": (False, True, False, False)},
    "Accountant": {"Workspace": (True, True, True, False), "Contacts": (False, True, False, False)},
    "Employee": {"Teams": (False, True, False, False), "Workspace": (False, True, False, False)},
    "Viewer": {"Teams": (False, True, False, False), "App Permission": (False, True, False, False), "Workspace": (False, True, False, False), "Contacts": (False, True, False, False)},
}

INDIA_LOCATIONS = {
    "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Tirupati"],
    "Assam": ["Guwahati", "Dibrugarh", "Silchar"],
    "Bihar": ["Patna", "Gaya", "Muzaffarpur"],
    "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur"],
    "Delhi": ["New Delhi", "Central Delhi", "South Delhi"],
    "Goa": ["Panaji", "Margao", "Vasco da Gama"],
    "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot"],
    "Haryana": ["Gurugram", "Faridabad", "Panipat"],
    "Himachal Pradesh": ["Shimla", "Dharamshala", "Solan"],
    "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad"],
    "Karnataka": ["Bengaluru Urban", "Mysuru", "Mangaluru", "Hubballi"],
    "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode"],
    "Madhya Pradesh": ["Bhopal", "Indore", "Gwalior", "Jabalpur"],
    "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Thane"],
    "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela"],
    "Punjab": ["Amritsar", "Ludhiana", "Jalandhar"],
    "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota"],
    "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Salem"],
    "Telangana": ["Hyderabad", "Warangal", "Nizamabad"],
    "Uttar Pradesh": ["Lucknow", "Noida", "Kanpur", "Varanasi"],
    "Uttarakhand": ["Dehradun", "Haridwar", "Nainital"],
    "West Bengal": ["Kolkata", "Howrah", "Siliguri", "Durgapur"],
}


async def seed_support_data(session: AsyncSession) -> None:
    india = await session.scalar(select(Location).where(Location.kind == "country", Location.name == "India"))
    if not india:
        india = Location(kind="country", name="India")
        session.add(india)
        await session.flush()
    for state_name, districts in INDIA_LOCATIONS.items():
        state = await session.scalar(select(Location).where(Location.kind == "state", Location.name == state_name, Location.parent_id == india.id))
        if not state:
            state = Location(kind="state", name=state_name, parent=india)
            session.add(state)
            await session.flush()
        for district_name in districts:
            exists = await session.scalar(select(Location).where(Location.kind == "district", Location.name == district_name, Location.parent_id == state.id))
            if not exists:
                session.add(Location(kind="district", name=district_name, parent=state))
    for kind, values in {"department": ["Operations", "Finance", "Technology", "People"], "reporting_manager": ["Musharof Chowdhury", "Aarav Mehta", "Meera Nair"]}.items():
        for value in values:
            exists = await session.scalar(select(DropdownOption).where(DropdownOption.kind == kind, DropdownOption.value == value, DropdownOption.deleted_at.is_(None)))
            if not exists:
                session.add(DropdownOption(kind=kind, value=value))


async def seed_default_data(session: AsyncSession) -> None:
    await seed_support_data(session)
    menus = {}
    for name, key, path in MENU_SEEDS:
        menu = await session.scalar(select(Menu).where(Menu.key == key))
        if not menu:
            menu = Menu(name=name, key=key, path=path)
            session.add(menu)
            await session.flush()
        menus[name] = menu

    roles = {}
    for name, permissions in ROLE_SEEDS.items():
        role = await session.scalar(select(Role).where(Role.name == name))
        if not role:
            role = Role(name=name, is_system=True)
            session.add(role)
            await session.flush()
        else:
            role.is_system = True
            role.deleted_at = None
        roles[name] = role
        for menu_name, menu in menus.items():
            values = (True, True, True, True) if permissions.get("all") else permissions.get(menu_name, (False, False, False, False))
            permission = await session.scalar(select(RolePermission).where(RolePermission.role_id == role.id, RolePermission.menu_id == menu.id))
            if not permission:
                session.add(RolePermission(role=role, menu=menu, can_create=values[0], can_view=values[1], can_update=values[2], can_delete=values[3]))
            else:
                permission.deleted_at = None
                permission.can_create = values[0]
                permission.can_view = values[1]
                permission.can_update = values[2]
                permission.can_delete = values[3]

    admin = await session.scalar(select(User).where(User.username == settings.DEFAULT_SUPER_ADMIN_USERNAME))
    if not admin:
        session.add(User(username=settings.DEFAULT_SUPER_ADMIN_USERNAME, email=settings.DEFAULT_SUPER_ADMIN_EMAIL, password_hash=hash_password(settings.DEFAULT_SUPER_ADMIN_PASSWORD), role=roles["Super Admin"], is_active=True))
    else:
        admin.role = roles["Super Admin"]
        admin.is_active = True
        admin.deleted_at = None
        admin.email = settings.DEFAULT_SUPER_ADMIN_EMAIL
        admin.password_hash = hash_password(settings.DEFAULT_SUPER_ADMIN_PASSWORD)

    sample_employees = [
        ("EMP-2026-0001", "Aarav Mehta", "aarav.mehta@yatzar.com", "Admin", "Operations", "Mumbai HQ", "Full-time", "Active"),
        ("EMP-2026-0002", "Meera Nair", "meera.nair@yatzar.com", "Manager", "Finance", "Bengaluru", "Full-time", "Active"),
        ("EMP-2026-0003", "Kabir Shah", "kabir.shah@yatzar.com", "Employee", "Technology", "Pune", "Contract", "On Leave"),
        ("EMP-2026-0004", "Anaya Rao", "anaya.rao@yatzar.com", "Viewer", "People", "Delhi", "Part-time", "Active"),
    ]
    for code, name, email, role_name, department, location, employee_type, status in sample_employees:
        exists = await session.scalar(select(Employee).where(Employee.employee_code == code))
        if exists:
            continue
        username = email.split("@", 1)[0]
        user = User(username=username, email=email, password_hash=hash_password(settings.DEFAULT_SUPER_ADMIN_PASSWORD), role=roles[role_name], is_active=True)
        session.add(Employee(user=user, employee_code=code, employee_name=name, employee_type=employee_type, date_of_birth=date(1995, 1, 1), gender="Other", mobile_number="+91-9000000000", email=email, address_line1="1 Main Street", country="India", state="Maharashtra", district="Mumbai", pincode="400001", date_of_joining=date(2026, 1, 1), department=department, designation="Team Member", work_location=location, employment_status=status))
    await session.commit()