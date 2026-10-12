import asyncio
from uuid import NAMESPACE_URL, uuid5
from sqlalchemy import select, func
from app.auth.jwt import hash_password
from app.config import get_settings
from app.database import SessionFactory, engine
from app.models import Facility, User, Ward
from app.seed.users import DEMO_USERS
from app.seed.wards import PILOT_WARDS
from app.seed.facilities import DEMO_FACILITIES


async def seed_database(db):
    if get_settings().app_env == "production":
        raise RuntimeError("Demo seeding is disabled in production.")
    for data in DEMO_USERS:
        if not await db.scalar(select(User.id).where(User.email == data["email"])):
            fields = {key: value for key, value in data.items() if key != "password"}
            db.add(User(id=str(uuid5(NAMESPACE_URL, "tapas-demo-user:" + data["email"])),
                        **fields, password_hash=hash_password(data["password"]), is_demo=True))
    for data in PILOT_WARDS:
        if not await db.get(Ward, data["id"]):
            db.add(Ward(**data, district="district-hyderabad", city="Hyderabad", state="Telangana", geom=None))
    await db.flush()
    for ward_id, name, kind in DEMO_FACILITIES:
        facility_id = str(uuid5(NAMESPACE_URL, "tapas-demo-facility:" + name))
        if not await db.get(Facility, facility_id):
            ward = await db.get(Ward, ward_id)
            db.add(Facility(id=facility_id, ward_id=ward_id, name=name, facility_type=kind,
                            lat=ward.centroid_lat, lon=ward.centroid_lon, is_demo=True,
                            source="demo", address="Demonstration only; not a verified facility.",
                            last_verified=None, capacity=None, phone=None))
    await db.commit()
    return {table.__tablename__: await db.scalar(select(func.count()).select_from(table))
            for table in (User, Ward, Facility)}


async def main():
    async with SessionFactory() as db:
        print(await seed_database(db))
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
