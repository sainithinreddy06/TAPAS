from sqlalchemy import Boolean, ForeignKey, JSON, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, UTCDateTime, new_id, utcnow


class BroadcastRecipient(Base):
    __tablename__ = "broadcast_recipients"

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=new_id)
    ward_id: Mapped[str | None] = mapped_column(String(40), index=True, nullable=True)
    zone: Mapped[str] = mapped_column(String(100), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    role: Mapped[str] = mapped_column(String(60), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    channels: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    language: Mapped[str] = mapped_column(String(20), default="en-IN", nullable=False)
    consent_at: Mapped[object | None] = mapped_column(UTCDateTime, nullable=True)
    opted_out_at: Mapped[object | None] = mapped_column(UTCDateTime, nullable=True)
    added_by: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[object] = mapped_column(UTCDateTime, default=utcnow, nullable=False)
