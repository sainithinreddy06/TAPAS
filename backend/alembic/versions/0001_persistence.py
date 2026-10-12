"""Initial TAPAS persistence schema, spatial support and append-only audit."""
from alembic import op
from app.models import Base
revision = "0001_persistence"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    else:
        exists = bind.exec_driver_sql("SELECT name FROM sqlite_master WHERE name='spatial_ref_sys'").scalar()
        if not exists:
            bind.exec_driver_sql("SELECT InitSpatialMetaData(1)")
    Base.metadata.create_all(bind)
    if bind.dialect.name == "postgresql":
        op.execute("""CREATE FUNCTION tapas_audit_immutable() RETURNS trigger AS $$
        BEGIN RAISE EXCEPTION 'response_events is append-only'; END;
        $$ LANGUAGE plpgsql""")
        op.execute("""CREATE TRIGGER response_events_immutable BEFORE UPDATE OR DELETE ON response_events
        FOR EACH ROW EXECUTE FUNCTION tapas_audit_immutable()""")
    else:
        for action in ("UPDATE", "DELETE"):
            op.execute(f"""CREATE TRIGGER response_events_no_{action.lower()}
            BEFORE {action} ON response_events BEGIN
            SELECT RAISE(ABORT, 'response_events is append-only'); END""")


def downgrade():
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("DROP TRIGGER IF EXISTS response_events_immutable ON response_events")
        op.execute("DROP FUNCTION IF EXISTS tapas_audit_immutable")
    else:
        op.execute("DROP TRIGGER IF EXISTS response_events_no_update")
        op.execute("DROP TRIGGER IF EXISTS response_events_no_delete")
    Base.metadata.drop_all(bind)
