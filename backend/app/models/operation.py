from sqlalchemy import Boolean, CheckConstraint, ForeignKey, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, UTCDateTime, choice, new_id, utcnow


class ResponseOperation(Base):
    __tablename__ = "operations"
    __table_args__ = (CheckConstraint("alert_level IN (4, 5)", name="operation_alert_level"),
                      CheckConstraint("risk_window_end > risk_window_start", name="operation_risk_window"))
    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=new_id)
    ward_id: Mapped[str] = mapped_column(ForeignKey("wards.id"), nullable=False, index=True)
    alert_level: Mapped[int] = mapped_column(__import__("sqlalchemy").SmallInteger, nullable=False)
    reference_id: Mapped[str] = mapped_column(String(120), nullable=False, unique=True)
    risk_window_start: Mapped[object] = mapped_column(UTCDateTime, nullable=False)
    risk_window_end: Mapped[object] = mapped_column(UTCDateTime, nullable=False, index=True)
    activated_by: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    activated_at: Mapped[object] = mapped_column(UTCDateTime, default=utcnow, nullable=False)
    status: Mapped[str] = mapped_column(choice("operation_status", "active", "escalated", "completed", "expired"), default="active", nullable=False)
    cap_xml: Mapped[str | None] = mapped_column(Text)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class ResponseRecipient(Base):
    __tablename__ = "recipients"
    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=new_id)
    operation_id: Mapped[str] = mapped_column(ForeignKey("operations.id"), nullable=False, index=True)
    recipient_type: Mapped[str] = mapped_column(String(40), nullable=False)
    name: Mapped[str | None] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    message_body: Mapped[str] = mapped_column(Text, nullable=False)
    action_token: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    token_expires: Mapped[object] = mapped_column(UTCDateTime, nullable=False)
    delivery_status: Mapped[str] = mapped_column(choice("delivery_status", "queued", "sent", "delivered", "read", "failed"), default="queued", nullable=False)
    operational_status: Mapped[str] = mapped_column(choice("operational_status", "not_acknowledged", "acknowledged", "in_progress", "needs_assistance", "completed", "unable_to_comply"), default="not_acknowledged", nullable=False)
    provider_message_id: Mapped[str | None] = mapped_column(String(100), unique=True)
    error_code: Mapped[str | None] = mapped_column(String(80))
    delivery_updated_at: Mapped[object | None] = mapped_column(UTCDateTime)
    operational_updated_at: Mapped[object | None] = mapped_column(UTCDateTime)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    opted_out: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    opted_out_at: Mapped[object | None] = mapped_column(UTCDateTime)


class PhoneOptOut(Base):
    __tablename__ = "phone_opt_outs"
    phone: Mapped[str] = mapped_column(String(20), primary_key=True)
    created_at: Mapped[object] = mapped_column(UTCDateTime, default=utcnow, nullable=False)


class WebhookReceipt(Base):
    __tablename__ = "webhook_receipts"
    event_key: Mapped[str] = mapped_column(String(64), primary_key=True)
    kind: Mapped[str] = mapped_column(String(20), nullable=False)
    provider_message_id: Mapped[str] = mapped_column(String(100), nullable=False)
    received_at: Mapped[object] = mapped_column(UTCDateTime, default=utcnow, nullable=False)
