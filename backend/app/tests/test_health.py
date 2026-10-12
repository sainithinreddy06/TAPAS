from sqlalchemy import text, select, func
from app.models import Facility
from app.seed.run_seed import seed_database


async def test_health_counts(client):
    assert (await client.get("/health")).json() == {"status": "ok", "db": "ok", "wards": 5, "users": 2}


async def test_seed_is_idempotent(db):
    assert await seed_database(db) == {"users": 2, "wards": 5, "facilities": 8}
    rows = dict((await db.execute(select(Facility.facility_type, func.count()).group_by(Facility.facility_type))).all())
    assert rows == {"cooling_centre": 3, "hospital": 3, "water_point": 2}
    assert await db.scalar(select(func.count()).select_from(Facility).where(Facility.is_demo.is_(False))) == 0


async def test_real_spatialite_loaded(db):
    assert (await db.scalar(text("SELECT spatialite_version()"))).startswith("5.")
    assert await db.scalar(text("SELECT ST_SRID(MakePoint(78.4138,17.4849,4326))")) == 4326
