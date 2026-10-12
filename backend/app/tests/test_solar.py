"""Tests for NOAA Solar Position Algorithm."""

from datetime import datetime, timezone
import pytest
from app.services.solar import solar_position


def test_solar_noon_tropic_of_cancer_summer_solstice():
    """At solar noon on the summer solstice at the Tropic of Cancer, elevation is within 0.5° of 90°."""
    # Latitude ~23.44° N, Longitude 78.48° E, June 21 at local solar noon (~06:47:30 UTC)
    dt = datetime(2026, 6, 21, 6, 47, 30, tzinfo=timezone.utc)
    pos = solar_position(23.44, 78.48, dt)

    assert abs(pos.elevation_deg - 90.0) <= 0.5
    assert pos.zenith_deg <= 0.5
    assert abs(pos.declination_deg - 23.44) <= 0.3
    assert abs(pos.hour_angle_deg) <= 0.5
    assert pos.cossza >= 0.99


def test_solar_noon_equator_equinox():
    """At solar noon on the March equinox at the equator, elevation is within 0.5° of 90°."""
    # Equator (lat 0, lon 0) on March 20 at local solar noon (~12:07:24 UTC)
    dt = datetime(2026, 3, 20, 12, 7, 24, tzinfo=timezone.utc)
    pos = solar_position(0.0, 0.0, dt)

    assert abs(pos.elevation_deg - 90.0) <= 0.5
    assert pos.zenith_deg <= 0.5
    assert abs(pos.declination_deg) <= 0.6
    assert abs(pos.hour_angle_deg) <= 0.5


def test_solar_night_elevation():
    """At midnight, solar elevation is negative (below horizon) and cossza is 0.0."""
    dt = datetime(2026, 6, 21, 18, 47, 30, tzinfo=timezone.utc)  # Midnight in India (~00:17 IST)
    pos = solar_position(17.48, 78.41, dt)

    assert pos.elevation_deg < 0.0
    assert pos.zenith_deg > 90.0
    assert pos.cossza == 0.0
