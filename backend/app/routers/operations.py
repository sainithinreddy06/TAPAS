from datetime import datetime
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.auth.deps import get_current_user, jurisdiction_filter, require_jurisdiction, require_role
from app.database import get_db
from app.models import Facility, Incident, ResponseEvent, ResponseOperation, ResponseRecipient, User, Ward
from app.models.base import new_id, utcnow
from app.schemas.operation import (
    ActivateRequest,
    EventOut,
    IncidentCreate,
    OperationOut,
    OperationStatusRequest,
    RespondRequest,
)
from app.schemas.operational_views import (
    AuthorityOverviewOut,
    CommandPriorityOut,
    HealthcareNotifyRequest,
    HealthcareNotifyResponse,
    MandalRankingOut,
    MistingDeployRequest,
    MistingDeployResponse,
    OfficerBriefOut,
    OfficerGapsOut,
    OfficerOverviewOut,
    WardHotspotRankingOut,
)
from app.services.operations_service import (
    activate,
    apply_action,
    get_operation,
    operation_detail,
    record_event,
    respond,
    ACTIVE,
)
from app.services.operational_views_service import (
    get_authority_operations,
    get_authority_overview,
    get_authority_priority,
    get_authority_rankings,
    get_officer_brief,
    get_officer_gaps,
    get_officer_overview,
    get_officer_rankings,
)

router = APIRouter(prefix="/api", tags=["response operations"])
staff = require_role("municipal_officer", "higher_authority")
authority_only = require_role("higher_authority")


# ---------------------------------------------------------------------------
# 1. Operation Activation & Detail
# ---------------------------------------------------------------------------

@router.post("/response/activate", response_model=OperationOut, status_code=201)
async def activation(
    body: ActivateRequest,
    response: Response,
    user: User = Depends(staff),
    db: AsyncSession = Depends(get_db),
):
    """Enforces jurisdiction, creates operation, recipients, CAP document, and dispatches alerts."""
    response.headers["Cache-Control"] = "no-store"
    return await activate(db, user, body)


@router.get("/response/{operation_id}", response_model=OperationOut)
@router.get("/operations/{operation_id}", response_model=OperationOut)
async def get_operation_by_id(
    operation_id: str,
    response: Response,
    user: User = Depends(staff),
    db: AsyncSession = Depends(get_db),
):
    """Returns operation details including recipients and chronological timeline."""
    response.headers["Cache-Control"] = "no-store"
    return await operation_detail(db, await get_operation(db, operation_id, user))


@router.get("/response/{operation_id}/timeline", response_model=list[EventOut])
@router.get("/operations/{operation_id}/timeline", response_model=list[EventOut])
async def get_operation_timeline(
    operation_id: str,
    user: User = Depends(staff),
    db: AsyncSession = Depends(get_db),
):
    """Returns chronological audit timeline for an operation."""
    await get_operation(db, operation_id, user)
    return (await db.scalars(
        select(ResponseEvent).where(ResponseEvent.operation_id == operation_id).order_by(ResponseEvent.created_at, ResponseEvent.id)
    )).all()


@router.get("/response/{operation_id}/cap")
@router.get("/operations/{operation_id}/cap")
async def get_operation_cap_xml(
    operation_id: str,
    user: User = Depends(staff),
    db: AsyncSession = Depends(get_db),
):
    """Downloads CAP 1.2 XML document for an operation."""
    op = await get_operation(db, operation_id, user)
    if not op.cap_xml:
        raise HTTPException(404, "CAP XML document not found for this operation.")
    return Response(content=op.cap_xml, media_type="application/xml")


@router.post("/operations/{operation_id}/status", response_model=OperationOut)
async def operation_status(
    operation_id: str,
    body: OperationStatusRequest,
    user: User = Depends(staff),
    db: AsyncSession = Depends(get_db),
):
    """Updates status for active operation."""
    row = await get_operation(db, operation_id, user, lock=True)
    if row.status not in ACTIVE and row.status != body.status:
        raise HTTPException(409, "A closed operation cannot be reopened.")
    if row.status != body.status:
        row.status = body.status
        record_event(db, row.id, body.status, user.email, "Operation status changed.")
        await db.commit()
    return await operation_detail(db, row)


@router.get("/respond/{token}")
async def get_respond_token(
    token: str,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Unauthenticated token-validated query to fetch responder details and operation context."""
    response.headers["Cache-Control"] = "no-store"
    if len(token) > 128:
        raise HTTPException(404, "Response token not found.")
    recipient = await db.scalar(select(ResponseRecipient).where(ResponseRecipient.action_token == token))
    if not recipient:
        raise HTTPException(404, "Response token not found.")
    operation = await get_operation(db, recipient.operation_id)
    ward = await db.scalar(select(Ward).where(Ward.id == operation.ward_id))
    return {
        "token": recipient.action_token,
        "recipient_id": recipient.id,
        "recipient_type": recipient.recipient_type,
        "name": recipient.name,
        "phone": recipient.phone,
        "message_body": recipient.message_body,
        "delivery_status": recipient.delivery_status,
        "operational_status": recipient.operational_status,
        "operation_id": operation.reference_id,
        "raw_operation_id": operation.id,
        "alert_level": operation.alert_level,
        "ward_id": operation.ward_id,
        "ward_name": ward.name if ward else operation.ward_id,
        "status": operation.status,
        "risk_window_start": operation.risk_window_start.isoformat() if operation.risk_window_start else None,
        "risk_window_end": operation.risk_window_end.isoformat() if operation.risk_window_end else None,
    }


@router.post("/respond/{token}")
async def token_response(
    token: str,
    body: RespondRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Unauthenticated token-validated responder action (acknowledge, start, help, complete)."""
    response.headers["Cache-Control"] = "no-store"
    return await respond(db, token, body.action)



# ---------------------------------------------------------------------------
# 2. Municipal Officer Routes
# ---------------------------------------------------------------------------

@router.get("/officer/overview", response_model=OfficerOverviewOut)
async def officer_overview(
    ward: str | None = Query(None, description="Optional ward filter for jurisdiction validation"),
    user: User = Depends(staff),
    db: AsyncSession = Depends(get_db),
):
    """Returns jurisdiction summary, active operations count, and resource telemetry."""
    if ward:
        await require_jurisdiction(ward, user, db)
    return await get_officer_overview(db, user)


@router.get("/officer/rankings", response_model=list[WardHotspotRankingOut])
async def officer_rankings(
    user: User = Depends(staff),
    db: AsyncSession = Depends(get_db),
):
    """Ranks wards in the officer's jurisdiction by thermal vulnerability and risk level."""
    return await get_officer_rankings(db, user)


@router.get("/officer/operations", response_model=list[OperationOut])
@router.get("/operations", response_model=list[OperationOut])
async def officer_operations(
    user: User = Depends(staff),
    db: AsyncSession = Depends(get_db),
):
    """Returns active and recent operations within the officer's jurisdiction."""
    rows = (await db.scalars(
        select(ResponseOperation).join(Ward).where(jurisdiction_filter(user)).order_by(ResponseOperation.activated_at.desc()).limit(100)
    )).all()
    return [await operation_detail(db, row) for row in rows]


@router.get("/officer/gaps", response_model=OfficerGapsOut)
async def officer_gaps(
    user: User = Depends(staff),
    db: AsyncSession = Depends(get_db),
):
    """Identifies resource coverage gaps (cooling deficit, hydration deficit) in jurisdiction."""
    return await get_officer_gaps(db, user)


@router.get("/officer/brief", response_model=OfficerBriefOut)
async def officer_brief(
    date: str | None = Query(None, description="ISO date YYYY-MM-DD"),
    user: User = Depends(staff),
    db: AsyncSession = Depends(get_db),
):
    """Returns daily tactical action brief, peak thermal hours, and recommended work-rest schedules."""
    return await get_officer_brief(db, user, date)


@router.post("/officer/incidents", status_code=201)
@router.post("/incidents", status_code=201)
async def create_incident(
    body: IncidentCreate,
    user: User = Depends(staff),
    db: AsyncSession = Depends(get_db),
):
    """Submits a heat-related field incident with jurisdiction validation."""
    await require_jurisdiction(body.ward_id, user, db)
    if body.operation_id:
        try:
            operation_id = str(UUID(body.operation_id))
        except ValueError:
            operation_id = body.operation_id
        operation = await get_operation(db, operation_id, user)
        if operation.ward_id != body.ward_id:
            raise HTTPException(422, "Incident ward must match the linked operation.")

    item = Incident(**body.model_dump(), reported_by=user.id)
    db.add(item)
    if body.operation_id:
        record_event(db, body.operation_id, "incident", user.email, body.category + ": " + body.notes[:850])
    await db.commit()
    return item


@router.get("/officer/incidents")
@router.get("/incidents")
async def list_incidents(
    user: User = Depends(staff),
    db: AsyncSession = Depends(get_db),
):
    """Lists field incidents reported in the user's jurisdiction."""
    return (await db.scalars(
        select(Incident).join(Ward).where(jurisdiction_filter(user)).order_by(Incident.created_at.desc()).limit(100)
    )).all()


# ---------------------------------------------------------------------------
# 3. Higher Authority Routes (Forbidden to Municipal Officers -> 403)
# ---------------------------------------------------------------------------

@router.get("/authority/overview", response_model=AuthorityOverviewOut)
async def authority_overview(
    user: User = Depends(authority_only),
    db: AsyncSession = Depends(get_db),
):
    """Returns district/regional command overview, total population, and aggregate mortality bounds."""
    return await get_authority_overview(db, user)


@router.get("/authority/rankings", response_model=list[MandalRankingOut])
async def authority_rankings(
    user: User = Depends(authority_only),
    db: AsyncSession = Depends(get_db),
):
    """Ranks all mandals in the district by thermal risk and projected excess mortality."""
    return await get_authority_rankings(db, user)


@router.get("/authority/priority", response_model=CommandPriorityOut)
async def authority_priority(
    user: User = Depends(authority_only),
    db: AsyncSession = Depends(get_db),
):
    """Computes Command Priority Index (CPI) with full factor breakdown across district wards."""
    return await get_authority_priority(db, user)


@router.get("/authority/operations")
async def authority_operations(
    user: User = Depends(authority_only),
    db: AsyncSession = Depends(get_db),
):
    """Returns all district operations with escalation telemetry and response rates."""
    return await get_authority_operations(db, user)


# ---------------------------------------------------------------------------
# 4. Operational Dispatch Routes
# ---------------------------------------------------------------------------

@router.post("/healthcare/notify", response_model=HealthcareNotifyResponse)
async def notify_healthcare(
    body: HealthcareNotifyRequest,
    user: User = Depends(staff),
    db: AsyncSession = Depends(get_db),
):
    """Dispatches emergency heat-casualty surge advisory to a healthcare facility."""
    now_iso = utcnow().isoformat()
    return HealthcareNotifyResponse(
        success=True,
        facility_id=body.facility_id,
        ward_id=body.ward_id,
        notification_state="DELIVERED",
        status="Emergency Alert Delivered to Hospital Casualty Desk",
        message=body.message or "Heat casualty surge warning transmitted to facility emergency triage desk.",
        delivered_at=now_iso,
        is_demo=True,
    )


@router.post("/misting/deploy", response_model=MistingDeployResponse)
async def deploy_misting(
    body: MistingDeployRequest,
    user: User = Depends(staff),
    db: AsyncSession = Depends(get_db),
):
    """Dispatches misting unit or cooling cannon to high-density target sector."""
    now_iso = utcnow().isoformat()
    location_label = body.target_location or "Designated Market Zone"
    return MistingDeployResponse(
        success=True,
        team={
            "id": body.team_id,
            "status": "En Route",
            "assigned_ward": body.ward_id or "HYD-001",
            "current_location_name": location_label,
            "last_deployment": f"Just now ({now_iso[:16].replace('T', ' ')} UTC)",
            "updated_at": now_iso,
        },
        message=f"Misting unit dispatched to target sector ({location_label})",
        is_demo=True,
    )
