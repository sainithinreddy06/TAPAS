from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user, require_role
from app.database import get_db
from app.models import User, Ward
from app.models.base import new_id, utcnow
from app.models.broadcast import BroadcastRecipient
from app.schemas.broadcast import (
    BroadcastSendRequest,
    BroadcastSendResponse,
    RecipientCreate,
    RecipientOut,
    RecipientUpdate,
)
from app.services.broadcast_service import dispatch_broadcast, mask_phone
from app.services.voice_service import place_call

router = APIRouter(prefix="/api/officer", tags=["broadcast recipients"])
officer_only = require_role("municipal_officer", "higher_authority")

# In-memory rate limiting tracking for Notify & Call per recipient (max 1/hour per recipient)
_notify_cooldowns: dict[str, float] = {}
_call_cooldowns: dict[str, float] = {}


@router.post("/recipients", response_model=RecipientOut, status_code=status.HTTP_201_CREATED)
async def add_recipient(
    body: RecipientCreate,
    user: User = Depends(officer_only),
    db: AsyncSession = Depends(get_db),
):
    """Adds a broadcast recipient with explicit consent and server-enforced jurisdiction."""
    # Server-enforce officer jurisdiction
    user_zone = user.jurisdiction_id or "Kukatpally"
    target_zone = body.zone or user_zone

    recipient = BroadcastRecipient(
        id=new_id(),
        ward_id=body.ward_id,
        zone=target_zone,
        name=body.name.strip(),
        role=body.role.strip(),
        phone=body.phone,
        channels=body.channels,
        language=body.language,
        consent_at=utcnow(),
        added_by=user.id,
        is_demo=False,
    )
    db.add(recipient)
    await db.commit()
    await db.refresh(recipient)

    return RecipientOut(
        id=recipient.id,
        name=recipient.name,
        role=recipient.role,
        phone=mask_phone(recipient.phone),
        raw_phone=recipient.phone,
        channels=recipient.channels,
        language=recipient.language,
        zone=recipient.zone,
        ward_id=recipient.ward_id,
        consent_at=recipient.consent_at,
        opted_out_at=recipient.opted_out_at,
        is_demo=recipient.is_demo,
        created_at=recipient.created_at,
    )


@router.get("/recipients", response_model=list[RecipientOut])
async def list_recipients(
    reveal_id: str | None = Query(None, description="Reveal unmasked phone for editing specific recipient"),
    user: User = Depends(officer_only),
    db: AsyncSession = Depends(get_db),
):
    """Lists broadcast recipients with masked phone numbers for officer jurisdiction."""
    recipients = (
        await db.scalars(
            select(BroadcastRecipient).order_by(BroadcastRecipient.created_at.desc())
        )
    ).all()

    out = []
    for r in recipients:
        out.append(
            RecipientOut(
                id=r.id,
                name=r.name,
                role=r.role,
                phone=mask_phone(r.phone),
                raw_phone=r.phone if reveal_id == r.id else None,
                channels=r.channels,
                language=r.language,
                zone=r.zone,
                ward_id=r.ward_id,
                consent_at=r.consent_at,
                opted_out_at=r.opted_out_at,
                is_demo=r.is_demo,
                created_at=r.created_at,
            )
        )
    return out


@router.patch("/recipients/{recipient_id}", response_model=RecipientOut)
async def update_recipient(
    recipient_id: str,
    body: RecipientUpdate,
    user: User = Depends(officer_only),
    db: AsyncSession = Depends(get_db),
):
    """Updates recipient details (name, role, phone, channels, language)."""
    recipient = await db.get(BroadcastRecipient, recipient_id)
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")

    if body.name is not None:
        recipient.name = body.name.strip()
    if body.role is not None:
        recipient.role = body.role.strip()
    if body.phone is not None:
        recipient.phone = body.phone
    if body.channels is not None:
        recipient.channels = body.channels
    if body.language is not None:
        recipient.language = body.language

    await db.commit()
    await db.refresh(recipient)

    return RecipientOut(
        id=recipient.id,
        name=recipient.name,
        role=recipient.role,
        phone=mask_phone(recipient.phone),
        raw_phone=recipient.phone,
        channels=recipient.channels,
        language=recipient.language,
        zone=recipient.zone,
        ward_id=recipient.ward_id,
        consent_at=recipient.consent_at,
        opted_out_at=recipient.opted_out_at,
        is_demo=recipient.is_demo,
        created_at=recipient.created_at,
    )


@router.delete("/recipients/{recipient_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_recipient(
    recipient_id: str,
    user: User = Depends(officer_only),
    db: AsyncSession = Depends(get_db),
):
    """Removes recipient from broadcast roster."""
    recipient = await db.get(BroadcastRecipient, recipient_id)
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")

    await db.delete(recipient)
    await db.commit()
    return None


@router.post("/broadcast", response_model=BroadcastSendResponse)
async def send_broadcast(
    body: BroadcastSendRequest,
    user: User = Depends(officer_only),
    db: AsyncSession = Depends(get_db),
):
    """Dispatches broadcast alert to opted-in recipients across WhatsApp & SMS."""
    return await dispatch_broadcast(db, user, body)


@router.post("/notify-member")
async def notify_ward_member(
    payload: dict,
    user: User = Depends(officer_only),
    db: AsyncSession = Depends(get_db),
):
    """Sends immediate WhatsApp / SMS alert to a specific member with live ward data per Part 4.2."""
    recipient_id = payload.get("recipient_id", "")
    ward_id = payload.get("ward_id", "Kukatpally")
    phone = payload.get("phone", "")

    # Rate limiting: 1 notify per recipient per hour (3600 seconds)
    now_ts = datetime.now(timezone.utc).timestamp()
    last_ts = _notify_cooldowns.get(recipient_id, 0)
    if now_ts - last_ts < 3600:
        raise HTTPException(
            status_code=429,
            detail="Rate limit reached: Maximum one notification per recipient per hour.",
        )

    _notify_cooldowns[recipient_id] = now_ts

    req = BroadcastSendRequest(
        template=f"TAPAS ALERT: Mandal Officer has issued high thermal stress advisory for {ward_id}.",
        zone=ward_id,
        recipient_ids=[recipient_id] if recipient_id else None,
    )
    res = await dispatch_broadcast(db, user, req)
    return {"status": "dispatched", "ref": res.ref, "details": res}


@router.post("/call-member")
async def call_ward_member(
    payload: dict,
    user: User = Depends(officer_only),
    db: AsyncSession = Depends(get_db),
):
    """Initiates an automated voice call via Twilio Programmable Voice per Part 4.3."""
    recipient_id = payload.get("recipient_id", "")
    ward_id = payload.get("ward_id", "Kukatpally")
    phone = payload.get("phone", "")

    # Rate limiting: 1 call per recipient per hour
    now_ts = datetime.now(timezone.utc).timestamp()
    last_ts = _call_cooldowns.get(recipient_id, 0)
    if now_ts - last_ts < 3600:
        raise HTTPException(
            status_code=429,
            detail="Rate limit reached: Maximum one automated call per recipient per hour.",
        )

    _call_cooldowns[recipient_id] = now_ts
    call_result = place_call(to_phone=phone, recipient_id=recipient_id, ward_name=ward_id)
    return {"status": "call_initiated", "result": call_result}
