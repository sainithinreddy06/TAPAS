from sqlalchemy import Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import UserDefinedType
from app.models.base import Base


class Polygon4326(UserDefinedType):
    cache_ok = True

    def get_col_spec(self, **kwargs):
        return "GEOMETRY(POLYGON,4326)"


class Ward(Base):
    __tablename__ = "wards"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    city: Mapped[str] = mapped_column(String(120), default="Hyderabad", nullable=False)
    mandal: Mapped[str | None] = mapped_column(String(100), index=True)
    district: Mapped[str | None] = mapped_column(String(100), index=True)
    state: Mapped[str] = mapped_column(String(100), default="Telangana")
    geom: Mapped[str | None] = mapped_column(Text().with_variant(Polygon4326(), "postgresql"), nullable=True)
    centroid_lat: Mapped[float] = mapped_column(Float, nullable=False)
    centroid_lon: Mapped[float] = mapped_column(Float, nullable=False)
    population: Mapped[int | None] = mapped_column(Integer)
    pct_65plus: Mapped[float | None] = mapped_column(Float)
    pct_outdoor: Mapped[float | None] = mapped_column(Float)
    pct_informal: Mapped[float | None] = mapped_column(Float)
    ndvi_score: Mapped[float | None] = mapped_column(Float)
    health_access: Mapped[float | None] = mapped_column(Float)
    koppen_zone: Mapped[str] = mapped_column(String(10), default="BSh")
    derivation_note: Mapped[str | None] = mapped_column(Text, nullable=True)
