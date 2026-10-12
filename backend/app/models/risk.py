from sqlalchemy import CheckConstraint, Date, Float, ForeignKey, SmallInteger, String, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, UTCDateTime, new_id, utcnow


class RiskForecast(Base):
    __tablename__ = "risk_forecasts"
    __table_args__ = (UniqueConstraint("ward_id", "date", "model_source"), CheckConstraint("risk_level BETWEEN 1 AND 5"))
    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=new_id)
    ward_id: Mapped[str] = mapped_column(ForeignKey("wards.id"), nullable=False, index=True)
    date: Mapped[object] = mapped_column(Date, nullable=False)
    risk_level: Mapped[int | None] = mapped_column(SmallInteger)
    utci_max: Mapped[float | None] = mapped_column(Float)
    wbgt_max: Mapped[float | None] = mapped_column(Float)
    excess_deaths: Mapped[float | None] = mapped_column(Float)
    model_source: Mapped[str] = mapped_column(String(200), nullable=False)
    generated_at: Mapped[object] = mapped_column(UTCDateTime, default=utcnow, nullable=False)
