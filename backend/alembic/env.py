import asyncio
from alembic import context
from app.database import make_engine
from app.config import get_settings
from app.models import Base

settings = get_settings()
target_metadata = Base.metadata


def configure(connection):
    context.configure(connection=connection, target_metadata=target_metadata,
                      compare_type=True, render_as_batch=connection.dialect.name == "sqlite")
    with context.begin_transaction():
        context.run_migrations()


async def online():
    engine = make_engine(settings.database_url, settings.spatialite_library_path)
    async with engine.connect() as connection:
        await connection.run_sync(configure)
    await engine.dispose()


if context.is_offline_mode():
    context.configure(url=settings.database_url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()
else:
    asyncio.run(online())
