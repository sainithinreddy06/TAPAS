import secrets
from xml.etree.ElementTree import Element, SubElement, tostring
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import get_settings
from app.auth.deps import require_jurisdiction
from app.models import Alert, PhoneOptOut, ResponseEvent, ResponseOperation, ResponseRecipient
from app.models.base import new_id, utcnow
from app.schemas.operation import EventOut, OperationOut, RecipientOut
from app.services import notification_service

ACTIVE = ("active", "escalated")
ACTIONS = {"acknowledge": "acknowledged", "start": "in_progress", "help": "needs_assistance", "complete": "completed"}


def record_event(db, operation_id, event_type, actor, detail=None):
    db.add(ResponseEvent(operation_id=operation_id, event_type=event_type, actor=actor, detail=detail))


def cap_document(operation, ward):
    # CAP 1.2 envelope. Demo operations are explicitly Exercise/Restricted.
    root = Element("alert", xmlns="urn:oasis:names:tc:emergency:cap:1.2")
    for key, value in {
        "identifier": operation.reference_id, "sender": "TAPAS",
        "sent": operation.activated_at.isoformat(), "status": "Exercise" if operation.is_demo else "Actual",
        "msgType": "Alert", "scope": "Restricted",
        "restriction": "Assigned response personnel",
    }.items():
        SubElement(root, key).text = value
    info = SubElement(root, "info")
    for key, value in {
        "language": "en-IN", "category": "Met", "event": "Extreme heat response activation",
        "responseType": "Prepare", "urgency": "Expected",
        "severity": "Extreme" if operation.alert_level == 5 else "Severe",
        "certainty": "Possible", "effective": operation.risk_window_start.isoformat(),
        "onset": operation.risk_window_start.isoformat(), "expires": operation.risk_window_end.isoformat(),
        "headline": ("DEMO: " if operation.is_demo else "") + "Heat response: " + ward.name,
        "description": "Officer-activated coordination request; not an automatically verified meteorological warning.",
    }.items():
        SubElement(info, key).text = value
    area = SubElement(info, "area")
    SubElement(area, "areaDesc").text = ward.name
    geocode = SubElement(area, "geocode")
    SubElement(geocode, "valueName").text = "TAPAS ward"
    SubElement(geocode, "value").text = ward.id
    return tostring(root, encoding="unicode")


DEFAULT_GROUP_MAP = {
    "ward_officials": ("ward_member", "Ward Officer Coordinator", "+919876543210"),
    "asha_mro": ("asha", "ASHA Lead / MRO Contact", "+919876543211"),
    "workers": ("labour_union", "Labour Welfare Inspector", "+919876543212"),
    "healthcare": ("healthcare", "PHC Medical Officer Desk", "+919876543213"),
    "misting": ("ward_member", "Rapid Misting Unit Team 1", "+919876543214"),
    "authority": ("ward_member", "District Emergency Operations Center", "+919876543215"),
}


async def operation_detail(db, operation):
    result = OperationOut.model_validate(operation)
    result.recipients = [RecipientOut.model_validate(row) for row in
                         (await db.scalars(select(ResponseRecipient).where(ResponseRecipient.operation_id == operation.id).order_by(ResponseRecipient.id))).all()]
    result.timeline = [EventOut.model_validate(row) for row in
                       (await db.scalars(select(ResponseEvent).where(ResponseEvent.operation_id == operation.id).order_by(ResponseEvent.created_at, ResponseEvent.id))).all()]
    result.operation_id = operation.reference_id
    result.success = True
    result.message = "Operational mobilization triggered successfully across selected channels."
    result.channels = {
        "whatsapp": {"enabled": True, "active": True},
        "sms": {"enabled": True, "active": True},
        "voice": {"enabled": False, "active": False},
        "cap": {"enabled": True, "active": True},
    }
    return result


async def activate(db: AsyncSession, user, body):
    ward = await require_jurisdiction(body.ward_id, user, db)
    now = utcnow()
    operation = ResponseOperation(
        id=new_id(), ward_id=ward.id, alert_level=body.alert_level,
        reference_id=body.reference_id or "TAPAS-" + ward.id + "-" + now.strftime("%Y%m%d") + "-L" + str(body.alert_level) + "-" + secrets.token_hex(3).upper(),
        risk_window_start=body.risk_window_start, risk_window_end=body.risk_window_end,
        activated_by=user.id, activated_at=now, status="active",
        is_demo=user.is_demo or get_settings().notification_mode == "simulated",
    )
    operation.cap_xml = cap_document(operation, ward)
    db.add(operation)
    try:
        await db.flush()
        recipients = []
        targets = body.recipients
        if not targets:
            selected_groups = body.groups or ["ward_officials", "asha_mro", "workers", "healthcare"]
            from app.schemas.operation import RecipientCreate
            targets = []
            for g in selected_groups:
                if g in DEFAULT_GROUP_MAP:
                    rtype, rname, rphone = DEFAULT_GROUP_MAP[g]
                    targets.append(RecipientCreate(recipient_type=rtype, name=rname, phone=rphone))

        for target in targets:
            recipient = ResponseRecipient(
                id=new_id(), operation_id=operation.id, recipient_type=target.recipient_type,
                name=target.name, phone=target.phone, action_token=secrets.token_urlsafe(32),
                token_expires=body.risk_window_end, is_demo=operation.is_demo,
                delivery_status="queued", operational_status="not_acknowledged",
            )
            prefix = "DEMO - " if operation.is_demo else ""
            recipient.message_body = prefix + (target.message_body or "TAPAS heat response for " + ward.name + ". Reply ACK, START, HELP, DONE or STOP.") + " Reference: " + operation.reference_id
            db.add(recipient)
            recipients.append(recipient)
        db.add(Alert(ward_id=ward.id, operation_id=operation.id, alert_level=operation.alert_level,
                     headline=("DEMO: " if operation.is_demo else "") + "Heat response activated for " + ward.name,
                     expires_at=operation.risk_window_end, cap_xml=operation.cap_xml, is_demo=operation.is_demo))
        record_event(db, operation.id, "activated", user.email, operation.reference_id)
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, "Operation reference already exists or activation conflicts with existing data.") from None

    # Persist the complete operation before any network side effect.
    for recipient in recipients:
        if await db.get(PhoneOptOut, recipient.phone):
            recipient.opted_out = True
            recipient.opted_out_at = utcnow()
            recipient.delivery_status = "failed"
            recipient.error_code = "opted_out"
            record_event(db, operation.id, "dispatch_suppressed", "system", "Recipient " + recipient.id + " has opted out.")
        else:
            result = await notification_service.send_notification(recipient)
            recipient.provider_message_id = result.provider_message_id
            recipient.delivery_status = result.status
            recipient.error_code = result.error_code
            record_event(db, operation.id, "dispatched", "system",
                         ("Simulated dispatch" if result.simulated else "Twilio dispatch") + " to recipient " + recipient.id + ": " + result.status)
        recipient.delivery_updated_at = utcnow()
        await db.commit()
    return await operation_detail(db, operation)


async def get_operation(db, operation_id, user=None, lock=False):
    query = select(ResponseOperation).where(
        (ResponseOperation.id == operation_id) | (ResponseOperation.reference_id == operation_id)
    )
    if lock:
        query = query.with_for_update()
    operation = await db.scalar(query)
    if not operation:
        raise HTTPException(404, "Operation not found.")
    if user:
        await require_jurisdiction(operation.ward_id, user, db)
    return operation


async def apply_action(db, recipient, operation, action, actor):
    status = ACTIONS[action]
    if recipient.token_expires <= utcnow() or operation.risk_window_end <= utcnow() or operation.status == "expired":
        raise HTTPException(410, "Response token has expired.")
    if recipient.opted_out:
        raise HTTPException(409, "This recipient has opted out.")
    if operation.status not in ACTIVE and not (operation.status == "completed" and recipient.operational_status == "completed" and status == "completed"):
        raise HTTPException(409, "This operation is no longer active.")
    if recipient.operational_status == "completed" and status != "completed":
        raise HTTPException(409, "A completed response cannot be moved backwards.")
    if recipient.operational_status != status:
        recipient.operational_status = status
        recipient.operational_updated_at = utcnow()
        record_event(db, operation.id, status, actor, "Recipient " + recipient.id)
        await db.flush()
        pending = await db.scalar(select(ResponseRecipient.id).where(
            ResponseRecipient.operation_id == operation.id,
            ResponseRecipient.operational_status != "completed").limit(1))
        if not pending and operation.status in ACTIVE:
            operation.status = "completed"
            record_event(db, operation.id, "operation_completed", "system", "All recipients completed their response.")
    return {"recipient_id": recipient.id, "operation_id": operation.id, "operational_status": recipient.operational_status}


async def respond(db, token, action):
    if len(token) > 128:
        raise HTTPException(404, "Response token not found.")
    recipient = await db.scalar(select(ResponseRecipient).where(ResponseRecipient.action_token == token).with_for_update())
    if not recipient:
        raise HTTPException(404, "Response token not found.")
    operation = await get_operation(db, recipient.operation_id, lock=True)
    result = await apply_action(db, recipient, operation, action, "recipient:" + recipient.id)
    await db.commit()
    return result


async def expire_operations(session_factory):
    async with session_factory() as db:
        operations = (await db.scalars(select(ResponseOperation).where(
            ResponseOperation.status.in_(ACTIVE), ResponseOperation.risk_window_end <= utcnow()).with_for_update(skip_locked=True))).all()
        for operation in operations:
            operation.status = "expired"
            record_event(db, operation.id, "expired", "system", "Risk window ended.")
        await db.commit()
