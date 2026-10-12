from datetime import timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.config import get_settings
from app.models.base import utcnow

passwords = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    if len(password.encode()) > 72:
        raise ValueError("Passwords may not exceed 72 bytes.")
    return passwords.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    if len(password.encode()) > 72:
        return False
    try:
        return passwords.verify(password, password_hash)
    except (ValueError, TypeError):
        return False


def create_access_token(user, *, expires_delta=timedelta(hours=8)) -> str:
    now = utcnow()
    return jwt.encode({
        "sub": str(user.id), "role": user.role,
        "jurisdiction_id": user.jurisdiction_id,
        "jurisdiction_level": user.jurisdiction_level,
        "iat": now, "exp": now + expires_delta,
    }, get_settings().auth_secret.get_secret_value(), algorithm="HS256")


def decode_access_token(token: str) -> dict:
    payload = jwt.decode(token, get_settings().auth_secret.get_secret_value(),
                         algorithms=["HS256"], options={"require_exp": True, "require_sub": True})
    if not {"sub", "role", "jurisdiction_id", "jurisdiction_level", "exp"}.issubset(payload):
        raise JWTError("Missing required claims.")
    return payload
