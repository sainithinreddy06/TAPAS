"""Tests for Public Health Risk and de Bont (2024) Excess Mortality Engine."""

import pytest
from app.services.risk_engine import (
    BETA,
    compute_vulnerability_multiplier,
    compute_ward_risk,
    get_beta,
)


def test_de_bont_exact_beta_coefficients():
    """Verify exact published beta coefficients from de Bont et al. (2024)."""
    # 1-day event: (0.122, 0.085, 0.159)
    assert get_beta(1) == (0.122, 0.085, 0.159)
    # 2-day consecutive: (0.147, 0.103, 0.193)
    assert get_beta(2) == (0.147, 0.103, 0.193)
    # 5-day consecutive: exact beta = 0.194, low = 0.115, high = 0.279
    b_mean, b_low, b_high = get_beta(5)
    assert b_mean == 0.194
    assert b_low == 0.115
    assert b_high == 0.279

    # Interpolation for 3 and 4 days should strictly increase monotonically
    b3 = get_beta(3)
    b4 = get_beta(4)
    assert BETA[2][0] < b3[0] < b4[0] < BETA[5][0]
    assert BETA[2][1] < b3[1] < b4[1] < BETA[5][1]
    assert BETA[2][2] < b3[2] < b4[2] < BETA[5][2]


def test_excess_deaths_bounds_always_bracket_point_estimate():
    """Verify that ed_low <= excess_deaths <= ed_high is strictly enforced for all ward assessments."""
    class MockWard:
        id = "HYD-001"
        name = "Kukatpally"
        city = "Hyderabad"
        population = 85000
        pct_65plus = 9.5
        pct_outdoor = 28.0
        pct_informal = 22.0
        ndvi_score = 0.22
        health_access = 0.55

    # Simulated 24-hour severe thermal stress data (UTCI peak ~42°C)
    thermal_data = [
        {"time": f"2026-09-09T{h:02d}:00:00+05:30", "air_temp": 38.0 if 11 <= h <= 17 else 28.0,
         "utci": 42.0 if 12 <= h <= 16 else 30.0, "wbgt": 31.0 if 12 <= h <= 16 else 24.0}
        for h in range(24)
    ]

    risk = compute_ward_risk(MockWard(), thermal_data, target_date="2026-09-09")

    assert risk["risk_level"] >= 3
    assert risk["excess_deaths"] is not None
    assert risk["excess_deaths_low"] is not None
    assert risk["excess_deaths_high"] is not None
    # Essential contract property: low bound <= point estimate <= high bound
    assert risk["excess_deaths_low"] <= risk["excess_deaths"] <= risk["excess_deaths_high"]
    assert risk["ed_low"] <= risk["excess_deaths"] <= risk["ed_high"]
    assert risk["confidence_level"] == 95


def test_vulnerability_multiplier_normalized():
    """Verify that demographic vulnerability V normalizes so city average equals 1.0."""
    class NeutralWard:
        pct_65plus = 0.08
        pct_outdoor = 0.25
        pct_informal = 0.20
        ndvi_score = 0.30
        health_access = 0.60

    # City mean V calculated for the same values
    city_mean_v = (0.08 + 0.25 + 0.20 + (1.0 - 0.30) + (1.0 - 0.60)) / 5.0
    v = compute_vulnerability_multiplier(NeutralWard(), city_mean_v=city_mean_v)

    assert abs(v - 1.0) < 0.001
