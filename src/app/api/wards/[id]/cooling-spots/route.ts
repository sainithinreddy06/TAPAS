import { NextResponse } from 'next/server'
import { DEMO_COOLING_SPOTS } from '@/data/seedData'

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params

  return NextResponse.json({
    ward_id: id,
    cooling_spots: [],
    count: 0,
    is_demo: false,
    empty_state_reason: 'No verified cooling-centre dataset available for this zone.',
    source: 'Municipal Data Verification',
    updated_at: new Date().toISOString(),
  })
}
