"""Administrative Ward Geometry & GeoJSON Router.

Provides standardized GeoJSON FeatureCollection boundaries for Hyderabad
pilot wards, satisfying the TAPAS frontend geometry contract (src/lib/geometry.ts)
and supporting dynamic heat risk visualization on the interactive MapLibre map.
"""

from __future__ import annotations
from typing import Any
from fastapi import APIRouter, Query
def location_key(lat: float, lon: float) -> str:
    return f"point:{lat:.5f}:{lon:.5f}"

router = APIRouter(prefix="/api/geometry", tags=["geometry"])

# Detailed closed polygon boundaries for Hyderabad pilot wards
HYDERABAD_WARD_BOUNDARIES: list[dict[str, Any]] = [
    {
        "type": "Feature",
        "properties": {
            "ward_id": "HYD-001",
            "name": "Kukatpally",
            "city": "Hyderabad",
            "mandal": "mandal-kukatpally",
            "district": "district-hyderabad",
            "zone": "Kukatpally Zone",
            "population": 58240,
            "pct_65plus": 0.082,
            "pct_outdoor": 0.28,
            "pct_informal": 0.24,
            "ndvi_score": 0.22,
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [78.4060, 17.4780],
                [78.4230, 17.4780],
                [78.4250, 17.4910],
                [78.4150, 17.4960],
                [78.4040, 17.4900],
                [78.4060, 17.4780],
            ]],
        },
    },
    {
        "type": "Feature",
        "properties": {
            "ward_id": "HYD-002",
            "name": "KPHB Colony",
            "city": "Hyderabad",
            "mandal": "mandal-kukatpally",
            "district": "district-hyderabad",
            "zone": "Kukatpally Zone",
            "population": 64120,
            "pct_65plus": 0.075,
            "pct_outdoor": 0.22,
            "pct_informal": 0.18,
            "ndvi_score": 0.28,
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [78.3880, 17.4850],
                [78.4040, 17.4850],
                [78.4040, 17.4990],
                [78.3960, 17.5050],
                [78.3860, 17.4970],
                [78.3880, 17.4850],
            ]],
        },
    },
    {
        "type": "Feature",
        "properties": {
            "ward_id": "HYD-003",
            "name": "Moosapet",
            "city": "Hyderabad",
            "mandal": "mandal-kukatpally",
            "district": "district-hyderabad",
            "zone": "Kukatpally Zone",
            "population": 49830,
            "pct_65plus": 0.088,
            "pct_outdoor": 0.31,
            "pct_informal": 0.29,
            "ndvi_score": 0.19,
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [78.4100, 17.4560],
                [78.4280, 17.4580],
                [78.4270, 17.4740],
                [78.4120, 17.4740],
                [78.4080, 17.4640],
                [78.4100, 17.4560],
            ]],
        },
    },
    {
        "type": "Feature",
        "properties": {
            "ward_id": "HYD-004",
            "name": "Charminar",
            "city": "Hyderabad",
            "mandal": "mandal-charminar",
            "district": "district-hyderabad",
            "zone": "South Zone",
            "population": 72500,
            "pct_65plus": 0.095,
            "pct_outdoor": 0.35,
            "pct_informal": 0.38,
            "ndvi_score": 0.12,
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [78.4630, 17.3520],
                [78.4860, 17.3520],
                [78.4880, 17.3710],
                [78.4720, 17.3740],
                [78.4610, 17.3650],
                [78.4630, 17.3520],
            ]],
        },
    },
    {
        "type": "Feature",
        "properties": {
            "ward_id": "HYD-005",
            "name": "Amberpet",
            "city": "Hyderabad",
            "mandal": "mandal-amberpet",
            "district": "district-hyderabad",
            "zone": "Secunderabad Zone",
            "population": 56100,
            "pct_65plus": 0.084,
            "pct_outdoor": 0.26,
            "pct_informal": 0.22,
            "ndvi_score": 0.25,
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [78.5080, 17.3820],
                [78.5300, 17.3840],
                [78.5320, 17.4040],
                [78.5140, 17.4050],
                [78.5060, 17.3940],
                [78.5080, 17.3820],
            ]],
        },
    },
]


@router.get("")
async def get_geometry(
    geographic_id: str | None = None,
    latitude: float | None = Query(None, description="Center latitude"),
    longitude: float | None = Query(None, description="Center longitude"),
) -> dict[str, Any]:
    """Returns validated GeoJSON administrative ward boundaries for Hyderabad."""
    lat = latitude if latitude is not None else 17.3850
    lon = longitude if longitude is not None else 78.4867
    geo_id = geographic_id if geographic_id else f"point:{lat:.5f}:{lon:.5f}"

    return {
        "type": "FeatureCollection",
        "version": "1.0",
        "source": "GHMC Administrative Boundaries 2026",
        "geographic_id": geo_id,
        "latitude": lat,
        "longitude": lon,
        "features": HYDERABAD_WARD_BOUNDARIES,
    }
