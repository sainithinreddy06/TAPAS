from sqlalchemy import Float, ForeignKey, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, UTCDateTime, choice, new_id, utcnow


class Incident(Base):
    __tablename__ = "incidents"
    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=new_id)
    ward_id: Mapped[str] = mapped_column(ForeignKey("wards.id"), nullable=False, index=True)
    operation_id: Mapped[str | None] = mapped_column(ForeignKey("operations.id"))
    category: Mapped[str] = mapped_column(choice("incident_category", "heat_illness", "water_shortage", "facility_issue", "other"), nullable=False)
    severity: Mapped[str] = mapped_column(choice("incident_severity", "low", "medium", "high", "critical"), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    reported_by: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    location_lat: Mapped[float | None] = mapped_column(Float)
    location_lon: Mapped[float | None] = mapped_column(Float)
    status: Mapped[str] = mapped_column(choice("incident_status", "open", "acknowledged", "resolved"), default="open", nullable=False)
    created_at: Mapped[object] = mapped_column(UTCDateTime, default=utcnow, nullable=False)
