from sqlalchemy import Float, ForeignKey, String, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, UTCDateTime, new_id


class ThermalMetric(Base):
    __tablename__ = "thermal_metrics"
    __table_args__ = (UniqueConstraint("ward_id", "valid_at", "model_source"),)
    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=new_id)
    ward_id: Mapped[str] = mapped_column(ForeignKey("wards.id"), nullable=False, index=True)
    valid_at: Mapped[object] = mapped_column(UTCDateTime, nullable=False)
    utci: Mapped[float | None] = mapped_column(Float)
    wbgt: Mapped[float | None] = mapped_column(Float)
    heat_index: Mapped[float | None] = mapped_column(Float)
    model_source: Mapped[str] = mapped_column(String(200), nullable=False)
