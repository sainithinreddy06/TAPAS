from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.auth.routes import router as auth_router
from app.config import get_settings
from app.database import SessionFactory, engine
from app.routers import broadcast, geometry, health, operations, science, wards, webhooks
from app.services.operations_service import expire_operations
from app.services.scheduler_tasks import (
    check_operations_escalation,
    cleanup_expired_caches,
    recompute_risk_all_wards,
    refresh_weather_cache,
)


@asynccontextmanager
async def lifespan(app):
    async with engine.connect() as connection:
        await connection.execute(text("SELECT 1"))
    scheduler = AsyncIOScheduler(timezone="UTC")
    if get_settings().scheduler_enabled:
        # Every 1 minute: expire operations whose risk window ended
        scheduler.add_job(expire_operations, "interval", minutes=1,
                          args=[SessionFactory], max_instances=1, coalesce=True)
        # Every 30 minutes: refresh weather cache for seeded wards
        scheduler.add_job(refresh_weather_cache, "interval", minutes=30,
                          args=[SessionFactory], max_instances=1, coalesce=True)
        # Every 1 hour: recompute risk for all wards
        scheduler.add_job(recompute_risk_all_wards, "interval", hours=1,
                          args=[SessionFactory], max_instances=1, coalesce=True)
        # Every 1 hour: check active operations for escalation thresholds
        #   Level 5: unacknowledged >15 min -> status='escalated', timeline event
        #   Level 4: unacknowledged >30 min -> flag
        scheduler.add_job(check_operations_escalation, "interval", hours=1,
                          args=[SessionFactory], max_instances=1, coalesce=True)
        # Every 6 hours: clean up expired caches
        scheduler.add_job(cleanup_expired_caches, "interval", hours=6,
                          args=[SessionFactory], max_instances=1, coalesce=True)
        scheduler.start()
    yield
    if scheduler.running:
        scheduler.shutdown(wait=False)
    await engine.dispose()


app = FastAPI(
    title="TAPAS Persistence & Scientific API",
    version="1.0.0",
    lifespan=lifespan,
    description="TAPAS (Thermal Analytics & Public-health Advisory System) - Complete biometeorology, risk forecasting, jurisdiction-enforced operational coordination, and official alerting engine (SIH 2026, SIH26083).",
)

# W4: CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,  # needed for cookie auth
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in (health.router, auth_router, wards.router, operations.router, science.router, geometry.router, webhooks.router, broadcast.router):
    app.include_router(router)
