from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field


class OfficerOverviewOut(BaseModel):
    jurisdiction_id: str
    jurisdiction_level: str
    jurisdiction_name: str
    officer_name: str
    total_wards: int
    population_covered: int
    active_operations_count: int
    escalated_operations_count: int
    incidents_count: int
    facilities_count: int
    high_risk_wards_count: int
    max_utci: float | None = None
    avg_utci: float | None = None
    status: str
    updated_at: str


class WardHotspotRankingOut(BaseModel):
    ward_id: str
    ward_name: str
    mandal: str
    risk_level: int
    utci_max: float | None = None
    wbgt_max: float | None = None
    vulnerability_score: float
    population: int | None = None
    active_operations_count: int
    priority_rank: int


class OfficerGapItem(BaseModel):
    ward_id: str
    ward_name: str
    gap_type: str
    severity: str
    risk_level: int
    description: str
    recommended_action: str


class OfficerGapsOut(BaseModel):
    jurisdiction_id: str
    gaps_count: int
    gaps: list[OfficerGapItem]


class OfficerBriefOut(BaseModel):
    date: str
    jurisdiction_id: str
    jurisdiction_name: str
    headline: str
    advisory_summary: str
    peak_hours: str
    max_expected_utci: float
    work_rest_rule: str
    priority_actions: list[str]
    resource_readiness: dict


class AuthorityOverviewOut(BaseModel):
    district_id: str
    district_name: str
    total_mandals: int
    total_wards: int
    population_covered: int
    peak_regional_utci: float
    avg_regional_utci: float
    total_excess_deaths: float
    total_ed_low: float
    total_ed_high: float
    critical_mandals_count: int
    active_operations_count: int
    escalated_operations_count: int
    open_incidents_count: int
    command_status: str
    updated_at: str


class MandalRankingOut(BaseModel):
    mandal_id: str
    mandal_name: str
    wards_count: int
    highest_risk_level: int
    max_utci: float
    avg_utci: float
    projected_excess_deaths: float
    active_operations_count: int
    priority_rank: int


class CommandPriorityWard(BaseModel):
    ward_id: str
    ward_name: str
    mandal: str
    cpi_score: float
    priority_tier: str
    factor_breakdown: dict
    immediate_recommendation: str


class CommandPriorityOut(BaseModel):
    district_id: str
    generated_at: str
    ranked_wards: list[CommandPriorityWard]


class HealthcareNotifyRequest(BaseModel):
    facility_id: str = Field(min_length=1, max_length=100)
    ward_id: str | None = None
    message: str | None = None


class HealthcareNotifyResponse(BaseModel):
    success: bool = True
    facility_id: str
    ward_id: str | None = None
    notification_state: str = "DELIVERED"
    status: str = "Emergency Alert Delivered to Hospital Casualty Desk"
    message: str
    delivered_at: str
    is_demo: bool = True


class MistingDeployRequest(BaseModel):
    team_id: str = Field(min_length=1, max_length=100)
    ward_id: str | None = None
    target_location: str | None = None


class MistingDeployResponse(BaseModel):
    success: bool = True
    team: dict
    message: str
    is_demo: bool = True
