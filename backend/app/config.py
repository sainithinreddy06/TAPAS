from functools import lru_cache
from typing import Literal
from pydantic import SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    app_env: Literal["development", "test", "production"] = "development"
    database_url: str
    auth_secret: SecretStr
    twilio_account_sid: str = ""
    twilio_auth_token: SecretStr = SecretStr("")
    twilio_whatsapp_from: str = "whatsapp:+14155238886"
    twilio_sms_from: str = ""
    twilio_voice_from: str = ""
    notification_mode: Literal["simulated", "twilio", "live"] = "simulated"
    public_url: str = "http://localhost:8000"
    cors_origins: list[str] = ["http://localhost:3000"]
    spatialite_library_path: str = ""
    scheduler_enabled: bool = True

    @field_validator("auth_secret")
    @classmethod
    def validate_secret(cls, value: SecretStr) -> SecretStr:
        secret = value.get_secret_value()
        if len(secret) < 32 or secret.lower().startswith(("change-", "replace-", "your-")):
            raise ValueError("AUTH_SECRET must be a generated secret of at least 32 characters.")
        return value

    @field_validator("public_url")
    @classmethod
    def validate_public_url(cls, value: str) -> str:
        from urllib.parse import urlsplit
        url = urlsplit(value)
        if url.scheme not in {"http", "https"} or not url.netloc or url.query or url.fragment:
            raise ValueError("PUBLIC_URL must be an absolute HTTP(S) base URL.")
        return value.rstrip("/")

    @model_validator(mode="after")
    def validate_environment(self):
        if self.database_url.startswith("sqlite") and not self.spatialite_library_path:
            raise ValueError("SQLite requires SPATIALITE_LIBRARY_PATH; plain SQLite is not silently substituted.")
        if self.notification_mode in {"twilio", "live"} and (
            not self.twilio_account_sid or not self.twilio_auth_token.get_secret_value()
            or not (self.twilio_sms_from or self.twilio_whatsapp_from)
        ):
            raise ValueError("Live Twilio mode requires account SID, auth token and a sender.")
        if self.app_env == "production" and not self.public_url.startswith("https://"):
            raise ValueError("Production requires an HTTPS PUBLIC_URL.")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
