from twilio.rest import Client
from twilio.twiml.voice_response import VoiceResponse
from app.config import get_settings


def build_alert_twiml(
    ward_name: str,
    level_label: str = "EXTREME (Level 5)",
    utci: float = 43.1,
    window_start: str = "12:40",
    window_end: str = "17:20",
    recipient_id: str = "",
    lang: str = "en-IN",
) -> str:
    """Builds structured TwiML for automated emergency voice alerts per Part 4.3."""
    r = VoiceResponse()
    voice = {"en-IN": "Polly.Aditi", "hi-IN": "Polly.Aditi"}.get(lang, "Polly.Aditi")

    r.pause(length=1)
    r.say(
        "This is an automated heat alert from TAPAS, the Thermal Analytics "
        "and Public health Advisory System.",
        voice=voice,
        language=lang,
    )
    r.pause(length=1)
    r.say(
        f"You have been alerted by the Mandal Officer for {ward_name}. "
        f"The current heat risk level is {level_label}. "
        f"Thermal stress index is {int(round(utci))} degrees Celsius. "
        f"The high risk period is from {window_start} to {window_end} today.",
        voice=voice,
        language=lang,
    )
    r.pause(length=1)
    r.say(
        "Recommended actions. "
        "One. Conduct welfare checks on elderly residents in your area. "
        "Two. Verify that drinking water points are functioning. "
        "Three. Confirm cooling centres are open and accessible. "
        "Four. Suspend outdoor work during the high risk period. "
        "Five. Report any heat illness cases immediately.",
        voice=voice,
        language=lang,
    )
    r.pause(length=1)
    r.say(
        "Press 1 to acknowledge this alert. Press 2 if you require assistance.",
        voice=voice,
        language=lang,
    )

    g = r.gather(
        num_digits=1,
        action="/api/webhooks/twilio/voice-response",
        method="POST",
        timeout=8,
    )
    g.say("Press 1 to acknowledge, or 2 for assistance.", voice=voice, language=lang)

    r.say("No input received. This alert will be repeated.", voice=voice, language=lang)
    r.redirect(f"/api/webhooks/twilio/voice-alert?recipient_id={recipient_id}")
    return str(r)


def place_call(to_phone: str, recipient_id: str, ward_name: str = "Kukatpally") -> dict:
    """Places an automated voice call via Twilio or simulated dispatch."""
    settings = get_settings()

    if settings.notification_mode in {"twilio", "live"} and settings.twilio_account_sid:
        try:
            client = Client(
                settings.twilio_account_sid,
                settings.twilio_auth_token.get_secret_value(),
            )
            voice_from = settings.twilio_voice_from or settings.twilio_sms_from
            twiml_content = build_alert_twiml(ward_name=ward_name, recipient_id=recipient_id)

            call_kwargs = {
                "to": to_phone,
                "from_": voice_from,
            }
            # When testing on localhost without a public domain, pass TwiML directly
            # so Twilio speaks the emergency advisory over the call without needing a public callback URL.
            if "localhost" in settings.public_url or "127.0.0.1" in settings.public_url:
                call_kwargs["twiml"] = twiml_content
            else:
                call_kwargs["url"] = f"{settings.public_url}/api/webhooks/twilio/voice-alert?recipient_id={recipient_id}"
                call_kwargs["status_callback"] = f"{settings.public_url}/api/webhooks/twilio/voice-status"
                call_kwargs["status_callback_event"] = ["initiated", "ringing", "answered", "completed"]

            call = client.calls.create(**call_kwargs)
            return {"call_sid": call.sid, "status": "initiated", "mode": "live"}
        except Exception as e:
            return {"call_sid": None, "status": "failed", "error": str(e), "mode": "live"}
    else:
        # Simulated mode fallback
        sim_sid = f"CA_SIM_{recipient_id[:8]}"
        return {"call_sid": sim_sid, "status": "initiated", "mode": "simulated"}
