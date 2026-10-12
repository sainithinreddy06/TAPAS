"""Add weather cache table.

Revision ID: 0002_weather_cache
Revises: 0001_persistence
Create Date: 2026-09-09
"""
from alembic import op
import sqlalchemy as sa

revision = "0002_weather_cache"
down_revision = "0001_persistence"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if "weather_cache" not in insp.get_table_names():
        op.create_table(
            "weather_cache",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("cache_key", sa.String(length=120), nullable=False),
            sa.Column("lat", sa.Float(), nullable=False),
            sa.Column("lon", sa.Float(), nullable=False),
            sa.Column("provider", sa.String(length=100), nullable=False),
            sa.Column("fetched_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("data", sa.JSON(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_weather_cache_cache_key", "weather_cache", ["cache_key"], unique=True)


def downgrade():
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if "weather_cache" in insp.get_table_names():
        op.drop_index("ix_weather_cache_cache_key", table_name="weather_cache")
        op.drop_table("weather_cache")
