"""
TAPAS Background Scheduler Tasks
--------------------------------
Implements idempotent background routines:
- Refresh weather cache for seeded wards (every 30 min)
- Recompute risk for all wards (every 1 hour)
- Check active operations for escalation thresholds (every 1 hour)
    Level 5: unacknowledged >15 min -> status='escalated', timeline event
    Level 4: unacknowledged >30 min -> flag
- Clean up expired caches (every 6 hours)
- Expire operations whose risk window has ended (every 1 minute)
"""
from datetime import datetime, timedelta, timezone
from sqlalchemy import delete, select
from app.models import ResponseEvent, ResponseOperation, ResponseRecipient, Ward, WeatherCache
from app.models.base import utcnow
from app.services import weather_service
from app.services.risk_engine import compute_ward_risk


async def refresh_weather_cache(session_factory):
    """Refreshes Open-Meteo weather cache for all registered wards."""
    async with session_factory() as db:
        wards = (await db.scalars(select(Ward))).all()
        for ward in wards:
            try:
                await weather_service.fetch_weather(ward.centroid_lat, ward.centroid_lon, db=db)
            except Exception:
                # Do not interrupt remaining wards if one fails
                continue
        await db.commit()


async def recompute_risk_all_wards(session_factory):
    """Recomputes epidemiological risk for all registered wards."""
    async with session_factory() as db:
        wards = (await db.scalars(select(Ward))).all()
        for ward in wards:
            try:
                weather_data = await weather_service.fetch_weather(ward.centroid_lat, ward.centroid_lon, db=db)
                hourly = weather_data.get("hourly", {})
                times = hourly.get("time", [])
                temps = hourly.get("temperature_2m", [])
                rhs = hourly.get("relative_humidity_2m", [])
                winds = hourly.get("wind_speed_10m", [])

                thermal_data = []
                for i in range(min(48, len(times))):
                    t = temps[i] if i < len(temps) else 30.0
                    rh = rhs[i] if i < len(rhs) else 50.0
                    w = winds[i] if i < len(winds) else 2.0
                    thermal_data.append({
                        "time": times[i] if i < len(times) else "",
                        "air_temp": t,
                        "relative_humidity": rh,
                        "wind_speed": w,
                        "utci": t + 2.0,  # approximate baseline
                        "wbgt": t - 2.0,
                    })

                compute_ward_risk(ward, thermal_data)
            except Exception:
                continue


async def check_operations_escalation(session_factory):
    """
    Checks active operations for escalation thresholds:
    - Level 5: unacknowledged >15 min -> status='escalated', timeline event
    - Level 4: unacknowledged >30 min -> escalation warning flag in timeline
    Idempotent: running twice produces the exact same state without duplicate events.
    """
    async with session_factory() as db:
        now = utcnow()
        active_ops = (await db.scalars(
            select(ResponseOperation).where(ResponseOperation.status.in_(["active", "escalated"]))
        )).all()

        for op in active_ops:
            recipients = (await db.scalars(
                select(ResponseRecipient).where(ResponseRecipient.operation_id == op.id)
            )).all()

            if not recipients:
                continue

            has_unacknowledged = any(r.operational_status == "not_acknowledged" for r in recipients)
            if not has_unacknowledged:
                continue

            # Calculate duration in minutes since activation
            activated_dt = op.activated_at
            if activated_dt.tzinfo is None:
                activated_dt = activated_dt.replace(tzinfo=timezone.utc)
            duration_minutes = (now - activated_dt).total_seconds() / 60.0

            # Level 5 threshold: >15 min
            if op.alert_level == 5 and duration_minutes >= 15.0:
                if op.status != "escalated":
                    op.status = "escalated"
                    db.add(ResponseEvent(
                        operation_id=op.id,
                        event_type="escalated",
                        actor="system",
                        detail=f"Level 5 emergency operation unacknowledged for {int(duration_minutes)} minutes. Automatically escalated to higher authority."
                    ))

            # Level 4 threshold: >30 min
            elif op.alert_level == 4 and duration_minutes >= 30.0:
                # Check if warning already recorded
                existing_warning = await db.scalar(
                    select(ResponseEvent.id).where(
                        ResponseEvent.operation_id == op.id,
                        ResponseEvent.event_type == "escalation_warning"
                    ).limit(1)
                )
                if not existing_warning:
                    db.add(ResponseEvent(
                        operation_id=op.id,
                        event_type="escalation_warning",
                        actor="system",
                        detail=f"Level 4 operation unacknowledged for {int(duration_minutes)} minutes. Flagged for supervisory follow-up."
                    ))

        await db.commit()


async def cleanup_expired_caches(session_factory):
    """Cleans up expired weather cache records older than 24 hours."""
    async with session_factory() as db:
        cutoff = utcnow() - timedelta(hours=24)
        await db.execute(
            delete(WeatherCache).where(WeatherCache.fetched_at < cutoff)
        )
        await db.commit()
