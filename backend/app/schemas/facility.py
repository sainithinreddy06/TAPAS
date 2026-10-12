from datetime import date
from pydantic import BaseModel, ConfigDict


class FacilityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    ward_id: str
    name: str
    facility_type: str
    lat: float
    lon: float
    address: str | None
    phone: str | None
    capacity: int | None
    source: str
    is_demo: bool
    osm_id: str | None = None
    last_verified: date | None
