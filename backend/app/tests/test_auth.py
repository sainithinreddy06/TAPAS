from datetime import timedelta
import pytest
from sqlalchemy import select
from app.auth.jwt import create_access_token, decode_access_token
from app.config import get_settings
from app.models import User, Ward


async def test_cookie_and_me(client):
    response = await client.post("/api/auth/login", json={"email": "OFFICER@tapas.gov.in", "password": "tapas2026"})
    assert response.status_code == 200
    cookie = response.headers["set-cookie"]
    assert "HttpOnly" in cookie and "SameSite=lax" in cookie and "Max-Age=28800" in cookie
    assert "Secure" not in cookie
    claims = decode_access_token(response.cookies["tapas_auth"])
    assert claims["role"] == "municipal_officer"
    assert claims["jurisdiction_id"] == "mandal-kukatpally"
    assert claims["exp"] - claims["iat"] == 28800
    result = await client.get("/api/auth/me")
    assert result.status_code == 200 and "password_hash" not in result.json()


@pytest.mark.parametrize("email,password", [("officer@tapas.gov.in", "wrong"), ("absent@tapas.gov.in", "tapas2026")])
async def test_wrong_credentials(client, email, password):
    result = await client.post("/api/auth/login", json={"email": email, "password": password})
    assert result.status_code == 401 and "set-cookie" not in result.headers


async def test_missing_tampered_expired_cookie(client, db):
    assert (await client.get("/api/auth/me")).status_code == 401
    client.cookies.set("tapas_auth", "tampered")
    assert (await client.get("/api/auth/me")).status_code == 401
    user = await db.scalar(select(User).where(User.email == "officer@tapas.gov.in"))
    client.cookies.set("tapas_auth", create_access_token(user, expires_delta=timedelta(seconds=-1)))
    assert (await client.get("/api/auth/me")).status_code == 401


async def test_secure_cookie_in_production(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "app_env", "production")
    result = await client.post("/api/auth/login", json={"email": "officer@tapas.gov.in", "password": "tapas2026"})
    assert "Secure" in result.headers["set-cookie"] and "HttpOnly" in result.headers["set-cookie"]


async def test_logout(officer):
    assert (await officer.post("/api/auth/logout")).status_code == 200
    assert (await officer.get("/api/auth/me")).status_code == 401


async def test_officer_role_and_jurisdiction(officer):
    assert (await officer.get("/api/authority/operations")).status_code == 403
    assert (await officer.get("/api/wards/HYD-004")).status_code == 403
    assert (await officer.get("/api/wards/HYD-001")).status_code == 200
    assert {row["id"] for row in (await officer.get("/api/wards")).json()} == {"HYD-001", "HYD-002", "HYD-003"}


async def test_authority_district(collector, db):
    db.add(Ward(id="OTHER", name="Outside district", centroid_lat=18.0, centroid_lon=79.0,
                mandal="mandal-other", district="district-warangal"))
    await db.commit()
    assert (await collector.get("/api/authority/operations")).status_code == 200
    assert (await collector.get("/api/wards/OTHER")).status_code == 403
    assert len((await collector.get("/api/wards")).json()) == 5


async def test_database_role_change_invalidates_claims(officer, db):
    user = await db.scalar(select(User).where(User.email == "officer@tapas.gov.in"))
    user.role = "citizen"
    await db.commit()
    assert (await officer.get("/api/auth/me")).status_code == 401


async def test_citizen_cannot_activate(client, db, payload):
    user = await db.scalar(select(User).where(User.email == "officer@tapas.gov.in"))
    user.role, user.jurisdiction_level, user.jurisdiction_id = "citizen", "ward", "HYD-001"
    await db.commit()
    client.cookies.set("tapas_auth", create_access_token(user))
    assert (await client.post("/api/response/activate", json=payload)).status_code == 403


async def test_cors_is_explicit(client):
    ok = await client.options("/api/auth/login", headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "POST"})
    assert ok.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert ok.headers["access-control-allow-credentials"] == "true"
    denied = await client.options("/api/auth/login", headers={"Origin": "https://untrusted.example", "Access-Control-Request-Method": "POST"})
    assert denied.status_code == 400
