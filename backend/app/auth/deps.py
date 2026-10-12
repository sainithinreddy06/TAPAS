from uuid import UUID
from fastapi import Depends, HTTPException, Request
from jose import JWTError
from sqlalchemy import false
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import User, Ward
from app.auth.jwt import decode_access_token


async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    token = request.cookies.get("tapas_auth")
    if not token:
        raise HTTPException(401, "Authentication cookie is required.")
    try:
        claims = decode_access_token(token)
        user_id = str(UUID(claims["sub"]))
    except (JWTError, ValueError, TypeError, KeyError):
        raise HTTPException(401, "Invalid or expired authentication cookie.") from None
    user = await db.get(User, user_id)
    if not user or any(claims[key] != getattr(user, key) for key in ("role", "jurisdiction_id", "jurisdiction_level")):
        raise HTTPException(401, "Session claims no longer match this user.")
    return user


async def get_optional_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User | None:
    token = request.cookies.get("tapas_auth")
    if not token:
        return None
    try:
        claims = decode_access_token(token)
        user_id = str(UUID(claims["sub"]))
        user = await db.get(User, user_id)
        if not user or any(claims[key] != getattr(user, key) for key in ("role", "jurisdiction_id", "jurisdiction_level")):
            return None
        return user
    except Exception:
        return None


def require_role(*roles: str):
    async def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(403, "Your role cannot perform this action.")
        return user
    return dependency


def jurisdiction_filter(user: User):
    if user.role == "municipal_officer" and user.jurisdiction_level == "mandal":
        return Ward.mandal == user.jurisdiction_id
    if user.role == "higher_authority" and user.jurisdiction_level == "district":
        return Ward.district == user.jurisdiction_id
    if user.role == "citizen" and user.jurisdiction_level == "ward":
        return Ward.id == user.jurisdiction_id
    return false()


async def require_jurisdiction(ward_id: str, user: User, db: AsyncSession) -> Ward:
    from sqlalchemy import select
    permitted = await db.scalar(select(Ward).where(Ward.id == ward_id, jurisdiction_filter(user)))
    if not permitted:
        raise HTTPException(403, "Ward is outside your assigned jurisdiction.")
    return permitted

