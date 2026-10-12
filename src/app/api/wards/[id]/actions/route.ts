import { NextResponse } from 'next/server'
import { DEMO_ACTION_RECOMMENDATIONS } from '@/data/seedData'

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params
  const actions =
    DEMO_ACTION_RECOMMENDATIONS[id] ||
    DEMO_ACTION_RECOMMENDATIONS['ward-42-kukatpally'] ||
    []

  return NextResponse.json({
    ward_id: id,
    actions,
    is_demo: true,
    engine: 'TAPAS Action Priority Engine v1.2',
    generated_at: new Date().toISOString(),
  })
}
