import re
from datetime import datetime
from pydantic import BaseModel, Field, field_validator


class RecipientCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    role: str = Field(..., min_length=2, max_length=60)
    phone: str = Field(..., description="E.164 phone number, e.g. +919849012345")
    channels: list[str] = Field(default_factory=lambda: ["whatsapp", "sms"])
    language: str = Field(default="en-IN")
    consent: bool = Field(..., description="Mandatory consent confirmation")
    zone: str | None = None
    ward_id: str | None = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        cleaned = re.sub(r"[\s\-]", "", v.strip())
        if not re.fullmatch(r"\+[1-9]\d{9,14}", cleaned):
            raise ValueError("Phone number must be in valid E.164 format (e.g. +919849012345).")
        return cleaned

    @field_validator("consent")
    @classmethod
    def validate_consent(cls, v: bool) -> bool:
        if not v:
            raise ValueError("Explicit consent is required to register a broadcast recipient.")
        return v


class RecipientUpdate(BaseModel):
    name: str | None = None
    role: str | None = None
    phone: str | None = None
    channels: list[str] | None = None
    language: str | None = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str | None) -> str | None:
        if v is None:
            return None
        cleaned = re.sub(r"[\s\-]", "", v.strip())
        if not re.fullmatch(r"\+[1-9]\d{9,14}", cleaned):
            raise ValueError("Phone number must be in valid E.164 format (e.g. +919849012345).")
        return cleaned


class RecipientOut(BaseModel):
    id: str
    name: str
    role: str
    phone: str  # Masked e.g. +91 98••• •••21
    raw_phone: str | None = None  # Revealed only when editing
    channels: list[str]
    language: str
    zone: str
    ward_id: str | None
    consent_at: datetime | None
    opted_out_at: datetime | None
    delivery_status: str | None = "queued"
    response_status: str | None = "Awaiting"
    is_demo: bool = False
    created_at: datetime


class BroadcastSendRequest(BaseModel):
    template: str = Field("TAPAS Extreme Heat Alert: Stay hydrated, check vulnerable residents.")
    zone: str | None = None
    ward_id: str | None = None
    channels: list[str] | None = None
    recipient_ids: list[str] | None = None


class BroadcastSendResponse(BaseModel):
    broadcast_id: str
    ref: str
    total_recipients: int
    sent_count: int
    delivered_count: int
    failed_count: int
    acknowledged_count: int
    recipients_status: list[dict]
