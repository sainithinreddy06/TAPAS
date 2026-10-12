from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.auth.routes import router as auth_router
from app.config import get_settings
from app.database import SessionFactory, engine
from app.routers import (
    broadcast,
    geometry,
    health,
    operations,
    science,
    wards,
    webhooks,
)
from app.services.operations_service import expire_operations
from app.services.scheduler_tasks import (
    check_operations_escalation,
    cleanup_expired_caches,
    recompute_risk_all_wards,
    refresh_weather_cache,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Verify that the configured database is reachable.
    async with engine.connect() as connection:
        await connection.execute(text("SELECT 1"))

    scheduler = AsyncIOScheduler(timezone="UTC")

    if get_settings().scheduler_enabled:
        scheduler.add_job(
            expire_operations,
            "interval",
            minutes=1,
            args=[SessionFactory],
            max_instances=1,
            coalesce=True,
        )

        scheduler.add_job(
            refresh_weather_cache,
            "interval",
            minutes=30,
            args=[SessionFactory],
            max_instances=1,
            coalesce=True,
        )

        scheduler.add_job(
            recompute_risk_all_wards,
            "interval",
            hours=1,
            args=[SessionFactory],
            max_instances=1,
            coalesce=True,
        )

        scheduler.add_job(
            check_operations_escalation,
            "interval",
            hours=1,
            args=[SessionFactory],
            max_instances=1,
            coalesce=True,
        )

        scheduler.add_job(
            cleanup_expired_caches,
            "interval",
            hours=6,
            args=[SessionFactory],
            max_instances=1,
            coalesce=True,
        )

        scheduler.start()

    yield

    if scheduler.running:
        scheduler.shutdown(wait=False)

    await engine.dispose()


app = FastAPI(
    title="TAPAS Persistence & Scientific API",
    version="1.0.0",
    lifespan=lifespan,
    description=(
        "TAPAS (Thermal Analytics & Public-health Advisory System) - "
        "Biometeorology, risk forecasting, operational coordination, "
        "and alerting engine (SIH 2026, SIH26083)."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)


settings = get_settings()

# Include the production frontend and local development origins.
allowed_origins = [
    origin.strip().rstrip("/")
    for origin in settings.cors_origins
    if origin.strip()
]

allowed_origins.extend(
    [
        "https://tapas-heat-intelligence.netlify.app",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
)

# Remove duplicate origins while preserving order.
allowed_origins = list(dict.fromkeys(allowed_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


for router in (
    health.router,
    auth_router,
    wards.router,
    operations.router,
    science.router,
    geometry.router,
    webhooks.router,
    broadcast.router,
):
    app.include_router(router)
