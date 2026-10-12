"""Add derivation_note, osm_id and broadcast_recipients table.

Revision ID: 0003_real_data_and_broadcast
Revises: 0002_weather_cache
Create Date: 2026-09-10
"""
from alembic import op
import sqlalchemy as sa

revision = "0003_real_data_and_broadcast"
down_revision = "0002_weather_cache"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    insp = sa.inspect(bind)

    # 1. Update wards with derivation_note
    ward_cols = [c["name"] for c in insp.get_columns("wards")]
    if "derivation_note" not in ward_cols:
        op.add_column("wards", sa.Column("derivation_note", sa.Text(), nullable=True))

    # 2. Update facilities with osm_id
    fac_cols = [c["name"] for c in insp.get_columns("facilities")]
    if "osm_id" not in fac_cols:
        op.add_column("facilities", sa.Column("osm_id", sa.String(length=80), nullable=True))

    # 3. Create broadcast_recipients
    if "broadcast_recipients" not in insp.get_table_names():
        op.create_table(
            "broadcast_recipients",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("ward_id", sa.String(length=40), nullable=True),
            sa.Column("zone", sa.String(length=100), nullable=False),
            sa.Column("name", sa.String(length=120), nullable=False),
            sa.Column("role", sa.String(length=60), nullable=False),
            sa.Column("phone", sa.String(length=20), nullable=False),
            sa.Column("channels", sa.JSON(), nullable=False),
            sa.Column("language", sa.String(length=20), server_default="en-IN", nullable=False),
            sa.Column("consent_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("opted_out_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("added_by", sa.String(length=36), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("is_demo", sa.Boolean(), server_default=sa.text("0"), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_broadcast_recipients_ward_id", "broadcast_recipients", ["ward_id"])
        op.create_index("ix_broadcast_recipients_phone", "broadcast_recipients", ["phone"])


def downgrade():
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if "broadcast_recipients" in insp.get_table_names():
        op.drop_table("broadcast_recipients")
