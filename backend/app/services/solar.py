"""NOAA Solar Position Calculations.

Reference:
    NOAA Global Monitoring Laboratory, Solar Calculation Details
    https://gml.noaa.gov/grad/solcalc/solareqns.PDF
    Derived from Astronomical Algorithms by Jean Meeus (1998).

Provides:
    - Fractional year (gamma)
    - Equation of Time (eqtime)
    - Solar declination angle (decl)
    - Local solar hour angle (omega)
    - Solar zenith angle (theta_z)
    - Solar elevation angle (alpha = 90° - theta_z)
"""

from __future__ import annotations
import math
from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass(frozen=True)
class SolarPosition:
    zenith_deg: float
    elevation_deg: float
    declination_deg: float
    hour_angle_deg: float
    cossza: float


def solar_position(lat: float, lon: float, dt: datetime) -> SolarPosition:
    """Compute solar position for a given latitude, longitude and UTC datetime.

    Parameters:
        lat: Latitude in decimal degrees (North positive, -90 to 90).
        lon: Longitude in decimal degrees (East positive, -180 to 180).
        dt: UTC datetime or timezone-aware datetime (converted to UTC).

    Returns:
        SolarPosition with zenith_deg, elevation_deg, declination_deg, hour_angle_deg, cossza.
    """
    if dt.tzinfo is not None:
        dt_utc = dt.astimezone(timezone.utc)
    else:
        dt_utc = dt.replace(tzinfo=timezone.utc)

    year = dt_utc.year
    is_leap = (year % 4 == 0 and year % 100 != 0) or (year % 400 == 0)
    days_in_year = 366 if is_leap else 365

    # Day of year (1-based)
    day_of_year = dt_utc.timetuple().tm_yday
    hour_decimal = dt_utc.hour + dt_utc.minute / 60.0 + dt_utc.second / 3600.0

    # Fractional year in radians
    gamma = 2.0 * math.pi / days_in_year * (day_of_year - 1 + (hour_decimal - 12.0) / 24.0)

    # Equation of time in minutes
    eqtime = 229.18 * (
        0.000075
        + 0.001868 * math.cos(gamma)
        - 0.032077 * math.sin(gamma)
        - 0.014615 * math.cos(2.0 * gamma)
        - 0.040849 * math.sin(2.0 * gamma)
    )

    # Solar declination in radians
    decl = (
        0.006918
        - 0.399912 * math.cos(gamma)
        + 0.070257 * math.sin(gamma)
        - 0.006758 * math.cos(2.0 * gamma)
        + 0.000907 * math.sin(2.0 * gamma)
        - 0.002697 * math.cos(3.0 * gamma)
        + 0.001480 * math.sin(3.0 * gamma)
    )

    # True solar time in minutes
    time_offset = eqtime + 4.0 * lon
    true_solar_time_min = (hour_decimal * 60.0 + time_offset) % 1440.0
    if true_solar_time_min < 0:
        true_solar_time_min += 1440.0

    # Hour angle in degrees and radians (solar noon = 0°)
    hour_angle_deg = true_solar_time_min / 4.0 - 180.0
    if hour_angle_deg < -180.0:
        hour_angle_deg += 360.0
    elif hour_angle_deg > 180.0:
        hour_angle_deg -= 360.0

    hour_angle_rad = math.radians(hour_angle_deg)
    lat_rad = math.radians(lat)

    # Cosine of zenith angle
    cos_zenith = (
        math.sin(lat_rad) * math.sin(decl)
        + math.cos(lat_rad) * math.cos(decl) * math.cos(hour_angle_rad)
    )
    cos_zenith = max(-1.0, min(1.0, cos_zenith))

    zenith_rad = math.acos(cos_zenith)
    zenith_deg = math.degrees(zenith_rad)
    elevation_deg = 90.0 - zenith_deg
    cossza = max(0.0, cos_zenith)

    return SolarPosition(
        zenith_deg=zenith_deg,
        elevation_deg=elevation_deg,
        declination_deg=math.degrees(decl),
        hour_angle_deg=hour_angle_deg,
        cossza=cossza,
    )
