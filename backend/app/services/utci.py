"""Universal Thermal Climate Index (UTCI) Engine.

References:
    - Bröde, P. et al. (2012). "Deriving the operational procedure for the
      Universal Thermal Climate Index (UTCI)." International Journal of
      Biometeorology, 56(3), 481-494.
    - COST Action 730: "Towards a universal thermal climate index UTCI for
      assessing the thermal environment of the human being."
    - ECMWF thermofeel reference library.

Inputs:
    - T_air: Ambient 2m air temperature (°C)
    - MRT: Mean Radiant Temperature (°C)
    - wind_10m: Wind speed at 10m height (m/s)
    - RH: Relative humidity (%)

Validity domain (strict — returns None outside, never extrapolates):
    - T_air: -50.0 to +50.0 °C
    - MRT - T_air: -30.0 to +70.0 K
    - wind_10m: 0.5 to 17.0 m/s (clamped from 0.0 -> 0.5 at low end)
    - vapour_pressure: < 5.0 kPa

Official UTCI Thermal Stress Scale:
    > 46 °C       Extreme heat stress       -> Risk level 5
    38 to 46 °C   Very strong heat stress   -> Risk level 4
    32 to 38 °C   Strong heat stress        -> Risk level 3
    26 to 32 °C   Moderate heat stress      -> Risk level 2
    9 to 26 °C    No thermal stress         -> Risk level 1
    < 9 °C        Cold stress categories    -> Risk level 1
"""

from __future__ import annotations
import math
import thermofeel


def calculate_vapour_pressure_kpa(t_air: float, rh: float) -> float:
    """Calculate actual water vapour pressure in kPa using the Magnus-Tetens formula.

    e_s(T) = 0.61078 * exp(17.27 * T / (T + 237.3))  [kPa]
    e = (RH / 100) * e_s
    """
    es = 0.61078 * math.exp((17.27 * t_air) / (t_air + 237.3))
    return (rh / 100.0) * es


def calculate_utci(
    t_air: float | None,
    mrt: float | None,
    wind_10m: float | None,
    rh: float | None,
) -> float | None:
    """Compute Universal Thermal Climate Index (°C).

    Returns None if any input is missing or outside the strict scientific validity domain.
    """
    if t_air is None or mrt is None or wind_10m is None or rh is None:
        return None

    if not (math.isfinite(t_air) and math.isfinite(mrt) and math.isfinite(wind_10m) and math.isfinite(rh)):
        return None

    # Domain check 1: Air temperature -50 to +50 °C
    if t_air < -50.0 or t_air > 50.0:
        return None

    # Domain check 2: Thermal radiation difference (MRT - T_air) -30 to +70 K
    delta_t = mrt - t_air
    if delta_t < -30.0 or delta_t > 70.0:
        return None

    # Domain check 3: Wind speed 0 to 17 m/s (clamp 0..0.5 to 0.5)
    if wind_10m < 0.0 or wind_10m > 17.0:
        return None
    v10 = max(0.5, wind_10m)

    # Domain check 4: Relative humidity 0 to 100%
    if rh < 0.0 or rh > 100.0:
        return None

    # Domain check 5: Vapour pressure < 5.0 kPa
    e_kpa = calculate_vapour_pressure_kpa(t_air, rh)
    if e_kpa >= 5.0:
        return None

    # Compute using ECMWF thermofeel reference engine
    try:
        t_air_k = t_air + 273.15
        mrt_k = mrt + 273.15
        e_hpa = e_kpa * 10.0  # 1 kPa = 10 hPa
        utci_k = thermofeel.calculate_utci(t_air_k, v10, mrt_k, ehPa=e_hpa)
        res = float(utci_k) - 273.15
        if not math.isfinite(res):
            return None
        return res
    except Exception:
        return None


def utci_category(utci: float | None) -> tuple[str, int]:
    """Map UTCI value to standard category and discrete risk level (1-5)."""
    if utci is None:
        return ("Unavailable", 1)
    if utci > 46.0:
        return ("Extreme heat stress", 5)
    if utci >= 38.0:
        return ("Very strong heat stress", 4)
    if utci >= 32.0:
        return ("Strong heat stress", 3)
    if utci >= 26.0:
        return ("Moderate heat stress", 2)
    if utci >= 9.0:
        return ("No thermal stress", 1)
    if utci >= 0.0:
        return ("Slight cold stress", 1)
    if utci >= -13.0:
        return ("Moderate cold stress", 1)
    if utci >= -27.0:
        return ("Strong cold stress", 1)
    if utci >= -40.0:
        return ("Very strong cold stress", 1)
    return ("Extreme cold stress", 1)
