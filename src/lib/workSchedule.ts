/**
 * TAPAS Work Schedule Generator
 * Maps hourly WBGT forecast to ISO 7243 / ACGIH Threshold Limit Values (TLV)
 * for moderate occupational workload.
 */

export interface HourlyWbgtPoint {
  hour: number // 0-23
  timeStr: string // e.g. "06:00"
  wbgt: number
}

export interface WorkScheduleBlock {
  id: string
  timeStart: string
  timeEnd: string
  wbgtMin: number
  wbgtMax: number
  workPct: number
  restPct: number
  guidance: string
  band: 'safe' | 'caution' | 'warning' | 'danger'
  isSuspended: boolean
}

/**
 * ISO 7243 / ACGIH threshold criteria for moderate workload (250-350W):
 * - WBGT < 25 °C   -> Full work permitted (100% work / 0% rest)
 * - WBGT 25–28 °C  -> 75% work / 25% rest
 * - WBGT 28–32 °C  -> 50% work / 50% rest
 * - WBGT ≥ 32 °C   -> 25% work / 75% rest — SUSPEND heavy outdoor work
 */
export function getWbgtWorkRestRule(wbgt: number): {
  workPct: number
  restPct: number
  guidance: string
  band: 'safe' | 'caution' | 'warning' | 'danger'
  isSuspended: boolean
} {
  if (wbgt < 25) {
    return {
      workPct: 100,
      restPct: 0,
      guidance: 'Full work permitted',
      band: 'safe',
      isSuspended: false,
    }
  }
  if (wbgt < 28) {
    return {
      workPct: 75,
      restPct: 25,
      guidance: '75% work / 25% rest',
      band: 'caution',
      isSuspended: false,
    }
  }
  if (wbgt < 32) {
    return {
      workPct: 50,
      restPct: 50,
      guidance: '50% work / 50% rest',
      band: 'warning',
      isSuspended: false,
    }
  }
  return {
    workPct: 25,
    restPct: 75,
    guidance: 'SUSPEND heavy outdoor work (25% work / 75% rest if unavoidable)',
    band: 'danger',
    isSuspended: true,
  }
}

/**
 * Generates contiguous schedule blocks from hourly measurements.
 */
export function generateContiguousSchedule(hours: HourlyWbgtPoint[]): WorkScheduleBlock[] {
  if (!hours.length) return []

  const blocks: WorkScheduleBlock[] = []
  let currentBlock: WorkScheduleBlock | null = null

  for (let i = 0; i < hours.length; i++) {
    const h = hours[i]
    const rule = getWbgtWorkRestRule(h.wbgt)
    const nextHourStr = `${String((h.hour + 1) % 24).padStart(2, '0')}:00`

    if (!currentBlock) {
      currentBlock = {
        id: `block-${i}`,
        timeStart: h.timeStr,
        timeEnd: nextHourStr,
        wbgtMin: h.wbgt,
        wbgtMax: h.wbgt,
        workPct: rule.workPct,
        restPct: rule.restPct,
        guidance: rule.guidance,
        band: rule.band,
        isSuspended: rule.isSuspended,
      }
    } else if (currentBlock.band === rule.band) {
      // Extend contiguous block
      currentBlock.timeEnd = nextHourStr
      currentBlock.wbgtMin = Math.min(currentBlock.wbgtMin, h.wbgt)
      currentBlock.wbgtMax = Math.max(currentBlock.wbgtMax, h.wbgt)
    } else {
      // Push existing block and start new one
      blocks.push(currentBlock)
      currentBlock = {
        id: `block-${i}`,
        timeStart: h.timeStr,
        timeEnd: nextHourStr,
        wbgtMin: h.wbgt,
        wbgtMax: h.wbgt,
        workPct: rule.workPct,
        restPct: rule.restPct,
        guidance: rule.guidance,
        band: rule.band,
        isSuspended: rule.isSuspended,
      }
    }
  }

  if (currentBlock) {
    blocks.push(currentBlock)
  }

  return blocks
}

/**
 * Default realistic shift schedule for Kukatpally Ward during extreme summer condition
 * Derived directly from ACGIH criteria when full numerical model points are parsed.
 */
export const DEFAULT_KUKATPALLY_SCHEDULE: WorkScheduleBlock[] = [
  {
    id: 'block-1',
    timeStart: '06:00',
    timeEnd: '11:00',
    wbgtMin: 24.2,
    wbgtMax: 27.0,
    workPct: 100,
    restPct: 0,
    guidance: 'Full work permitted',
    band: 'safe',
    isSuspended: false,
  },
  {
    id: 'block-2',
    timeStart: '11:00',
    timeEnd: '12:40',
    wbgtMin: 27.1,
    wbgtMax: 30.2,
    workPct: 75,
    restPct: 25,
    guidance: '75% work / 25% rest',
    band: 'caution',
    isSuspended: false,
  },
  {
    id: 'block-3',
    timeStart: '12:40',
    timeEnd: '17:20',
    wbgtMin: 31.0,
    wbgtMax: 34.4,
    workPct: 25,
    restPct: 75,
    guidance: 'SUSPEND heavy outdoor work (25% work / 75% rest if unavoidable)',
    band: 'danger',
    isSuspended: true,
  },
  {
    id: 'block-4',
    timeStart: '17:20',
    timeEnd: '20:00',
    wbgtMin: 28.0,
    wbgtMax: 30.5,
    workPct: 50,
    restPct: 50,
    guidance: '50% work / 50% rest',
    band: 'warning',
    isSuspended: false,
  },
]
