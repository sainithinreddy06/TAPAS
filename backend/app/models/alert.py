from sqlalchemy import Boolean, CheckConstraint, ForeignKey, SmallInteger, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, UTCDateTime, new_id, utcnow


class Alert(Base):
    __tablename__ = "alerts"
    __table_args__ = (CheckConstraint("alert_level BETWEEN 1 AND 5"),)
    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=new_id)
    ward_id: Mapped[str] = mapped_column(ForeignKey("wards.id"), nullable=False, index=True)
    operation_id: Mapped[str | None] = mapped_column(ForeignKey("operations.id"))
    alert_level: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    headline: Mapped[str] = mapped_column(String(200), nullable=False)
    issued_at: Mapped[object] = mapped_column(UTCDateTime, default=utcnow, nullable=False)
    expires_at: Mapped[object] = mapped_column(UTCDateTime, nullable=False)
    cap_xml: Mapped[str | None] = mapped_column(Text)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
