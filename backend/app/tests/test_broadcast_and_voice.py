import pytest
from httpx import AsyncClient
from app.models.broadcast import BroadcastRecipient
from app.services.voice_service import build_alert_twiml


@pytest.mark.asyncio
async def test_recipient_management_and_consent(officer: AsyncClient):
    # 1. Reject without explicit consent
    bad_payload = {
        "name": "Demo Ward Member 3",
        "role": "Ward Member",
        "phone": "+919849012345",
        "consent": False,
        "zone": "Kukatpally",
    }
    resp = await officer.post("/api/officer/recipients", json=bad_payload)
    assert resp.status_code == 422

    # 2. Reject invalid phone format (not E.164)
    bad_phone_payload = {
        "name": "Demo Ward Member 3",
        "role": "Ward Member",
        "phone": "9849012345",
        "consent": True,
        "zone": "Kukatpally",
    }
    resp = await officer.post("/api/officer/recipients", json=bad_phone_payload)
    assert resp.status_code == 422

    # 3. Successful addition with E.164 and consent
    valid_payload = {
        "name": "Demo Ward Member 3",
        "role": "Ward Member",
        "phone": "+919849012345",
        "channels": ["whatsapp", "sms"],
        "language": "en-IN",
        "consent": True,
        "zone": "Kukatpally",
    }
    resp = await officer.post("/api/officer/recipients", json=valid_payload)
    assert resp.status_code == 201
    created = resp.json()
    assert created["name"] == "Demo Ward Member 3"
    assert "•••" in created["phone"]  # Masked phone
    recipient_id = created["id"]

    # 4. List recipients - phone is masked
    resp = await officer.get("/api/officer/recipients")
    assert resp.status_code == 200
    listed = resp.json()
    assert any(r["id"] == recipient_id and "•••" in r["phone"] for r in listed)

    # 5. Reveal phone only when requested for edit
    resp = await officer.get(f"/api/officer/recipients?reveal_id={recipient_id}")
    assert resp.status_code == 200
    found = next(r for r in resp.json() if r["id"] == recipient_id)
    assert found["raw_phone"] == "+919849012345"

    # 6. Update recipient
    resp = await officer.patch(
        f"/api/officer/recipients/{recipient_id}",
        json={"role": "Senior Ward Member"},
    )
    assert resp.status_code == 200
    assert resp.json()["role"] == "Senior Ward Member"

    # 7. Delete recipient
    resp = await officer.delete(f"/api/officer/recipients/{recipient_id}")
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_notify_and_call_rate_limits(officer: AsyncClient):
    payload = {
        "recipient_id": "test-recip-rate-limit",
        "ward_id": "Kukatpally",
        "phone": "+919849099999",
    }

    # First notify succeeds
    resp1 = await officer.post("/api/officer/notify-member", json=payload)
    assert resp1.status_code == 200

    # Second notify immediately after hits 429 rate limit (1/hour)
    resp2 = await officer.post("/api/officer/notify-member", json=payload)
    assert resp2.status_code == 429

    # First call succeeds
    resp_call1 = await officer.post("/api/officer/call-member", json=payload)
    assert resp_call1.status_code == 200

    # Second call immediately after hits 429 rate limit (1/hour)
    resp_call2 = await officer.post("/api/officer/call-member", json=payload)
    assert resp_call2.status_code == 429


def test_voice_alert_twiml_generation():
    twiml = build_alert_twiml(
        ward_name="Kukatpally",
        level_label="EXTREME (Level 5)",
        utci=43.1,
        window_start="12:40",
        window_end="17:20",
    )
    assert "Polly.Aditi" in twiml
    assert "<Pause" in twiml
    assert "43 degrees" in twiml
    assert "<Gather" in twiml
    assert "/api/webhooks/twilio/voice-response" in twiml
