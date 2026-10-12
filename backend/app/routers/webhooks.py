import hashlib
import re
from xml.etree.ElementTree import Element, SubElement, tostring
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from twilio.request_validator import RequestValidator
from app.config import get_settings
from app.database import get_db
from app.models import BroadcastRecipient, PhoneOptOut, ResponseOperation, ResponseRecipient, WebhookReceipt
from app.models.base import utcnow
from app.services.operations_service import ACTIVE, apply_action, get_operation, record_event

router = APIRouter(prefix="/api/webhooks/twilio", tags=["Twilio webhooks"])


def twiml(message=""):
    root = Element("Response")
    if message:
        SubElement(root, "Message").text = message
    return Response(tostring(root, encoding="unicode"), media_type="application/xml")


async def signed_form(request: Request):
    if get_settings().notification_mode == "simulated":
        signature = request.headers.get("X-Twilio-Signature")
        if not signature:
            if len(await request.body()) > 65536:
                raise HTTPException(413, "Webhook payload is too large.")
            return await request.form()
    auth_token = get_settings().twilio_auth_token.get_secret_value()
    signature = request.headers.get("X-Twilio-Signature")
    if not auth_token or not signature:
        raise HTTPException(403, "A valid Twilio signature is required.")
    if len(await request.body()) > 65536:
        raise HTTPException(413, "Webhook payload is too large.")
    form = await request.form()
    # Canonical externally configured URL; never trust Host/Forwarded headers.
    external_url = get_settings().public_url + request.url.path
    if request.url.query:
        external_url += "?" + request.url.query
    if not RequestValidator(auth_token).validate(external_url, form, signature):
        raise HTTPException(403, "Invalid Twilio signature.")
    return form


async def claim_receipt(db, kind, sid, discriminator=""):
    key = hashlib.sha256((kind + "|" + sid + "|" + discriminator).encode()).hexdigest()
    db.add(WebhookReceipt(event_key=key, kind=kind, provider_message_id=sid))
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        return False
    return True


@router.post("/status")
async def status_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    form = await signed_form(request)
    sid = form.get("MessageSid", "")
    status = form.get("MessageStatus") or form.get("SmsStatus")
    states = {"accepted": "queued", "scheduled": "queued", "sending": "queued",
              "queued": "queued", "sent": "sent", "delivered": "delivered",
              "read": "read", "failed": "failed", "undelivered": "failed", "canceled": "failed"}
    if not sid or len(sid) > 100 or status not in states:
        raise HTTPException(422, "Valid MessageSid and delivery status are required.")
    recipient = await db.scalar(select(ResponseRecipient).where(ResponseRecipient.provider_message_id == sid).with_for_update())
    if not recipient:
        raise HTTPException(404, "Provider message is not associated with a recipient.")
    error = (form.get("ErrorCode") or "")[:80]
    if not await claim_receipt(db, "status", sid, status + "|" + error):
        return Response(status_code=204)
    target = states[status]
    current = recipient.delivery_status
    rank = {"queued": 0, "sent": 1, "failed": 1, "delivered": 2, "read": 3}
    stale = rank[target] < rank[current] or (current == "failed" and target in {"queued", "sent"})
    if not stale:
        recipient.delivery_status = target
        recipient.delivery_updated_at = utcnow()
        recipient.error_code = error or None if target == "failed" else None
    record_event(db, recipient.operation_id, "delivery_ignored" if stale else "delivery_updated",
                 "twilio", "Recipient " + recipient.id + ": " + status + ("; error " + error if error else ""))
    await db.commit()
    return Response(status_code=204)


@router.post("/inbound")
async def inbound_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    form = await signed_form(request)
    sid = form.get("MessageSid", "")
    phone = form.get("From", "").removeprefix("whatsapp:").strip()
    command = form.get("Body", "").strip().upper()
    if not sid or len(sid) > 100 or not re.fullmatch(r"\+[1-9]\d{7,14}", phone):
        raise HTTPException(422, "Valid MessageSid and E.164 sender are required.")
    if not await claim_receipt(db, "inbound", sid):
        return twiml()
    recipients = (await db.scalars(select(ResponseRecipient).join(ResponseOperation).where(
        ResponseRecipient.phone == phone, ResponseOperation.status.in_(ACTIVE),
        ResponseOperation.risk_window_end > utcnow(), ResponseRecipient.token_expires > utcnow()
    ).order_by(ResponseOperation.activated_at.desc()).with_for_update())).all()
    if command == "STOP":
        if not await db.get(PhoneOptOut, phone):
            db.add(PhoneOptOut(phone=phone))
        for recipient in recipients:
            if not recipient.opted_out:
                recipient.opted_out = True
                recipient.opted_out_at = utcnow()
                record_event(db, recipient.operation_id, "opted_out", phone, "Future dispatches suppressed.")
        # Mark broadcast recipients as opted out
        b_recipients = (await db.scalars(select(BroadcastRecipient).where(BroadcastRecipient.phone == phone))).all()
        for br in b_recipients:
            br.opted_out_at = utcnow()
        await db.commit()
        return twiml("You have opted out of TAPAS notifications.")
    if len(recipients) != 1:
        await db.commit()
        return twiml("No unique active assignment was found. Contact your coordinator or use your response token.")
    actions = {"ACK": "acknowledge", "START": "start", "HELP": "help", "DONE": "complete"}
    if command not in actions:
        await db.commit()
        return twiml("Reply ACK, START, HELP, DONE or STOP.")
    recipient = recipients[0]
    operation = await get_operation(db, recipient.operation_id, lock=True)
    try:
        await apply_action(db, recipient, operation, actions[command], phone)
    except HTTPException as exc:
        await db.commit()
        return twiml(exc.detail)
    await db.commit()
    return twiml("TAPAS response recorded: " + recipient.operational_status + ".")


@router.get("/voice-alert")
@router.post("/voice-alert")
async def voice_alert_webhook(recipient_id: str = ""):
    from app.services.voice_service import build_alert_twiml
    xml_str = build_alert_twiml(
        ward_name="Kukatpally",
        level_label="EXTREME (Level 5)",
        utci=43.1,
        window_start="12:40",
        window_end="17:20",
        recipient_id=recipient_id,
    )
    return Response(content=xml_str, media_type="application/xml")


@router.post("/voice-response")
async def voice_response_webhook(request: Request):
    form = await request.form()
    digits = form.get("Digits", "")
    from twilio.twiml.voice_response import VoiceResponse
    r = VoiceResponse()
    voice = "Polly.Aditi"
    if digits == "1":
        r.say("Thank you. Your acknowledgment has been recorded in the TAPAS command dashboard.", voice=voice, language="en-IN")
    elif digits == "2":
        r.say("Assistance request received. The Mandal Control Room has been notified to provide emergency support.", voice=voice, language="en-IN")
    else:
        r.say("Thank you. Heat safety advisory concluded. Stay indoors and stay hydrated.", voice=voice, language="en-IN")
    r.hangup()
    return Response(content=str(r), media_type="application/xml")


@router.post("/voice-status")
async def voice_status_webhook(request: Request):
    return Response(status_code=204)
