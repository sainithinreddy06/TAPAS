import os
from pathlib import Path
from collections.abc import AsyncIterator
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.config import get_settings

_dll_handles = []


def make_engine(url: str, spatialite_path: str = ""):
    engine = create_async_engine(url, pool_pre_ping=True)
    if url.startswith("sqlite"):
        library = str(Path(spatialite_path).resolve())
        if not Path(library).is_file():
            raise RuntimeError("Configured SpatiaLite extension does not exist: " + library)
        if os.name == "nt":
            _dll_handles.append(os.add_dll_directory(str(Path(library).parent)))

        @event.listens_for(engine.sync_engine, "connect")
        def configure_sqlite(connection, _record):
            async def configure(driver):
                await driver.enable_load_extension(True)
                try:
                    await driver.load_extension(library)
                finally:
                    await driver.enable_load_extension(False)
                await driver.execute("PRAGMA foreign_keys=ON")
                await driver.execute("PRAGMA busy_timeout=10000")
            connection.run_async(configure)
    return engine


settings = get_settings()
engine = make_engine(settings.database_url, settings.spatialite_library_path)
SessionFactory = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncIterator[AsyncSession]:
    async with SessionFactory() as session:
        yield session
