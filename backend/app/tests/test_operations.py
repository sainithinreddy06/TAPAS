from datetime import timedelta
from xml.etree.ElementTree import fromstring
import pytest
from sqlalchemy import select, func, update
from app.models import Incident, ResponseEvent, ResponseOperation, ResponseRecipient, WeatherCache
from app.models.base import utcnow
from app.services.operations_service import expire_operations
from app.services.scheduler_tasks import check_operations_escalation, cleanup_expired_caches


async def test_activate_persists_cap_recipients_and_timeline(officer, activated, db):
    assert activated["reference_id"].startswith("TAPAS-HYD-001")
    assert activated["is_demo"] is True
    assert fromstring(activated["cap_xml"]).find("{urn:oasis:names:tc:emergency:cap:1.2}status").text == "Exercise"
    recipient = activated["recipients"][0]
    assert len(recipient["action_token"]) >= 40
    assert recipient["token_expires"] == activated["risk_window_end"]
    assert recipient["delivery_status"] == "sent"
    assert recipient["provider_message_id"].startswith("SIM-")
    assert recipient["operational_status"] == "not_acknowledged"
    assert [event["event_type"] for event in activated["timeline"]] == ["activated", "dispatched"]
    detail = await officer.get("/api/operations/" + activated["id"])
    assert detail.status_code == 200 and detail.json()["recipients"] == activated["recipients"]
    timeline = (await officer.get("/api/operations/" + activated["id"] + "/timeline")).json()
    assert [event["id"] for event in timeline] == sorted(event["id"] for event in timeline)


@pytest.mark.parametrize("action,status", [("acknowledge", "acknowledged"), ("start", "in_progress"), ("help", "needs_assistance"), ("complete", "completed")])
async def test_token_action_without_cookie(client, activated, action, status, db):
    client.cookies.clear()
    token = activated["recipients"][0]["action_token"]
    result = await client.post("/api/respond/" + token, json={"action": action})
    assert result.status_code == 200 and result.json()["operational_status"] == status
    recipient = await db.get(ResponseRecipient, activated["recipients"][0]["id"])
    assert recipient.delivery_status == "sent"


async def test_expired_token_is_gone(client, activated, db):
    recipient = await db.get(ResponseRecipient, activated["recipients"][0]["id"])
    recipient.token_expires = utcnow() - timedelta(seconds=1)
    await db.commit()
    assert (await client.post("/api/respond/" + recipient.action_token, json={"action": "start"})).status_code == 410


async def test_unknown_token_and_invalid_action(client, activated):
    assert (await client.post("/api/respond/unknown", json={"action": "start"})).status_code == 404
    assert (await client.post("/api/respond/" + activated["recipients"][0]["action_token"], json={"action": "arbitrary"})).status_code == 422


async def test_duplicate_reference_and_validation_are_atomic(officer, payload, db):
    payload["reference_id"] = "TAPAS-TEST-UNIQUE"
    assert (await officer.post("/api/response/activate", json=payload)).status_code == 201
    assert (await officer.post("/api/response/activate", json=payload)).status_code == 409
    assert await db.scalar(select(func.count()).select_from(ResponseOperation)) == 1
    assert await db.scalar(select(func.count()).select_from(ResponseRecipient)) == 1
    payload["alert_level"] = 3
    assert (await officer.post("/api/response/activate", json=payload)).status_code == 422


async def test_outside_jurisdiction_activation(officer, payload, db):
    payload["ward_id"] = "HYD-004"
    assert (await officer.post("/api/response/activate", json=payload)).status_code == 403
    assert await db.scalar(select(func.count()).select_from(ResponseOperation)) == 0


async def test_foreign_operation_read_is_forbidden(collector, payload):
    payload["ward_id"] = "HYD-004"
    created = (await collector.post("/api/response/activate", json=payload)).json()
    await collector.post("/api/auth/login", json={"email": "officer@tapas.gov.in", "password": "tapas2026"})
    assert (await collector.get("/api/operations/" + created["id"])).status_code == 403
    assert (await collector.get("/api/operations/" + created["id"] + "/timeline")).status_code == 403
    assert (await collector.get("/api/operations")).json() == []


async def test_repeat_completion_does_not_duplicate_or_regress(client, activated, db):
    path = "/api/respond/" + activated["recipients"][0]["action_token"]
    assert (await client.post(path, json={"action": "complete"})).status_code == 200
    assert (await client.post(path, json={"action": "complete"})).status_code == 200
    assert (await client.post(path, json={"action": "start"})).status_code == 409
    assert await db.scalar(select(func.count()).select_from(ResponseEvent).where(ResponseEvent.event_type == "completed")) == 1


async def test_incident_persistence_and_ward_match(officer, activated, db):
    body = {"ward_id": "HYD-001", "operation_id": activated["id"],
            "category": "water_shortage", "severity": "high", "notes": "Demo report"}
    assert (await officer.post("/api/incidents", json=body)).status_code == 201
    assert await db.scalar(select(func.count()).select_from(Incident)) == 1
    body["ward_id"] = "HYD-002"
    assert (await officer.post("/api/incidents", json=body)).status_code == 422


async def test_scheduler_expiry_is_persistent_and_idempotent(officer, activated, db):
    operation = await db.get(ResponseOperation, activated["id"])
    operation.risk_window_start = utcnow() - timedelta(hours=2)
    operation.risk_window_end = utcnow() - timedelta(hours=1)
    await db.commit()
    await expire_operations(db.info["factory"])
    await expire_operations(db.info["factory"])
    await db.refresh(operation)
    assert operation.status == "expired"
    assert await db.scalar(select(func.count()).select_from(ResponseEvent).where(ResponseEvent.event_type == "expired")) == 1


async def test_science_is_not_fabricated_and_facilities_are_demo(officer):
    for endpoint in ("risk", "thermal", "weather"):
        assert (await officer.get("/api/wards/HYD-001/" + endpoint)).json() == []
    assert all(row["is_demo"] and row["last_verified"] is None for row in (await officer.get("/api/wards/HYD-001/facilities")).json())


async def test_scheduler_escalation_level5_and_level4_idempotent(officer, activated, db):
    op = await db.get(ResponseOperation, activated["id"])
    # Set activated_at to 20 minutes ago (Level 5 threshold: >15 min)
    op.alert_level = 5
    op.activated_at = utcnow() - timedelta(minutes=20)
    await db.commit()

    # Run escalation check
    await check_operations_escalation(db.info["factory"])
    await db.refresh(op)
    assert op.status == "escalated"
    assert await db.scalar(select(func.count()).select_from(ResponseEvent).where(ResponseEvent.event_type == "escalated")) == 1

    # Idempotent: running twice produces identical state without duplicate events
    await check_operations_escalation(db.info["factory"])
    await db.refresh(op)
    assert op.status == "escalated"
    assert await db.scalar(select(func.count()).select_from(ResponseEvent).where(ResponseEvent.event_type == "escalated")) == 1

    # Level 4 warning threshold: >30 min
    op.alert_level = 4
    op.status = "active"
    op.activated_at = utcnow() - timedelta(minutes=35)
    await db.commit()

    await check_operations_escalation(db.info["factory"])
    assert await db.scalar(select(func.count()).select_from(ResponseEvent).where(ResponseEvent.event_type == "escalation_warning")) == 1

    # Idempotent second run
    await check_operations_escalation(db.info["factory"])
    assert await db.scalar(select(func.count()).select_from(ResponseEvent).where(ResponseEvent.event_type == "escalation_warning")) == 1


async def test_scheduler_cleanup_expired_caches(db):
    from app.models.base import new_id
    # Add an expired cache entry (>24 hours ago) and a fresh one
    db.add(WeatherCache(
        id=new_id(),
        cache_key="test-expired",
        lat=17.48,
        lon=78.41,
        provider="open-meteo",
        fetched_at=utcnow() - timedelta(hours=30),
        data={"temp": 35.0},
    ))
    db.add(WeatherCache(
        id=new_id(),
        cache_key="test-fresh",
        lat=17.48,
        lon=78.41,
        provider="open-meteo",
        fetched_at=utcnow() - timedelta(hours=2),
        data={"temp": 36.0},
    ))
    await db.commit()

    await cleanup_expired_caches(db.info["factory"])
    remaining = (await db.scalars(select(WeatherCache.cache_key))).all()
    assert "test-expired" not in remaining
    assert "test-fresh" in remaining


async def test_activation_with_groups_fallback(officer, db):
    payload = {
        "ward_id": "HYD-001",
        "risk_level": 5,
        "reference": "TAPAS-GRP-TEST-01",
        "groups": ["ward_officials", "asha_mro", "healthcare"],
    }
    res = await officer.post("/api/response/activate", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["reference_id"] == "TAPAS-GRP-TEST-01"
    assert len(data["recipients"]) == 3
    recip_types = {r["recipient_type"] for r in data["recipients"]}
    assert recip_types == {"ward_member", "asha", "healthcare"}

