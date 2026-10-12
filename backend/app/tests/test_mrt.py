"""Tests for Mean Radiant Temperature (MRT) Calculation."""

import pytest
from app.services.mrt import calculate_mrt


def test_mrt_clear_sky_substantially_exceeds_air_temp():
    """Under strong direct sunlight (800 W/m² DNI), MRT substantially exceeds ambient air temperature."""
    t_air = 35.0
    dni = 800.0
    dhi = 150.0
    solar_elev = 60.0

    mrt = calculate_mrt(dni=dni, dhi=dhi, solar_elevation_deg=solar_elev, t_air=t_air)
    assert mrt is not None
    # MRT should exceed ambient air temperature by at least 15 K under 800 W/m² irradiance
    assert mrt > t_air + 15.0
    assert mrt < 100.0


def test_mrt_night_approaches_air_temp_within_3k():
    """At night (elevation <= 0, radiation = 0), MRT approaches air temperature within 3 K."""
    t_air = 30.0
    # Negative elevation (sun below horizon)
    mrt = calculate_mrt(dni=0.0, dhi=0.0, solar_elevation_deg=-15.0, t_air=t_air)
    assert mrt is not None
    assert abs(mrt - t_air) <= 3.0

    # Zero elevation (sunset)
    mrt_sunset = calculate_mrt(dni=0.0, dhi=0.0, solar_elevation_deg=0.0, t_air=25.0)
    assert mrt_sunset is not None
    assert abs(mrt_sunset - 25.0) <= 3.0


def test_mrt_null_guards():
    """Missing or null radiation/temperature fields must return None, never a default value."""
    assert calculate_mrt(None, 150.0, 60.0, 35.0) is None
    assert calculate_mrt(800.0, None, 60.0, 35.0) is None
    assert calculate_mrt(800.0, 150.0, None, 35.0) is None
    assert calculate_mrt(800.0, 150.0, 60.0, None) is None


def test_mrt_clamping_and_finite():
    """MRT values are clamped between -30°C and 120°C and remain finite."""
    mrt = calculate_mrt(1200.0, 400.0, 85.0, 48.0)
    assert mrt is not None
    assert -30.0 <= mrt <= 120.0
