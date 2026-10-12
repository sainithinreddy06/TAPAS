from sqlalchemy import BigInteger, Integer, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, UTCDateTime, utcnow


class ResponseEvent(Base):
    __tablename__ = "response_events"
    id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    operation_id: Mapped[str] = mapped_column(ForeignKey("operations.id"), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(60), nullable=False)
    actor: Mapped[str] = mapped_column(String(254), nullable=False)
    detail: Mapped[str | None] = mapped_column(String(1000))
    created_at: Mapped[object] = mapped_column(UTCDateTime, default=utcnow, server_default=func.now(), nullable=False)
