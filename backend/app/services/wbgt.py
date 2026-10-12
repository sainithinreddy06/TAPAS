"""Wet Bulb Globe Temperature (WBGT) and Occupational Heat Guidance.

References:
    - Liljegren, J. C. et al. (2008). "Modeling the wet bulb globe temperature
      using standard meteorological measurements." Journal of Occupational and
      Environmental Hygiene, 5(10), 645-655.
    - Stull, R. (2011). "Wet-Bulb Temperature from Relative Humidity and Air
      Temperature." Journal of Applied Meteorology and Climatology, 50(11), 2267-2269.
    - ISO 7243:2017: "Ergonomics of the thermal environment - Assessment of heat
      stress using the WBGT (wet bulb globe temperature) index."
    - ACGIH (2020): "Threshold Limit Values for Chemical Substances and Physical Agents."

Work-rest schedules per ISO 7243 (moderate workload):
    - WBGT < 25.0 °C:  Safe (100% work / 0% rest)
    - 25.0 to 28.0 °C: Caution (75% work / 25% rest)
    - 28.0 to 32.0 °C: Warning (50% work / 50% rest)
    - >= 32.0 °C:      Danger (25% work / 75% rest, suspend heavy outdoor labour)

Contract rule:
    work_pct + rest_pct == 100.0 (±0.01) at all times.
"""

from __future__ import annotations
import math
import thermofeel


def calculate_wbgt(
    t_air: float | None,
    mrt: float | None,
    wind_10m: float | None,
    rh: float | None,
) -> float | None:
    """Compute outdoor Wet Bulb Globe Temperature (°C).

    Parameters:
        t_air: Air temperature in °C
        mrt: Mean radiant temperature in °C
        wind_10m: Wind speed in m/s at 10m
        rh: Relative humidity in percent (0 to 100)

    Returns:
        WBGT in °C or None if inputs are invalid.
    """
    if t_air is None or mrt is None or wind_10m is None or rh is None:
        return None

    if not (math.isfinite(t_air) and math.isfinite(mrt) and math.isfinite(wind_10m) and math.isfinite(rh)):
        return None

    if rh <= 0.0 or rh > 100.0 or wind_10m < 0.0:
        return None

    try:
        t_k = t_air + 273.15
        mrt_k = mrt + 273.15
        v = max(0.5, wind_10m)

        # Dew point in Kelvin (thermofeel: rh first, then t2_k)
        td_k = thermofeel.calculate_dew_point_from_relative_humidity(rh, t_k)
        wbgt_k = thermofeel.calculate_wbgt(t_k, mrt_k, v, td_k)
        res = float(wbgt_k) - 273.15
        if not math.isfinite(res):
            return None
        return res
    except Exception:
        return None


def work_rest_schedule(wbgt: float | None) -> tuple[str | None, float | None, float | None]:
    """Calculate occupational band, work percentage, and rest percentage.

    Returns:
        (band, work_pct, rest_pct) where band is 'safe' | 'caution' | 'warning' | 'danger'
        and work_pct + rest_pct == 100.0 (or all None if wbgt is None).
    """
    if wbgt is None or not math.isfinite(wbgt):
        return (None, None, None)

    if wbgt < 25.0:
        return ("safe", 100.0, 0.0)
    elif wbgt < 28.0:
        return ("caution", 75.0, 25.0)
    elif wbgt < 32.0:
        return ("warning", 50.0, 50.0)
    else:
        return ("danger", 25.0, 75.0)
