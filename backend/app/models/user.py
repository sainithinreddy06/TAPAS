from sqlalchemy import Boolean, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, UTCDateTime, choice, new_id, utcnow


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=new_id)
    email: Mapped[str] = mapped_column(String(254), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    role: Mapped[str] = mapped_column(choice("user_role", "citizen", "municipal_officer", "higher_authority"), nullable=False)
    jurisdiction_id: Mapped[str | None] = mapped_column(String(100))
    jurisdiction_level: Mapped[str | None] = mapped_column(choice("jurisdiction_level", "ward", "mandal", "district", "state"))
    is_demo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[object] = mapped_column(UTCDateTime, default=utcnow, nullable=False)
