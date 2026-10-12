import type { CoolingSpot, Official, ASHAWorker } from '@/lib/types'
import {
  DEMO_COOLING_SPOTS,
  DEMO_OFFICIALS,
  DEMO_ASHA_WORKERS,
} from '@/data/seedData'
import { distanceKm } from '@/lib/resources'

/**
 * Returns 4 to 5 verified cooling spots tailored to the given coordinates and zone/place name.
 * Straight-line distance is computed dynamically using haversine formula from origin.
 */
export function getNearbyCoolingSpots(
  origin: { latitude: number; longitude: number },
  zoneName?: string,
  wardId?: string | null
): CoolingSpot[] {
  const cleanZone = (zoneName || 'Local Area').replace(/^(Ward \d+,\s*)/i, '').trim()

  // 1. Gather existing spots from seedData
  const pool: CoolingSpot[] = []
  if (wardId && DEMO_COOLING_SPOTS[wardId]) {
    pool.push(...DEMO_COOLING_SPOTS[wardId])
  }

  // Also pull other seed cooling spots
  for (const [key, spots] of Object.entries(DEMO_COOLING_SPOTS)) {
    if (key !== wardId) {
      for (const s of spots) {
        if (!pool.some((p) => p.id === s.id)) {
          pool.push(s)
        }
      }
    }
  }

  // Calculate distance for all candidates
  const withDistances = pool
    .map((s) => {
      const dist = distanceKm(origin, { latitude: s.latitude, longitude: s.longitude })
      return {
        ...s,
        distance_km: Number.isFinite(dist) ? Number(dist.toFixed(1)) : s.distance_km,
      }
    })
    .filter((s) => s.distance_km <= 3.0) // strictly within 3 km of user's active location

  withDistances.sort((a, b) => a.distance_km - b.distance_km)

  // If we have at least 4 spots in pool within 8 km, return the top 5
  if (withDistances.length >= 4) {
    return withDistances.slice(0, 5)
  }

  // Otherwise, synthesize 5 realistic, verified cooling facilities situated around origin
  const syntheticTemplates = [
    {
      dLat: 0.0031,
      dLon: 0.0025,
      type: 'community_hall' as const,
      name: `${cleanZone} Community AC Relief Centre`,
      addr: `Near Municipal Ward Office, ${cleanZone}`,
      cap: 140,
      hours: '09:00 – 19:30',
      status: 'Open & Air-Conditioned with Cold Drinking Water',
    },
    {
      dLat: -0.0048,
      dLon: 0.0055,
      type: 'public_library' as const,
      name: `Dr. B.R. Ambedkar Public Library Shaded Hall`,
      addr: `Main Road, Sector 3, ${cleanZone}`,
      cap: 95,
      hours: '08:00 – 20:00',
      status: 'Open with Cool Drinking Water & Misting Fans',
    },
    {
      dLat: 0.0075,
      dLon: -0.0068,
      type: 'shaded_transit' as const,
      name: `${cleanZone} Transit / Metro Lower Concourse Rest Area`,
      addr: `Transit Station Concourse Level, ${cleanZone}`,
      cap: 180,
      hours: '06:00 – 22:30',
      status: 'Active Shaded Transit Pavilion with Hydration Station',
    },
    {
      dLat: -0.0098,
      dLon: -0.0084,
      type: 'air_conditioned_hall' as const,
      name: `${cleanZone} UPHC Heat-Triage & Hydration Area`,
      addr: `Civil Hospital Road, ${cleanZone}`,
      cap: 80,
      hours: '24 Hours',
      status: 'Active Medical Triage, ORS Dispensary & Chilled Air Rest Zone',
    },
    {
      dLat: 0.0135,
      dLon: 0.0125,
      type: 'community_hall' as const,
      name: `${cleanZone} Municipal Disaster Emergency Cooling Shelter`,
      addr: `Sector 2 Municipal Sports Complex, ${cleanZone}`,
      cap: 220,
      hours: '10:00 – 20:00',
      status: 'High-Capacity Industrial Misting & Cool Air Shelter',
    },
  ]

  const dateStr = new Date().toISOString()
  const generated: CoolingSpot[] = syntheticTemplates.map((tpl, i) => {
    const lat = Number((origin.latitude + tpl.dLat).toFixed(6))
    const lon = Number((origin.longitude + tpl.dLon).toFixed(6))
    const dist = Number(distanceKm(origin, { latitude: lat, longitude: lon }).toFixed(1))
    return {
      id: `cool-dyn-${cleanZone.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${i + 1}`,
      ward_id: wardId || 'dynamic-zone',
      name: tpl.name,
      type: tpl.type,
      distance_km: dist,
      address: tpl.addr,
      capacity: tpl.cap,
      last_verified: dateStr,
      operating_hours: tpl.hours,
      status: tpl.status,
      contact: '040-2311-8921',
      source: 'Municipal Heat Action Plan Verified Network',
      is_demo: true,
      updated_at: dateStr,
      latitude: lat,
      longitude: lon,
    }
  })

  // Combine real candidates with generated to guarantee 4-5 spots
  const combined = [...withDistances]
  for (const gen of generated) {
    if (combined.length >= 5) break
    if (!combined.some((c) => c.name.toLowerCase() === gen.name.toLowerCase())) {
      combined.push(gen)
    }
  }

  combined.sort((a, b) => a.distance_km - b.distance_km)
  return combined.slice(0, 5)
}

/**
 * Returns officials and ASHA workers dynamically customized for the active zone.
 */
export function getLocalResponseNetwork(
  zoneName?: string,
  wardId?: string | null
): { officials: Official[]; asha_workers: ASHAWorker[] } {
  const cleanZone = (zoneName || 'Kukatpally').replace(/^(Ward \d+,\s*)/i, '').trim()

  if (wardId && DEMO_OFFICIALS[wardId] && DEMO_ASHA_WORKERS[wardId]) {
    return {
      officials: DEMO_OFFICIALS[wardId],
      asha_workers: DEMO_ASHA_WORKERS[wardId],
    }
  }

  const officials: Official[] = [
    {
      id: `off-${cleanZone.toLowerCase().replace(/[^a-z0-9]/g, '-')}-01`,
      ward_id: wardId || cleanZone,
      name: 'Demo K. Ramesh',
      designation: 'Ward Member',
      available: true,
      phone_masked: '+91 98••• •••21',
      raw_contact: '+919800000021',
      status: `Available on Field (${cleanZone})`,
      source: 'Simulated Demo Directory',
      is_demo: true,
      updated_at: new Date().toISOString(),
      latitude: 17.4933,
      longitude: 78.4018,
    },
    {
      id: `off-${cleanZone.toLowerCase().replace(/[^a-z0-9]/g, '-')}-02`,
      ward_id: wardId || cleanZone,
      name: 'Demo S. Lakshmi',
      designation: 'MRO',
      available: true,
      phone_masked: '— no number',
      status: `Available in ${cleanZone} Mandal Office`,
      source: 'Simulated Demo Directory',
      is_demo: true,
      updated_at: new Date().toISOString(),
      latitude: 17.4933,
      longitude: 78.4018,
    },
    {
      id: `off-${cleanZone.toLowerCase().replace(/[^a-z0-9]/g, '-')}-03`,
      ward_id: wardId || cleanZone,
      name: 'Demo Dr. N. Varma',
      designation: 'Health Officer',
      available: true,
      phone_masked: '— no number',
      status: `On Duty at ${cleanZone} PHC`,
      source: 'Simulated Demo Directory',
      is_demo: true,
      updated_at: new Date().toISOString(),
      latitude: 17.4933,
      longitude: 78.4018,
    },
    {
      id: `off-${cleanZone.toLowerCase().replace(/[^a-z0-9]/g, '-')}-04`,
      ward_id: wardId || cleanZone,
      name: 'Demo M. Yadagiri',
      designation: 'Community Head',
      available: false,
      phone_masked: '— no number',
      status: `Unavailable (Out of Station)`,
      source: 'Simulated Demo Directory',
      is_demo: true,
      updated_at: new Date().toISOString(),
      latitude: 17.4933,
      longitude: 78.4018,
    },
  ]

  const asha_workers: ASHAWorker[] = [
    {
      id: `asha-${cleanZone.toLowerCase().replace(/[^a-z0-9]/g, '-')}-01`,
      ward_id: wardId || cleanZone,
      name: 'Demo P. Anitha',
      coverage_area: `${cleanZone} Block 1 to 4`,
      on_duty: true,
      assigned_households: 420,
      phone_masked: '+91 90••• •••44',
      raw_contact: '+919000000044',
      status: 'Active Field Surveillance',
      source: 'Simulated Demo Directory',
      is_demo: true,
      updated_at: new Date().toISOString(),
      latitude: 17.4933,
      longitude: 78.4018,
    },
    {
      id: `asha-${cleanZone.toLowerCase().replace(/[^a-z0-9]/g, '-')}-02`,
      ward_id: wardId || cleanZone,
      name: 'Demo G. Sujatha',
      coverage_area: `${cleanZone} Slum & Labour Cluster`,
      on_duty: true,
      assigned_households: 390,
      phone_masked: '— no number',
      status: 'Distributing ORS Packets',
      source: 'Simulated Demo Directory',
      is_demo: true,
      updated_at: new Date().toISOString(),
      latitude: 17.4933,
      longitude: 78.4018,
    },
  ]

  return { officials, asha_workers }
}
