"""Tests for Wet Bulb Globe Temperature (WBGT) and Occupational Work-Rest Ratios."""

import pytest
from app.services.wbgt import calculate_wbgt, work_rest_schedule


def test_wbgt_hot_humid_greater_than_hot_dry():
    """At the same air temperature (35°C), high humidity produces significantly higher WBGT than dry air."""
    wbgt_humid = calculate_wbgt(t_air=35.0, mrt=50.0, wind_10m=1.0, rh=80.0)
    wbgt_dry = calculate_wbgt(t_air=35.0, mrt=50.0, wind_10m=1.0, rh=20.0)

    assert wbgt_humid is not None and wbgt_dry is not None
    assert wbgt_humid > wbgt_dry
    assert wbgt_humid - wbgt_dry > 5.0


def test_wbgt_work_rest_ratios_iso_7243():
    """Verify ISO 7243 / ACGIH work-rest ratio thresholds."""
    # WBGT = 33°C (Danger): 25% work / 75% rest
    band, work_pct, rest_pct = work_rest_schedule(33.0)
    assert band == "danger"
    assert work_pct == 25.0
    assert rest_pct == 75.0
    assert work_pct + rest_pct == 100.0

    # WBGT = 30°C (Warning): 50% work / 50% rest
    band, work_pct, rest_pct = work_rest_schedule(30.0)
    assert band == "warning"
    assert work_pct == 50.0
    assert rest_pct == 50.0
    assert work_pct + rest_pct == 100.0

    # WBGT = 26.5°C (Caution): 75% work / 25% rest
    band, work_pct, rest_pct = work_rest_schedule(26.5)
    assert band == "caution"
    assert work_pct == 75.0
    assert rest_pct == 25.0
    assert work_pct + rest_pct == 100.0

    # WBGT = 22°C (Safe): 100% work / 0% rest
    band, work_pct, rest_pct = work_rest_schedule(22.0)
    assert band == "safe"
    assert work_pct == 100.0
    assert rest_pct == 0.0
    assert work_pct + rest_pct == 100.0


def test_wbgt_work_rest_sum_rule():
    """Verify that work_pct + rest_pct strictly equals 100.0 (±0.01) across all WBGT values."""
    for wbgt in [18.0, 24.9, 25.0, 27.9, 28.0, 31.9, 32.0, 38.0]:
        _, work, rest = work_rest_schedule(wbgt)
        assert work is not None and rest is not None
        assert abs((work + rest) - 100.0) < 0.001
