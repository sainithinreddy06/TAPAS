import os
import secrets
import shutil
import subprocess
import sys
from datetime import timedelta
from pathlib import Path

os.environ["APP_ENV"] = "test"
os.environ["AUTH_SECRET"] = secrets.token_hex(32)
os.environ["TWILIO_AUTH_TOKEN"] = secrets.token_hex(24)
os.environ["PUBLIC_URL"] = "http://testserver"
os.environ["SCHEDULER_ENABLED"] = "false"

import httpx
import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker
from twilio.request_validator import RequestValidator
from app.config import get_settings
from app.database import get_db, make_engine
from app.main import app
from app.models.base import utcnow
from app.seed.run_seed import seed_database


@pytest.fixture(scope="session")
def template(tmp_path_factory):
    path = tmp_path_factory.mktemp("schema") / "template.db"
    env = {**os.environ, "DATABASE_URL": "sqlite+aiosqlite:///" + path.as_posix()}
    subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"],
                   env=env, check=True, capture_output=True, text=True)
    return path


@pytest.fixture
async def db(template, tmp_path):
    path = tmp_path / "test.db"
    shutil.copyfile(template, path)
    engine = make_engine("sqlite+aiosqlite:///" + path.as_posix(), get_settings().spatialite_library_path)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        session.info["factory"] = factory
        await seed_database(session)
        yield session
        await session.rollback()
    await engine.dispose()


@pytest.fixture
async def client(db):
    async def database_override():
        yield db
    app.dependency_overrides[get_db] = database_override
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture
def payload():
    now = utcnow()
    return {
        "ward_id": "HYD-001", "alert_level": 5,
        "risk_window_start": now.isoformat(),
        "risk_window_end": (now + timedelta(hours=8)).isoformat(),
        "recipients": [{"recipient_type": "asha", "name": "Demo responder", "phone": "+919876543210"}],
    }


@pytest.fixture
async def officer(client):
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as c:
        result = await c.post("/api/auth/login", json={"email": "officer@tapas.gov.in", "password": "tapas2026"})
        assert result.status_code == 200
        yield c


@pytest.fixture
async def collector(client):
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as c:
        result = await c.post("/api/auth/login", json={"email": "collector@tapas.gov.in", "password": "tapas2026"})
        assert result.status_code == 200
        yield c


@pytest.fixture
async def activated(officer, payload):
    response = await officer.post("/api/response/activate", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def signature(path, data, base=None):
    config = get_settings()
    return RequestValidator(config.twilio_auth_token.get_secret_value()).compute_signature(
        (base or config.public_url) + path, data)


async def signed_post(client, path, data):
    return await client.post(path, data=data, headers={"X-Twilio-Signature": signature(path, data)})
