"""Tests for Universal Thermal Climate Index (UTCI) Engine."""

import math
import pytest
from app.services.utci import calculate_utci, utci_category


def test_utci_reference_value():
    """Under standard neutral conditions (T=30°C, MRT=30°C, v=0.5 m/s, RH=50%), UTCI is within 2 K of 30°C."""
    val = calculate_utci(t_air=30.0, mrt=30.0, wind_10m=0.5, rh=50.0)
    assert val is not None
    assert abs(val - 30.0) <= 2.0


def test_utci_monotonic_with_mrt():
    """Higher MRT increases UTCI under identical ambient air temperature, wind, and humidity."""
    val_low = calculate_utci(t_air=30.0, mrt=30.0, wind_10m=0.5, rh=50.0)
    val_high = calculate_utci(t_air=30.0, mrt=60.0, wind_10m=0.5, rh=50.0)

    assert val_low is not None and val_high is not None
    assert val_high > val_low
    assert val_high - val_low > 5.0  # Significant thermal radiation contribution


def test_utci_validity_domain_boundaries():
    """Values outside the COST Action 730 validity domain must strictly return None."""
    # Temperature domain [-50, +50] °C
    assert calculate_utci(t_air=55.0, mrt=55.0, wind_10m=1.0, rh=30.0) is None
    assert calculate_utci(t_air=-55.0, mrt=-55.0, wind_10m=1.0, rh=30.0) is None

    # Radiation difference domain (MRT - T_air in [-30, +70] K)
    assert calculate_utci(t_air=30.0, mrt=105.0, wind_10m=1.0, rh=30.0) is None  # Delta = +75 K
    assert calculate_utci(t_air=30.0, mrt=-5.0, wind_10m=1.0, rh=30.0) is None   # Delta = -35 K

    # Wind speed domain (max 17 m/s)
    assert calculate_utci(t_air=30.0, mrt=30.0, wind_10m=20.0, rh=30.0) is None
    assert calculate_utci(t_air=30.0, mrt=30.0, wind_10m=-2.0, rh=30.0) is None

    # Vapour pressure domain (< 5.0 kPa): 45°C at 90% RH yields > 8 kPa
    assert calculate_utci(t_air=45.0, mrt=45.0, wind_10m=1.0, rh=90.0) is None


def test_utci_null_radiation_returns_none():
    """Missing MRT or radiation input must return None, never a default or fabricated value."""
    assert calculate_utci(t_air=32.0, mrt=None, wind_10m=1.5, rh=50.0) is None
    assert calculate_utci(t_air=None, mrt=35.0, wind_10m=1.5, rh=50.0) is None


def test_utci_realistic_indian_sweep_no_nan():
    """Verify that a sweep across realistic Indian meteorological conditions produces finite floats or None, never NaN or Inf."""
    temps = [25.0, 32.0, 38.0, 42.0, 47.0]
    humidities = [20.0, 40.0, 60.0, 80.0]
    winds = [0.0, 0.5, 2.0, 5.0, 10.0]

    for t in temps:
        for rh in humidities:
            for w in winds:
                for delta_mrt in [0.0, 15.0, 30.0]:
                    res = calculate_utci(t_air=t, mrt=t + delta_mrt, wind_10m=w, rh=rh)
                    if res is not None:
                        assert math.isfinite(res)
                        assert not math.isnan(res)
                        assert not math.isinf(res)
                        # Category mapping should succeed
                        cat, level = utci_category(res)
                        assert 1 <= level <= 5
