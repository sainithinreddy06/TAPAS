import type { RiskLevel } from '@/lib/types'

// NDMA National Guidelines, Annexure 4; NCDC/IMD for emergency recognition.
export const HEALTH_GUIDANCE_SOURCE = 'https://nidm.gov.in/PDF/pubs/NDMA/27.pdf'
export const HEAT_FIRST_AID_SOURCE = 'https://internal.imd.gov.in/section/nhac/dynamic/FAQ_heat_wave.pdf'
export const EMERGENCY_SOURCE = 'https://112.gov.in/'

export type GuidanceAudience =
  | 'everyone'
  | 'older-adults'
  | 'children'
  | 'outdoor-workers'
  | 'general-public'
  | 'elderly-vulnerable'

export interface StructuredPrecaution {
  level: RiskLevel
  headline: string
  general_public: string[]
  outdoor_workers: string[]
  elderly_vulnerable: string[]
}

export const NDMA_PRECAUTIONS_BY_LEVEL: Record<RiskLevel, StructuredPrecaution> = {
  1: {
    level: 1,
    headline: 'Normal Heat Precautions — Low Thermal Discomfort',
    general_public: [
      'Maintain regular water intake throughout the day even if not feeling thirsty.',
      'Wear loose, lightweight, light-coloured cotton clothes.',
      'Normal daily routines and outdoor commutes can proceed without restriction.',
    ],
    outdoor_workers: [
      'Ensure standard drinking water points are accessible at the worksite.',
      'Wear wide-brim hats or cloth towels over the neck during field tasks.',
      'Standard work shifts permitted; maintain habitual hydration intervals.',
    ],
    elderly_vulnerable: [
      'Keep living rooms well ventilated with natural airflow or fans.',
      'Maintain balanced food intake and drink at least 2 litres of fluids daily.',
      'Continue standard prescription medicines on schedule.',
    ],
  },
  2: {
    level: 2,
    headline: 'Heat Awareness Advisory — Moderate Thermal Strain',
    general_public: [
      'Carry a water bottle whenever travelling outdoors; avoid dehydrating alcoholic drinks.',
      'Cover head with an umbrella, hat, or damp cloth when stepping into afternoon sun.',
      'Limit prolonged direct sun exposure between 12:00 PM and 3:00 PM.',
      'Consume traditional cooling fluids: ORS, tender coconut water, buttermilk (chaas), and aam panna.',
    ],
    outdoor_workers: [
      'Employers must establish shaded rest shelters and clean water supplies within 50m of work zones.',
      'Introduce mandatory 10-minute rest breaks every 90 minutes of active labour.',
      'Schedule strenuous digging or material lifting for morning hours before 11:30 AM.',
    ],
    elderly_vulnerable: [
      'Family and neighbours should check on seniors living alone at least once daily.',
      'Avoid non-essential midday travel or waiting in unshaded bus queues.',
      'Rest in the coolest portion of the home; sponge body with damp cloth if feeling feverish.',
    ],
  },
  3: {
    level: 3,
    headline: 'Heat Wave Alert — High Health Risk for Exposed Populations',
    general_public: [
      'Avoid going out under direct sun between 11:30 AM and 4:00 PM unless critical.',
      'Never leave children or pets inside parked vehicles even for a few minutes.',
      'If dizzy, nauseated or experiencing muscle cramps, immediately seek cool shade and sip electrolytes.',
      'Close windows and blinds facing the afternoon sun; ventilate rooms late in the evening.',
    ],
    outdoor_workers: [
      'Reschedule physical work to a split shift (06:00–11:00 AM and after 04:30 PM).',
      'Provide chilled electrolyte packets (ORS) and mandatory 15-minute shaded rest every hour.',
      'Supervisors must implement a buddy system to watch for signs of confusion, heavy sweating, or disorientation.',
    ],
    elderly_vulnerable: [
      'High vulnerability: seniors with hypertension, diabetes, or heart disease should remain strictly indoors.',
      'Monitor blood pressure and pulse; consult a physician if feeling light-headed or excessively fatigued.',
      'Keep indoor temperature down using bamboo blinds, khus screens, or evaporative coolers.',
    ],
  },
  4: {
    level: 4,
    headline: 'Severe Heat Wave Warning — Very High Health Danger',
    general_public: [
      'Extremely high risk of heat exhaustion and cramps. Stay indoors in cooled or shaded spaces.',
      'Do not perform strenuous athletic or outdoor activities during daylight hours.',
      'Keep ORS, lemon water, or salted rice kanji readily available at all times.',
      'Check emergency cooling centres and PHCs nearby in case home ambient cooling fails.',
    ],
    outdoor_workers: [
      'Strictly enforce 30 min work / 30 min shaded rest cycle for any essential outdoor labour.',
      'Halt all unshaded road paving, roofing, and direct-sun steel reinforcement tasks between 12:00 and 16:30.',
      'Station an emergency heat-stroke response kit (ice packs, spray mister, cot) at every active worksite.',
    ],
    elderly_vulnerable: [
      'Critical risk: Persons over 65, bedridden individuals, and young infants face severe heat stress.',
      'Carers must inspect fluid intake every 2 hours and monitor body temperature.',
      'If indoor temperature exceeds 36°C without AC, relocate to designated community air-conditioned shelters.',
    ],
  },
  5: {
    level: 5,
    headline: 'Extreme Heat Emergency — Life-Threatening Physiological Stress',
    general_public: [
      'MEDICAL EMERGENCY: Immediate threat of fatal heat stroke from prolonged outdoor exposure.',
      'Avoid all outdoor exposure between 11:00 AM and 17:00 PM. Stay inside cooled buildings or public shelters.',
      'Signs of Heat Stroke: Body temperature > 40°C (104°F), cessation of sweating, red hot skin, delirium, or loss of consciousness.',
      'If heat stroke is suspected: Call 112 immediately, move casualty to shade, pour cool water over body, and fan vigorously.',
    ],
    outdoor_workers: [
      'MANDATORY WORK SUSPENSION: Cease all heavy outdoor physical labour between 12:00 PM and 16:30 PM.',
      'Enforce ACGIH 15 min work / 45 min rest schedule during transitional hours with continuous hydration.',
      'Labour contractors must provide free transport to cooling transit centres and full shift wage protection.',
    ],
    elderly_vulnerable: [
      'EXTREME CASUALTY RISK: Relocate frail, isolated or vulnerable citizens to air-conditioned community centres immediately.',
      'ASHA workers and civil defense volunteers must conduct door-to-door welfare verification.',
      'Continuous cooling required: apply ice packs to armpits, groin, and neck if body temperature rises above 38.5°C.',
    ],
  },
}

/**
 * Editorial prioritisation of official general precautions, varying visibly by risk level.
 */
export function heatPrecautions(
  riskLevel: RiskLevel | null | undefined,
  audience: GuidanceAudience
): string[] {
  const level: RiskLevel = riskLevel ? (Math.max(1, Math.min(5, Math.round(riskLevel))) as RiskLevel) : 2
  const bundle = NDMA_PRECAUTIONS_BY_LEVEL[level]

  if (audience === 'outdoor-workers') {
    return bundle.outdoor_workers
  }
  if (audience === 'older-adults' || audience === 'elderly-vulnerable') {
    return bundle.elderly_vulnerable
  }
  if (audience === 'children') {
    return [
      'Keep children completely out of midday direct sunlight; skin burns and dehydration occur rapidly.',
      'Never leave an infant or child inside a parked car, even with windows cracked.',
      ...bundle.general_public.slice(0, 3),
    ]
  }
  return bundle.general_public
}
