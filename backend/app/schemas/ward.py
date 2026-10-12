from pydantic import BaseModel, ConfigDict


class WardOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    city: str
    mandal: str | None
    district: str | None
    state: str
    centroid_lat: float
    centroid_lon: float
    population: int | None
    pct_65plus: float | None
    pct_outdoor: float | None
    pct_informal: float | None
    ndvi_score: float | None
    health_access: float | None
    koppen_zone: str
    derivation_note: str | None = None
