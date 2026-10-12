from datetime import datetime, timedelta
from typing import Literal
from pydantic import AliasChoices, AwareDatetime, BaseModel, ConfigDict, Field, model_validator
from app.models.base import utcnow


class RecipientCreate(BaseModel):
    recipient_type: Literal["ward_member", "asha", "labour_union", "healthcare", "citizen"]
    name: str = Field(min_length=1, max_length=120)
    phone: str = Field(pattern=r"^\+[1-9]\d{7,14}$")
    message_body: str | None = Field(default=None, max_length=1200)


class ActivateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    ward_id: str = Field(min_length=1, max_length=40)
    ward_name: str | None = None
    alert_level: Literal[4, 5] = Field(default=5, validation_alias=AliasChoices("alert_level", "risk_level"))
    reference_id: str | None = Field(default=None, min_length=1, max_length=100, pattern=r"^[A-Za-z0-9_-]+$", validation_alias=AliasChoices("reference_id", "reference"))
    risk_window_start: AwareDatetime | None = None
    risk_window_end: AwareDatetime | None = None
    recipients: list[RecipientCreate] = Field(default_factory=list)
    groups: list[str] | None = None

    @model_validator(mode="after")
    def valid_window(self):
        now = utcnow()
        if self.risk_window_start is None:
            self.risk_window_start = now
        if self.risk_window_end is None:
            self.risk_window_end = now + timedelta(hours=8)
        if self.risk_window_end <= self.risk_window_start or self.risk_window_end <= now:
            raise ValueError("The risk window must have positive duration and end in the future.")
        if self.recipients:
            phones = [recipient.phone for recipient in self.recipients]
            if len(phones) != len(set(phones)):
                raise ValueError("Each phone can have only one assignment per operation.")
        return self


class RespondRequest(BaseModel):
    action: Literal["acknowledge", "start", "help", "complete"]


class RecipientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    operation_id: str
    recipient_type: str
    name: str | None
    phone: str
    message_body: str
    action_token: str
    token_expires: datetime
    delivery_status: str
    operational_status: str
    provider_message_id: str | None
    error_code: str | None
    delivery_updated_at: datetime | None
    operational_updated_at: datetime | None
    is_demo: bool
    opted_out: bool


class EventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    operation_id: str
    event_type: str
    actor: str
    detail: str | None
    created_at: datetime


class OperationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    ward_id: str
    alert_level: int
    reference_id: str
    risk_window_start: datetime
    risk_window_end: datetime
    activated_by: str
    activated_at: datetime
    status: str
    cap_xml: str | None
    is_demo: bool
    recipients: list[RecipientOut] = Field(default_factory=list)
    timeline: list[EventOut] = Field(default_factory=list)
    success: bool = True
    operation_id: str | None = None
    channels: dict | None = None
    message: str | None = None


class IncidentCreate(BaseModel):
    ward_id: str
    operation_id: str | None = None
    category: Literal["heat_illness", "water_shortage", "facility_issue", "other"]
    severity: Literal["low", "medium", "high", "critical"]
    notes: str = Field(min_length=1, max_length=4000)
    location_lat: float | None = Field(default=None, ge=-90, le=90)
    location_lon: float | None = Field(default=None, ge=-180, le=180)

    @model_validator(mode="after")
    def paired_coordinates(self):
        if (self.location_lat is None) != (self.location_lon is None):
            raise ValueError("Provide both latitude and longitude, or neither.")
        return self


class OperationStatusRequest(BaseModel):
    status: Literal["escalated", "completed"]
