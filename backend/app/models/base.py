from datetime import datetime, timezone
from uuid import uuid4
from sqlalchemy import DateTime, String, Enum
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.types import TypeDecorator


class Base(DeclarativeBase):
    pass


def new_id():
    return str(uuid4())


def utcnow():
    return datetime.now(timezone.utc)


class UTCDateTime(TypeDecorator):
    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if value.tzinfo is None:
            raise ValueError("Timestamp must include a timezone.")
        return value.astimezone(timezone.utc)

    def process_result_value(self, value, dialect):
        return value.replace(tzinfo=timezone.utc) if value and value.tzinfo is None else value


def choice(name, *values):
    return Enum(*values, name=name, native_enum=False, create_constraint=True, validate_strings=True)
