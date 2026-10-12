from sqlalchemy import JSON, Float, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, UTCDateTime, new_id, utcnow


class WeatherCache(Base):
    __tablename__ = "weather_cache"
    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=new_id)
    cache_key: Mapped[str] = mapped_column(String(120), unique=True, index=True, nullable=False)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lon: Mapped[float] = mapped_column(Float, nullable=False)
    provider: Mapped[str] = mapped_column(String(100), default="open-meteo", nullable=False)
    fetched_at: Mapped[object] = mapped_column(UTCDateTime, default=utcnow, nullable=False)
    data: Mapped[dict] = mapped_column(JSON, nullable=False)
