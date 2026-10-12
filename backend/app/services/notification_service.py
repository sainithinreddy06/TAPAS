from dataclasses import dataclass
import httpx
from app.config import get_settings


@dataclass
class DispatchResult:
    provider_message_id: str | None
    status: str
    error_code: str | None = None
    simulated: bool = False


async def send_notification(recipient) -> DispatchResult:
    settings = get_settings()
    # Never send a real message for a demo record, even when Twilio is configured.
    if settings.notification_mode == "simulated" or recipient.is_demo:
        return DispatchResult("SIM-" + recipient.id, "sent", simulated=True)
    whatsapp = not bool(settings.twilio_sms_from)
    sender = settings.twilio_whatsapp_from if whatsapp else settings.twilio_sms_from
    target = ("whatsapp:" if whatsapp else "") + recipient.phone
    payload = {
        "From": sender, "To": target, "Body": recipient.message_body,
        "StatusCallback": settings.public_url + "/api/webhooks/twilio/status",
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(
                "https://api.twilio.com/2010-04-01/Accounts/" + settings.twilio_account_sid + "/Messages.json",
                data=payload,
                auth=(settings.twilio_account_sid, settings.twilio_auth_token.get_secret_value()),
            )
        body = response.json()
        if not response.is_success or not isinstance(body.get("sid"), str):
            return DispatchResult(None, "failed", str(body.get("code") or response.status_code))
        return DispatchResult(body["sid"], "queued")
    except (httpx.HTTPError, ValueError, TypeError, AttributeError):
        # Do not retry blindly: a timeout may happen after Twilio accepted a send.
        return DispatchResult(None, "failed", "provider_result_unknown")
