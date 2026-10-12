from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.auth.deps import get_current_user, jurisdiction_filter, require_jurisdiction
from app.database import get_db
from app.models import Alert, User, Ward

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("")
async def alerts(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return (await db.scalars(select(Alert).join(Ward).where(jurisdiction_filter(user)).order_by(Alert.issued_at.desc()).limit(100))).all()


@router.get("/{alert_id}/cap")
async def cap(alert_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    alert = await db.get(Alert, str(alert_id))
    if not alert:
        raise HTTPException(404, "Alert not found.")
    await require_jurisdiction(alert.ward_id, user, db)
    if not alert.cap_xml:
        raise HTTPException(404, "CAP document not available.")
    return Response(alert.cap_xml, media_type="application/xml")
