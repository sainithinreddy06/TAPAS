import { NextResponse } from 'next/server'
import { DEMO_THERMAL_STRESS } from '@/data/seedData'

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params
  const stress = DEMO_THERMAL_STRESS[id] || DEMO_THERMAL_STRESS['ward-42-kukatpally']

  return NextResponse.json({
    ward_id: id,
    thermal_stress: stress,
    is_demo: true,
    source: 'UTCI (COST Action 730) · thermofeel v0.2',
    generated_at: new Date().toISOString(),
  })
}
