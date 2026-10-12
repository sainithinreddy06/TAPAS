import { NextResponse } from 'next/server'
import { DEMO_OFFICIALS, DEMO_ASHA_WORKERS } from '@/data/seedData'

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params
  const officials = DEMO_OFFICIALS[id] || DEMO_OFFICIALS['ward-42-kukatpally'] || []
  const asha_workers = DEMO_ASHA_WORKERS[id] || DEMO_ASHA_WORKERS['ward-42-kukatpally'] || []

  return NextResponse.json({
    ward_id: id,
    officials,
    asha_workers,
    is_demo: true,
    warning: 'SIMULATED CONTACTS — demonstration data, not real officials',
    updated_at: new Date().toISOString(),
  })
}
