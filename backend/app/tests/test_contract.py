"""Contract Integration Tests for the 8 TAPAS Scientific Endpoints and Heatgrid.

Ensures complete compliance with the validated frontend transport in src/lib/client.ts:
- GET /api/risk/map
- GET /api/risk/{ward_id}?days=5
- GET /api/forecast/{ward_id}
- GET /api/occupational/{ward_id}?date=
- GET /api/facilities/{ward_id}
- GET /api/alerts
- GET /api/alerts/{id}/cap
- GET /api/hindcast
- GET /api/heatgrid
"""

from datetime import datetime, timezone
import pytest
from app.routers import science


def _mock_weather_payload() -> dict:
    times = [f"2026-09-10T{h:02d}:00" for h in range(24 * 7)]
    return {
        "hourly": {
            "time": times,
            "temperature_2m": [34.0 if 11 <= (h % 24) <= 16 else 27.0 for h in range(len(times))],
            "relative_humidity_2m": [65.0 for _ in times],
            "wind_speed_10m": [2.0 for _ in times],
            "shortwave_radiation": [700.0 if 9 <= (h % 24) <= 16 else 0.0 for h in range(len(times))],
            "direct_radiation": [550.0 if 9 <= (h % 24) <= 16 else 0.0 for h in range(len(times))],
            "diffuse_radiation": [150.0 if 9 <= (h % 24) <= 16 else 0.0 for h in range(len(times))],
            "surface_pressure": [1010.0 for _ in times],
        }
    }


@pytest.fixture(autouse=True)
def mock_open_meteo(monkeypatch):
    """Ensure tests run deterministically and offline without hitting external APIs."""
    async def mock_fetch_single(lat, lon, db=None, client=None):
        return _mock_weather_payload()

    async def mock_fetch_batch(points, db=None, client=None):
        return [_mock_weather_payload() for _ in points]

    monkeypatch.setattr(science, "fetch_weather_forecast", mock_fetch_single)
    monkeypatch.setattr(science, "fetch_weather_batched", mock_fetch_batch)


async def test_endpoint_risk_map_contract(client):
    """GET /api/risk/map must match RiskMapResponse shape from src/lib/client.ts."""
    resp = await client.get("/api/risk/map?date=2026-09-10&geographic_id=hyderabad-urban")
    assert resp.status_code == 200
    data = resp.json()

    # Identity & metadata
    assert data["date"] == "2026-09-10"
    assert data["geographic_id"] == "hyderabad-urban"
    assert data["coverage"] in ("available", "none")
    assert isinstance(data["source"], str)
    assert "T" in data["generated_at"]

    # Wards list
    assert isinstance(data["wards"], list)
    assert len(data["wards"]) >= 1
    ward0 = data["wards"][0]
    assert "ward_id" in ward0
    assert "ward_name" in ward0
    assert ward0["date"] == "2026-09-10"
    assert 1 <= ward0["risk_level"] <= 5
    assert isinstance(ward0["utci_max"], (int, float))
    assert ward0["excess_deaths_low"] <= ward0["excess_deaths"] <= ward0["excess_deaths_high"]

    # Summary
    assert data["summary"] is not None
    assert data["summary"]["date"] == "2026-09-10"
    assert 1 <= data["summary"]["risk_level"] <= 5


async def test_endpoint_risk_series_contract(client):
    """GET /api/risk/{ward_id}?days=5 must return 5 dated entries matching WardRiskSeries."""
    resp = await client.get("/api/risk/HYD-001?days=5&date=2026-09-10&geographic_id=loc-hyd")
    assert resp.status_code == 200
    data = resp.json()

    assert data["ward_id"] == "HYD-001"
    assert data["ward_name"] == "Kukatpally"
    assert data["geographic_id"] == "loc-hyd"
    assert isinstance(data["days"], list)
    assert len(data["days"]) == 5

    # Each day must have matching ward_id and unique date
    dates = [row["date"] for row in data["days"]]
    assert len(set(dates)) == 5
    assert all(row["ward_id"] == "HYD-001" for row in data["days"])


async def test_endpoint_forecast_contract(client):
    """GET /api/forecast/{ward_id} must return 48 hourly steps matching WardForecast."""
    resp = await client.get("/api/forecast/HYD-001?date=2026-09-10&geographic_id=loc-hyd")
    assert resp.status_code == 200
    data = resp.json()

    assert data["ward_id"] == "HYD-001"
    assert isinstance(data["hourly"], list)
    assert len(data["hourly"]) == 48

    hour0 = data["hourly"][0]
    assert "time" in hour0
    assert "utci" in hour0
    assert "wbgt" in hour0
    assert "air_temp" in hour0
    assert "relative_humidity" in hour0
    assert "heat_index" in hour0
    assert hour0["baseline_p97"] == 41.5


async def test_endpoint_occupational_contract(client):
    """GET /api/occupational/{ward_id}?date= must return work_pct + rest_pct == 100 for all hours."""
    resp = await client.get("/api/occupational/HYD-001?date=2026-09-10&geographic_id=loc-hyd")
    assert resp.status_code == 200
    data = resp.json()

    assert data["ward_id"] == "HYD-001"
    assert data["date"] == "2026-09-10"
    assert len(data["hourly"]) == 24

    for h in data["hourly"]:
        assert 0 <= h["hour"] <= 23
        assert h["band"] in ("safe", "caution", "warning", "danger")
        # Strict contract rule: work_pct + rest_pct == 100 (±0.01)
        assert abs((h["work_pct"] + h["rest_pct"]) - 100.0) <= 0.01

    assert isinstance(data["safe_windows"], list)
    assert isinstance(data["avoid_windows"], list)
    assert data["work_rest"] is not None
    wr = data["work_rest"]
    assert abs((wr["work_pct"] + wr["rest_pct"]) - 100.0) <= 0.01


async def test_endpoint_facilities_contract(client):
    """GET /api/facilities/{ward_id} must return facility items with valid types."""
    resp = await client.get("/api/facilities/HYD-001?geographic_id=loc-hyd")
    assert resp.status_code == 200
    data = resp.json()

    assert data["ward_id"] == "HYD-001"
    assert isinstance(data["facilities"], list)
    for fac in data["facilities"]:
        assert "id" in fac
        assert "name" in fac
        assert fac["type"] in ("cooling_centre", "hospital", "phc", "water_point", "shelter")


async def test_endpoint_alerts_contract(client):
    """GET /api/alerts must return active alert objects matching AlertsResponse."""
    resp = await client.get("/api/alerts?date=2026-09-10&geographic_id=loc-hyd")
    assert resp.status_code == 200
    data = resp.json()

    assert "alerts" in data
    assert len(data["alerts"]) >= 1
    alt0 = data["alerts"][0]
    assert "id" in alt0
    assert "ward_id" in alt0
    assert "headline" in alt0
    assert 1 <= alt0["risk_level"] <= 5
    assert alt0["date"] == "2026-09-10"


async def test_endpoint_cap_xml_contract(client):
    """GET /api/alerts/{id}/cap must return valid CAP 1.2 XML with matching identifier."""
    alert_id = "test-cap-alert-001"
    resp = await client.get(f"/api/alerts/{alert_id}/cap")
    assert resp.status_code == 200
    assert "application/xml" in resp.headers["content-type"]

    xml_text = resp.text
    assert 'xmlns="urn:oasis:names:tc:emergency:cap:1.2"' in xml_text
    assert f"<identifier>{alert_id}</identifier>" in xml_text
    assert "<status>Actual</status>" in xml_text


async def test_endpoint_hindcast_contract(client):
    """GET /api/hindcast returns verification statistics."""
    resp = await client.get("/api/hindcast?geographic_id=loc-hyd")
    assert resp.status_code == 200
    data = resp.json()

    assert "source" in data
    assert "metrics" in data
    metrics = data["metrics"]
    assert "hit_rate" in metrics
    assert "false_alarm_ratio" in metrics
    assert "brier_score" in metrics
    assert "utci_mae" in metrics


async def test_endpoint_heatgrid_contract(client):
    """GET /api/heatgrid returns batched spatial grid points."""
    resp = await client.get("/api/heatgrid?bbox=17.2,78.2,17.6,78.6&zoom=6&metric=utci")
    assert resp.status_code == 200
    data = resp.json()

    assert isinstance(data, list)
    assert len(data) >= 1
    pt0 = data[0]
    assert "lat" in pt0
    assert "lon" in pt0
    assert "value" in pt0
    assert pt0["metric"] == "utci"
    assert 1 <= pt0["level"] <= 5
