from datetime import timedelta
import pytest
from app.models.base import utcnow


@pytest.fixture
def future_window():
    now = utcnow()
    return {
        "start": (now + timedelta(hours=1)).isoformat(),
        "end": (now + timedelta(hours=6)).isoformat(),
    }


async def test_response_endpoints_and_cap_xml(officer, activated):
    op_id = activated["id"]

    # GET /api/response/{id}
    res = await officer.get(f"/api/response/{op_id}")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == op_id
    assert "recipients" in data
    assert "timeline" in data
    assert data["cap_xml"] is not None

    # GET /api/response/{id}/timeline
    t_res = await officer.get(f"/api/response/{op_id}/timeline")
    assert t_res.status_code == 200
    timeline = t_res.json()
    assert len(timeline) >= 2
    assert timeline[0]["event_type"] == "activated"

    # GET /api/response/{id}/cap
    cap_res = await officer.get(f"/api/response/{op_id}/cap")
    assert cap_res.status_code == 200
    assert "application/xml" in cap_res.headers["content-type"]
    assert "urn:oasis:names:tc:emergency:cap:1.2" in cap_res.text
    assert activated["reference_id"] in cap_res.text


async def test_officer_overview_auth_and_structure(client, officer):
    # Unauthenticated -> 401
    unauth = await client.get("/api/officer/overview")
    assert unauth.status_code == 401

    # Authenticated officer -> 200
    res = await officer.get("/api/officer/overview")
    assert res.status_code == 200
    data = res.json()
    assert data["jurisdiction_id"] == "mandal-kukatpally"
    assert data["total_wards"] >= 3
    assert data["population_covered"] > 0
    assert "active_operations_count" in data
    assert "high_risk_wards_count" in data


async def test_officer_rankings_and_gaps(officer):
    # Rankings
    rank_res = await officer.get("/api/officer/rankings")
    assert rank_res.status_code == 200
    rankings = rank_res.json()
    assert len(rankings) >= 3
    for r in rankings:
        assert r["ward_id"].startswith("HYD-")
        assert r["priority_rank"] >= 1
        assert r["risk_level"] >= 1

    # Gaps
    gap_res = await officer.get("/api/officer/gaps")
    assert gap_res.status_code == 200
    gaps_data = gap_res.json()
    assert "gaps" in gaps_data
    assert gaps_data["jurisdiction_id"] == "mandal-kukatpally"


async def test_officer_brief(officer):
    res = await officer.get("/api/officer/brief?date=2026-09-10")
    assert res.status_code == 200
    brief = res.json()
    assert brief["date"] == "2026-09-10"
    assert "peak_hours" in brief
    assert len(brief["priority_actions"]) > 0
    assert "resource_readiness" in brief


async def test_officer_incidents(officer, client):
    # Unauthenticated -> 401
    assert (await client.get("/api/officer/incidents")).status_code == 401

    # Create incident in jurisdiction
    payload = {
        "ward_id": "HYD-001",
        "category": "heat_illness",
        "severity": "high",
        "notes": "Elderly patient collapsed near Kukatpally market.",
        "location_lat": 17.485,
        "location_lon": 78.414,
    }
    create_res = await officer.post("/api/officer/incidents", json=payload)
    assert create_res.status_code == 201
    created = create_res.json()
    assert created["ward_id"] == "HYD-001"

    # Outside jurisdiction -> 403
    outside = dict(payload, ward_id="HYD-004")
    assert (await officer.post("/api/officer/incidents", json=outside)).status_code == 403

    # List incidents
    list_res = await officer.get("/api/officer/incidents")
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1


async def test_authority_endpoints_security_and_data(officer, collector):
    # Officer access to authority endpoints -> 403 FORBIDDEN
    assert (await officer.get("/api/authority/overview")).status_code == 403
    assert (await officer.get("/api/authority/rankings")).status_code == 403
    assert (await officer.get("/api/authority/priority")).status_code == 403
    assert (await officer.get("/api/authority/operations")).status_code == 403

    # Collector (higher_authority) access -> 200 OK
    overview_res = await collector.get("/api/authority/overview")
    assert overview_res.status_code == 200
    overview = overview_res.json()
    assert overview["district_id"] == "district-hyderabad"
    assert overview["total_wards"] >= 5
    assert overview["total_excess_deaths"] > 0
    assert overview["total_ed_low"] <= overview["total_excess_deaths"] <= overview["total_ed_high"]

    # Rankings
    rank_res = await collector.get("/api/authority/rankings")
    assert rank_res.status_code == 200
    assert len(rank_res.json()) >= 1

    # Priority
    prio_res = await collector.get("/api/authority/priority")
    assert prio_res.status_code == 200
    prio = prio_res.json()
    assert len(prio["ranked_wards"]) >= 5
    first = prio["ranked_wards"][0]
    assert "cpi_score" in first
    assert "factor_breakdown" in first

    # Operations
    ops_res = await collector.get("/api/authority/operations")
    assert ops_res.status_code == 200
    assert isinstance(ops_res.json(), list)


async def test_dispatch_endpoints(officer):
    # Healthcare notify
    hc_res = await officer.post("/api/healthcare/notify", json={
        "facility_id": "fac-hyd-001",
        "ward_id": "HYD-001",
        "message": "Heat wave triage protocol active.",
    })
    assert hc_res.status_code == 200
    hc = hc_res.json()
    assert hc["success"] is True
    assert hc["notification_state"] == "DELIVERED"

    # Misting deploy
    m_res = await officer.post("/api/misting/deploy", json={
        "team_id": "mist-01",
        "ward_id": "HYD-001",
        "target_location": "Kukatpally Metro Station",
    })
    assert m_res.status_code == 200
    m = m_res.json()
    assert m["success"] is True
    assert m["team"]["status"] == "En Route"
