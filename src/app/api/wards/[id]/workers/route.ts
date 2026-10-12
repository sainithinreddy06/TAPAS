import { NextResponse } from 'next/server'
import { DEMO_WORKER_GROUPS, DEMO_MINE_SITES } from '@/data/seedData'

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params
  const groups = DEMO_WORKER_GROUPS[id] || DEMO_WORKER_GROUPS['ward-42-kukatpally'] || []
  const mine_sites = DEMO_MINE_SITES.filter((m) => m.ward_id === id)

  return NextResponse.json({
    ward_id: id,
    worker_groups: groups,
    mine_sites,
    has_critical_shift_overlap:
      mine_sites.some((m) => m.shift_overlaps_peak) ||
      groups.some((g) => g.peak_stress_overlap),
    is_demo: true,
    guidelines_source: 'ACGIH TLV / DGMS Heat Protocols',
    updated_at: new Date().toISOString(),
  })
}
