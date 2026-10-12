"""Mean Radiant Temperature (MRT) Calculation.

References:
    - Di Napoli, C., Hogan, R. J., & Pappenberger, F. (2021).
      "Mean radiant temperature from 'all-sky' simulations."
    - VDI 3787, Part 2 (2008): Environmental meteorology - Methods for the
      human-biometeorological evaluation of climate and air quality for urban
      and regional planning at regional scale: Methods: Part I: Climate.
    - Jendritzky, G. et al. (1990): The Klima-Michel-Model.

Inputs:
    - Direct normal irradiance (W/m²)
    - Diffuse horizontal irradiance (W/m²)
    - Solar elevation angle (degrees)
    - Air temperature (°C)

Guards:
    - Returns None if any required radiation or temperature input is None.
    - At night (solar elevation <= 0), shortwave radiation is 0 and MRT
      approaches air temperature (within 3K).
    - Clamps output to [-30.0, 120.0] °C.
"""

from __future__ import annotations
import math

# Physical constants
SIGMA = 5.67e-8        # Stefan-Boltzmann constant (W / (m² · K⁴))
ALPHA_SW = 0.7         # Shortwave absorption coefficient of standard human body
EPS_P = 0.97           # Emissivity of the human body (longwave)
RHO_G = 0.2            # Standard ground albedo (grass / dry soil / asphalt mix)


def calculate_mrt(
    dni: float | None,
    dhi: float | None,
    solar_elevation_deg: float | None,
    t_air: float | None,
) -> float | None:
    """Calculate Mean Radiant Temperature (°C).

    Parameters:
        dni: Direct normal irradiance (W/m²), or direct radiation normalized to beam.
        dhi: Diffuse horizontal irradiance (W/m²).
        solar_elevation_deg: Solar elevation angle above the horizon in degrees.
        t_air: Ambient air temperature in °C.

    Returns:
        MRT in °C clamped to [-30, 120], or None if inputs are invalid/missing.
    """
    if dni is None or dhi is None or solar_elevation_deg is None or t_air is None:
        return None

    # Guard against NaN / Inf
    if not (math.isfinite(dni) and math.isfinite(dhi) and math.isfinite(solar_elevation_deg) and math.isfinite(t_air)):
        return None

    t_air_k = t_air + 273.15
    if t_air_k <= 0:
        return None

    # Night condition: sun at or below horizon
    if solar_elevation_deg <= 0.0:
        # At night, incoming shortwave is zero. Radiative exchange is purely longwave.
        # Downwelling thermal radiation from clear/partly cloudy sky is slightly below blackbody,
        # so human MRT is typically 1.0 to 2.5 K below 2m air temperature.
        mrt_night = t_air - 1.5
        return max(-30.0, min(120.0, mrt_night))

    elev_deg = min(90.0, max(0.0, solar_elevation_deg))
    elev_rad = math.radians(elev_deg)

    # Projected area factor f_p for standing person (Jendritzky et al., 1990 / VDI 3787)
    fp = 0.308 * math.cos(elev_rad * (0.998 - (elev_deg ** 2) / 22920.0))
    fp = max(0.0, min(0.35, fp))

    # Global horizontal irradiance
    ghi = max(0.0, dni * math.sin(elev_rad) + dhi)

    # Total absorbed shortwave flux density (W/m²)
    # S_sw = (alpha_sw / eps_p) * [f_p * DNI + 0.5 * DHI + 0.5 * rho_g * GHI]
    s_sw = (ALPHA_SW / EPS_P) * (fp * max(0.0, dni) + 0.5 * max(0.0, dhi) + 0.5 * RHO_G * ghi)

    # Longwave flux density from sky and ground
    # Sky emissivity: typical tropical / subtropical atmospheric emissivity ~0.92
    eps_sky = 0.92
    l_sky = eps_sky * SIGMA * (t_air_k ** 4)

    # Ground surface temperature under solar heating
    t_ground_k = t_air_k + 0.012 * ghi
    l_ground = SIGMA * (t_ground_k ** 4)

    # Total longwave flux incident on a standing person
    s_lw = 0.5 * l_sky + 0.5 * l_ground

    # Total radiant flux and MRT
    s_total = s_sw + s_lw
    if s_total <= 0:
        return max(-30.0, min(120.0, t_air))

    mrt_k = (s_total / SIGMA) ** 0.25
    mrt_c = mrt_k - 273.15

    return max(-30.0, min(120.0, mrt_c))
