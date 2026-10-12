from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.auth.deps import get_current_user, jurisdiction_filter, require_jurisdiction
from app.database import get_db
from app.models import Facility, RiskForecast, ThermalMetric, User, Ward, WeatherObservation
from app.schemas.ward import WardOut
from app.schemas.facility import FacilityOut
from app.schemas.risk import RiskOut

router = APIRouter(prefix="/api/wards", tags=["wards"])


@router.get("", response_model=list[WardOut])
async def wards(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return (await db.scalars(select(Ward).where(jurisdiction_filter(user)).order_by(Ward.id))).all()


@router.get("/{ward_id}", response_model=WardOut)
async def ward(ward_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await require_jurisdiction(ward_id, user, db)


@router.get("/{ward_id}/facilities", response_model=list[FacilityOut])
async def facilities(ward_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await require_jurisdiction(ward_id, user, db)
    return (await db.scalars(select(Facility).where(Facility.ward_id == ward_id).order_by(Facility.name))).all()


@router.get("/{ward_id}/risk", response_model=list[RiskOut])
async def risk(ward_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await require_jurisdiction(ward_id, user, db)
    return (await db.scalars(select(RiskForecast).where(RiskForecast.ward_id == ward_id).order_by(RiskForecast.date.desc()).limit(100))).all()


@router.get("/{ward_id}/weather")
async def weather(ward_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await require_jurisdiction(ward_id, user, db)
    return (await db.scalars(select(WeatherObservation).where(WeatherObservation.ward_id == ward_id).order_by(WeatherObservation.valid_at.desc()).limit(100))).all()


@router.get("/{ward_id}/thermal")
async def thermal(ward_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await require_jurisdiction(ward_id, user, db)
    return (await db.scalars(select(ThermalMetric).where(ThermalMetric.ward_id == ward_id).order_by(ThermalMetric.valid_at.desc()).limit(100))).all()
