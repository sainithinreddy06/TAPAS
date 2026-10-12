/**
 * TAPAS API contract.
 *
 * Every field the UI depends on is declared here. Optional fields are the ones
 * the backend may legitimately omit; the UI degrades gracefully for those.
 */

export type RiskLevel = 1 | 2 | 3 | 4 | 5

/** Work/rest band derived from WBGT (ACGIH TLV / ISO 7243). */
export type WbgtBand = 'safe' | 'caution' | 'warning' | 'danger'

export type FacilityType =
  | 'cooling_centre'
  | 'hospital'
  | 'phc'
  | 'water_point'
  | 'shelter'

export type Language = 'en' | 'hi' | 'te'

/** Origin metadata belongs to each result, never to a global live/demo flag. */
export interface DataProvenance {
  status?: 'live' | 'cached' | 'snapshot'
  originalAt?: string | null
  note?: string
  latitude?: number
  longitude?: number
  source: string | null
  issuedAt: string | null
  fetchedAt: string
  geographicId: string
  fromCache: boolean
  validUntil: string | null
}

/** One ward, one day. The unit of the whole product. */
export interface WardRisk {
  ward_id: string
  ward_name: string
  city: string
  /** ISO date, YYYY-MM-DD. */
  date: string
  risk_level: RiskLevel | null
  /** Peak UTCI for the day, degrees C. */
  utci_max: number | null
  /** The ward 97th-percentile UTCI climatology for this calendar window. */
  utci_p97: number | null
  /** Percentile of utci_max against the 1991-2020 ward baseline. */
  utci_percentile?: number | null
  /** Peak NWS heat index, degrees C. */
  heat_index_max?: number | null
  /** Night-time minimum UTCI stayed above the ward hot-night threshold. */
  hot_night: boolean | null
  /** Run length of consecutive days at level >= 3 ending on this date. */
  consecutive_hot_days: number | null
  /** Central estimate of heat-attributable excess deaths for the ward-day. */
  excess_deaths: number | null
  /** Lower bound of the supplied uncertainty interval. */
  excess_deaths_low: number | null
  /** Upper bound of the supplied uncertainty interval. */
  excess_deaths_high: number | null
  confidence_level?: number | null
  interval_type?: string | null
  model_source?: string | null
  provenance?: DataProvenance
}

export interface RiskMapResponse {
  city: string
  date: string
  generated_at: string | null
  wards: WardRisk[]
  summary?: WardRisk | null
  coverage?: 'available' | 'none'
  methodology?: string | null
  run_id?: string | null
  provenance?: DataProvenance
}

export interface RiskRankingResponse {
  city: string
  date: string
  generated_at: string | null
  wards: WardRisk[]
  provenance?: DataProvenance
}

/** 5-day outlook for a single ward. */
export interface WardRiskSeries {
  ward_id: string
  ward_name: string
  city: string
  generated_at: string | null
  days: WardRisk[]
  provenance?: DataProvenance
}

export interface ForecastHour {
  /** ISO 8601 timestamp with offset. */
  time: string
  utci: number | null
  /** Ward climatology (97th percentile) at this hour, degrees C. */
  baseline_p97: number | null
  wbgt?: number | null
  air_temp?: number | null
  relative_humidity?: number | null
  heat_index?: number | null
}

export interface WardForecast {
  ward_id: string
  ward_name: string
  city: string
  generated_at: string | null
  /** Daily-scale baseline used for the headline comparison, degrees C. */
  baseline_p97: number | null
  /** 48 hourly steps. */
  hourly: ForecastHour[]
  provenance?: DataProvenance
}

export interface OccupationalHour {
  /** 0-23, local time. */
  hour: number
  wbgt: number | null
  band: WbgtBand | null
  /** Recommended work share of each hour, 0-100. */
  work_pct: number | null
  rest_pct: number | null
}

export interface OccupationalWindow {
  start: string
  end: string
}

export interface OccupationalResponse {
  ward_id: string
  ward_name: string
  date: string
  hourly: OccupationalHour[]
  safe_windows: OccupationalWindow[] | null
  avoid_windows: OccupationalWindow[] | null
  work_rest: {
    window: OccupationalWindow
    work_pct: number
    rest_pct: number
  } | null
  provenance?: DataProvenance
}

export interface Facility {
  id: string
  name: string
  type: FacilityType
  /** Straight-line distance from the ward centroid, km. */
  distance_km: number | null
  /** ISO date the record was last confirmed by a field officer. */
  last_verified: string | null
  address?: string
  capacity?: number
  phone?: string
  latitude?: number
  longitude?: number
}

export interface FacilitiesResponse {
  ward_id: string
  facilities: Facility[]
  provenance?: DataProvenance
}

export interface Alert {
  id: string
  ward_id: string
  ward_name: string
  city: string
  risk_level: RiskLevel | null
  date: string
  issued_at: string | null
  expires_at?: string | null
  headline: string
  advisory_en: string
  advisory_hi: string
  advisory_te: string
  /** Number of wards covered by the parent alert group. */
  ward_count?: number
  provenance?: DataProvenance
}

export interface AlertsResponse {
  alerts: Alert[]
  provenance?: DataProvenance
}

export interface HindcastEvent {
  date: string
  city: string
  ward_id?: string
  ward_name?: string
  predicted_level: RiskLevel | null
  observed_level?: RiskLevel | null
  /** Reported excess mortality / press-reported deaths for the event. */
  observed_note: string
  notes?: string
  hit?: boolean
}

export interface HindcastResponse {
  events: HindcastEvent[]
  provenance?: DataProvenance
  summary?: {
    events_evaluated: number
    hit_rate?: number
    false_alarm_rate?: number
    method?: string
  }
}

/** Ward polygons served statically from /public. */
export interface WardFeatureProperties {
  ward_id: string
  name: string
  city: string
  /** Injected client-side from the risk map response. */
  risk_level?: RiskLevel | null
  excess_deaths?: number | null
  utci_max?: number | null
}

export interface WardFeature {
  type: 'Feature'
  properties: WardFeatureProperties
  geometry: {
    type: 'Polygon' | 'MultiPolygon'
    coordinates: number[][][] | number[][][][]
  }
}

export interface WardCollection {
  type: 'FeatureCollection'
  features: WardFeature[]
  geographic_id?: string
  version?: string
  source?: string
  provenance?: DataProvenance
}

// ============================================================================
// TAPAS EXTENDED OPERATIONAL CONTRACT — SIH26083
// Standard fields: id · ward_id · name · latitude · longitude · status ·
// risk · contact · source · is_demo · updated_at.
// ============================================================================

export interface BaseOperationalRecord {
  id: string
  ward_id: string
  name: string
  latitude: number
  longitude: number
  status: string
  risk?: RiskLevel | string | null
  contact?: string | null
  source: string
  is_demo: boolean
  updated_at: string
}

export interface Ward extends BaseOperationalRecord {
  district?: string
  state?: string
  population?: number
  elderly_percentage?: number
  outdoor_workers_percentage?: number
  risk_level: RiskLevel
  risk_score: number // 0-100
  heat_index_max?: number | null
  utci_max?: number | null
}

export interface CoolingSpot extends BaseOperationalRecord {
  type: 'cooling_centre' | 'shaded_transit' | 'air_conditioned_hall' | 'public_library' | 'community_hall'
  distance_km: number
  address: string
  capacity: number | null
  last_verified: string
  operating_hours?: string
}

export interface Community extends BaseOperationalRecord {
  community_type: 'slum_settlement' | 'residential_colony' | 'labour_camp' | 'market_association'
  focal_person: string
  household_count?: number
}

export interface Official extends BaseOperationalRecord {
  designation: 'Ward Member' | 'MRO' | 'Health Officer' | 'Community Head' | 'Municipal Commissioner' | string
  available: boolean
  phone_masked: string
  raw_contact?: string
}

export interface ASHAWorker extends BaseOperationalRecord {
  coverage_area: string
  on_duty: boolean
  assigned_households: number
  phone_masked: string
  raw_contact?: string
}

export type MistingTeamStatus = 'Available' | 'Assigned' | 'En Route' | 'Completed'

export interface MistingTeam extends BaseOperationalRecord {
  status: MistingTeamStatus
  vehicle_type: 'Truck' | 'E-Rickshaw' | 'Stationary Cannon'
  current_location_name: string
  assigned_ward: string
  priority: 'High' | 'Medium' | 'Low'
  water_capacity_litres: number
  last_deployment: string
}

export type WorkerSector = 'construction' | 'agriculture' | 'factory' | 'street_vendors' | 'sanitation' | 'mining' | 'logistics'

export interface WorkerGroup extends BaseOperationalRecord {
  sector: WorkerSector
  worker_count: number
  shift_start: string
  shift_end: string
  peak_stress_overlap: boolean
  supervisor_name: string
  union_contact?: string
  safety_protocol: string
}

export interface MineSite extends BaseOperationalRecord {
  mine_name: string
  mine_type: 'Open Cast' | 'Underground'
  operator: string
  exposed_workers: number
  shift_start: string
  shift_end: string
  peak_stress_window: string
  shift_overlaps_peak: boolean
  recommended_protocol: string
  supervisor_name: string
  union_name: string
}

export type FacilityReadinessState = 'NOT_SENT' | 'SENT' | 'DELIVERED' | 'ACKNOWLEDGED'

export interface HealthcareFacility extends BaseOperationalRecord {
  facility_type: 'hospital' | 'phc' | 'chc' | 'emergency_clinic'
  distance_km: number
  heat_risk_status: 'Low' | 'Moderate' | 'High' | 'Severe' | 'Critical'
  notification_state: FacilityReadinessState
  bed_capacity_label: string
  emergency_ready: boolean
}

export interface PatientHealthSignal extends BaseOperationalRecord {
  today_count: number
  yesterday_count: number
  seven_day_avg: number
  surge_percentage: number
  surge_level: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME'
  history_14d: { date: string; count: number }[]
}

export type NotificationDeliveryStatus = 'QUEUED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'
export type NotificationResponseStatus = 'NOT_ACKNOWLEDGED' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'COMPLETED'

export interface Notification extends BaseOperationalRecord {
  notification_type: 'heat_warning' | 'extreme_heat_warning' | 'worker_protection' | 'healthcare_readiness' | 'cooling_centre_activation' | 'misting_deployment' | 'community_advisory'
  delivery_status: NotificationDeliveryStatus
  response_status: NotificationResponseStatus
  target_audience: string
  audience_count: number
  channels: string[]
  severity: 'Watch' | 'Warning' | 'Emergency'
  headline: string
  message_body: string
  expires_at: string
}

export interface ActionRecommendation extends BaseOperationalRecord {
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  order: number
  reason: string
  target: string
  recommended_time: string
  acknowledged: boolean
  in_progress: boolean
  action_type: 'healthcare' | 'worker' | 'misting' | 'cooling' | 'community'
}

export interface HumanThermalStressBreakdown {
  score_0_10: number
  category: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY HIGH' | 'EXTREME'
  air_temp: number
  rh: number
  wind: number
  mrt: number
  felt_temperature: number
  factors: {
    air_temp_pct: number
    rh_pct: number
    wind_pct: number
    mrt_pct: number
  }
  why_high: string
  method: string
}

export interface ExplainableRiskScore {
  score_0_100: number
  category: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY HIGH' | 'EXTREME'
  factors: {
    label: string
    points: number
    detail: string
  }[]
  methodology: string
  derivation_note?: string | null
}

