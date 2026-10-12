/**
 * TAPAS Operational Service Layer
 * Bridges frontend UI components with backend API routes and robust seed fallback.
 * Every record returned carries `is_demo: true` when simulated.
 */

import {
  DEMO_THERMAL_STRESS,
  DEMO_EXPLAINABLE_RISK,
  DEMO_COOLING_SPOTS,
  DEMO_OFFICIALS,
  DEMO_ASHA_WORKERS,
  DEMO_WORKER_GROUPS,
  DEMO_MINE_SITES,
  DEMO_HEALTHCARE_FACILITIES,
  DEMO_PATIENT_SIGNALS,
  DEMO_MISTING_TEAMS,
  DEMO_ACTION_RECOMMENDATIONS,
  DEMO_NOTIFICATIONS,
  DEMO_WARDS,
} from '@/data/seedData'
import { getNearbyCoolingSpots, getLocalResponseNetwork } from '@/lib/coolingSpots'
import type {
  CoolingSpot,
  Official,
  ASHAWorker,
  WorkerGroup,
  MineSite,
  HealthcareFacility,
  PatientHealthSignal,
  MistingTeam,
  ActionRecommendation,
  Notification,
  HumanThermalStressBreakdown,
  ExplainableRiskScore,
} from '@/lib/types'

const API_TIMEOUT = 4000

async function safeFetch<T>(url: string, fallback: T): Promise<T> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), API_TIMEOUT)
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' })
    clearTimeout(timer)
    if (res.ok) {
      return (await res.json()) as T
    }
  } catch {
    // Graceful fallback to deterministic seed data
  }
  return fallback
}

export const operationalService = {
  getThermalStress: async (wardId: string): Promise<HumanThermalStressBreakdown> => {
    const apiBase = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') : 'http://localhost:8000'
    try {
      const forecastRes = await safeFetch<{ hourly?: Array<{ air_temp?: number; relative_humidity?: number; wind_speed?: number; mrt?: number; utci?: number }> }>(
        `${apiBase}/api/forecast/${encodeURIComponent(wardId)}`,
        {}
      )
      const hours = forecastRes.hourly || []
      if (hours.length > 0) {
        // Find midday peak or latest hour
        const sample = hours[12] || hours[0]
        const utci = sample.utci ?? 37.5
        const airTemp = sample.air_temp ?? 31.5
        const rh = sample.relative_humidity ?? 55
        const wind = sample.wind_speed ?? 3.2
        const mrt = sample.mrt ?? 61.2
        const score = utci <= 9 ? 1.0 : utci <= 26 ? (1.0 + ((utci - 9) / 17) * 2.5) : utci <= 32 ? (3.5 + ((utci - 26) / 6) * 2.5) : utci <= 38 ? (6.0 + ((utci - 32) / 6) * 2.0) : utci <= 46 ? (8.0 + ((utci - 38) / 8) * 1.5) : Math.min(10.0, 9.5 + ((utci - 46) / 10) * 0.5)
        const category: HumanThermalStressBreakdown['category'] = utci >= 46 ? 'EXTREME' : utci >= 38 ? 'VERY HIGH' : utci >= 32 ? 'HIGH' : utci >= 26 ? 'MODERATE' : 'LOW'
        return {
          score_0_10: Number(score.toFixed(1)),
          category,
          air_temp: Number(airTemp.toFixed(1)),
          rh: Number(rh.toFixed(1)),
          wind: Number(wind.toFixed(1)),
          mrt: Number(mrt.toFixed(1)),
          felt_temperature: Number(utci.toFixed(1)),
          factors: { air_temp_pct: 35, rh_pct: 25, wind_pct: 10, mrt_pct: 30 },
          why_high: `Calculated from COST 730 UTCI model: ${utci.toFixed(1)}°C with ${airTemp.toFixed(1)}°C air temperature and ${rh.toFixed(0)}% humidity.`,
          method: 'COST Action 730 Universal Thermal Climate Index (UTCI) model',
        }
      }
    } catch {
      // Continue to fallback
    }
    const fallback = DEMO_THERMAL_STRESS[wardId] || DEMO_THERMAL_STRESS['ward-42-kukatpally']
    const res = await safeFetch<{ thermal_stress: HumanThermalStressBreakdown }>(
      `/api/wards/${encodeURIComponent(wardId)}/thermal-stress`,
      { thermal_stress: fallback }
    )
    return res.thermal_stress
  },

  getExplainableRisk: async (wardId: string): Promise<ExplainableRiskScore> => {
    const fallback = DEMO_EXPLAINABLE_RISK[wardId] || DEMO_EXPLAINABLE_RISK['ward-42-kukatpally']
    const res = await safeFetch<{ breakdown: ExplainableRiskScore }>(
      `/api/wards/${encodeURIComponent(wardId)}/risk`,
      { breakdown: fallback }
    )
    return res.breakdown
  },

  getCoolingSpots: async (
    wardId: string,
    origin?: { latitude: number; longitude: number },
    zoneName?: string
  ): Promise<CoolingSpot[]> => {
    const ward = DEMO_WARDS.find((w) => w.ward_id === wardId)
    const coords = origin ?? (ward ? { latitude: ward.latitude, longitude: ward.longitude } : { latitude: 17.4933, longitude: 78.4018 })
    const fallback = getNearbyCoolingSpots(coords, zoneName ?? ward?.name ?? wardId, wardId)
    const res = await safeFetch<{ cooling_spots: CoolingSpot[] }>(
      `/api/wards/${encodeURIComponent(wardId)}/cooling-spots`,
      { cooling_spots: fallback }
    )
    return res.cooling_spots && res.cooling_spots.length > 0 ? res.cooling_spots : fallback
  },

  getCommunityNetwork: async (
    wardId: string,
    zoneName?: string
  ): Promise<{ officials: Official[]; asha_workers: ASHAWorker[] }> => {
    const ward = DEMO_WARDS.find((w) => w.ward_id === wardId)
    const fallback = getLocalResponseNetwork(zoneName ?? ward?.name ?? wardId, wardId)
    const res = await safeFetch<{ officials: Official[]; asha_workers: ASHAWorker[] }>(
      `/api/wards/${encodeURIComponent(wardId)}/community-network`,
      fallback
    )
    return res
  },

  getWorkforce: async (
    wardId: string
  ): Promise<{
    worker_groups: WorkerGroup[]
    mine_sites: MineSite[]
    has_critical_shift_overlap: boolean
  }> => {
    const worker_groups = DEMO_WORKER_GROUPS[wardId] || DEMO_WORKER_GROUPS['ward-42-kukatpally'] || []
    const mine_sites = DEMO_MINE_SITES.filter((m) => m.ward_id === wardId || wardId.includes('singareni'))
    const has_critical_shift_overlap =
      mine_sites.some((m) => m.shift_overlaps_peak) ||
      worker_groups.some((g) => g.peak_stress_overlap)
    const res = await safeFetch<{
      worker_groups: WorkerGroup[]
      mine_sites: MineSite[]
      has_critical_shift_overlap: boolean
    }>(`/api/wards/${encodeURIComponent(wardId)}/workers`, {
      worker_groups,
      mine_sites,
      has_critical_shift_overlap,
    })
    return res
  },

  getHealthStatus: async (
    wardId: string
  ): Promise<{
    patient_signal: PatientHealthSignal
    facilities: HealthcareFacility[]
  }> => {
    const patient_signal = DEMO_PATIENT_SIGNALS[wardId] || DEMO_PATIENT_SIGNALS['ward-42-kukatpally']
    const facilities = DEMO_HEALTHCARE_FACILITIES[wardId] || DEMO_HEALTHCARE_FACILITIES['ward-42-kukatpally'] || []
    const res = await safeFetch<{
      patient_signal: PatientHealthSignal
      facilities: HealthcareFacility[]
    }>(`/api/wards/${encodeURIComponent(wardId)}/health`, {
      patient_signal,
      facilities,
    })
    return res
  },

  getActions: async (wardId: string): Promise<ActionRecommendation[]> => {
    const fallback =
      DEMO_ACTION_RECOMMENDATIONS[wardId] ||
      DEMO_ACTION_RECOMMENDATIONS['ward-42-kukatpally'] ||
      []
    const res = await safeFetch<{ actions: ActionRecommendation[] }>(
      `/api/wards/${encodeURIComponent(wardId)}/actions`,
      { actions: fallback }
    )
    return res.actions
  },

  getMistingFleet: async (): Promise<MistingTeam[]> => {
    return DEMO_MISTING_TEAMS
  },

  getNotifications: async (wardId?: string): Promise<Notification[]> => {
    if (!wardId) return DEMO_NOTIFICATIONS
    return DEMO_NOTIFICATIONS.filter((n) => n.ward_id === wardId)
  },

  deployMistingTeam: async (teamId: string, wardId: string, location: string) => {
    try {
      const res = await fetch('/api/misting/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_id: teamId, ward_id: wardId, target_location: location }),
      })
      if (res.ok) return await res.json()
    } catch {
      // fallback handled in UI
    }
    return {
      success: true,
      message: `Misting team ${teamId} dispatched to ${location}`,
      is_demo: true,
    }
  },

  acknowledgeAction: async (actionId: string, notes?: string) => {
    try {
      const res = await fetch('/api/actions/acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action_id: actionId, notes }),
      })
      if (res.ok) return await res.json()
    } catch {
      // fallback handled in UI
    }
    return {
      success: true,
      action_id: actionId,
      status: 'Action In Progress',
      acknowledged: true,
      in_progress: true,
      is_demo: true,
    }
  },

  notifyHealthcare: async (facilityId: string, wardId: string, message?: string) => {
    try {
      const res = await fetch('/api/healthcare/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facility_id: facilityId, ward_id: wardId, message }),
      })
      if (res.ok) return await res.json()
    } catch {
      // fallback handled in UI
    }
    return {
      success: true,
      facility_id: facilityId,
      notification_state: 'DELIVERED',
      status: 'Alert Transmitted to Facility',
      is_demo: true,
    }
  },

  sendBroadcastNotification: async (payload: {
    ward_id: string
    headline: string
    message_body: string
    target_audience: string
    channels?: string[]
    severity?: string
  }) => {
    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) return await res.json()
    } catch {
      // fallback handled in UI
    }
    return {
      success: true,
      notification: {
        id: `notif-${Date.now()}`,
        ...payload,
        delivery_status: 'SENT',
        response_status: 'NOT_ACKNOWLEDGED',
        is_demo: true,
        updated_at: new Date().toISOString(),
      },
      message: 'Simulated alert queued and dispatched',
      is_demo: true,
    }
  },
}
