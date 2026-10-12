from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.auth.deps import get_current_user
from app.auth.jwt import create_access_token, hash_password, verify_password
from app.config import get_settings
from app.database import get_db
from app.models import User
from app.schemas.auth import LoginRequest, UserOut

router = APIRouter(prefix="/api/auth", tags=["authentication"])
# Random timing dummy, never an account credential or JWT signing secret.
import secrets
DUMMY_HASH = hash_password(secrets.token_urlsafe(24))


@router.post("/login", response_model=UserOut)
async def login(body: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    user = await db.scalar(select(User).where(User.email == str(body.email).lower().strip()))
    valid = await run_in_threadpool(verify_password, body.password, user.password_hash if user else DUMMY_HASH)
    if not user or not valid:
        raise HTTPException(401, "Invalid email or password.")
    response.set_cookie("tapas_auth", create_access_token(user), httponly=True,
                        secure=get_settings().app_env == "production",
                        samesite="lax", max_age=8 * 60 * 60, path="/")
    response.headers["Cache-Control"] = "no-store"
    return user


@router.get("/me", response_model=UserOut)
async def me(response: Response, user: User = Depends(get_current_user)):
    response.headers["Cache-Control"] = "no-store"
    return user


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("tapas_auth", path="/", httponly=True,
                           secure=get_settings().app_env == "production", samesite="lax")
    response.headers["Cache-Control"] = "no-store"
    return {"status": "logged_out"}
