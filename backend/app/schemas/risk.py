from datetime import date, datetime
from pydantic import BaseModel, ConfigDict


class RiskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    ward_id: str
    date: date
    risk_level: int | None
    utci_max: float | None
    wbgt_max: float | None
    excess_deaths: float | None
    model_source: str
    generated_at: datetime
