import { NextResponse } from 'next/server'
import { DEMO_NOTIFICATIONS } from '@/data/seedData'

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params
  const notifications = DEMO_NOTIFICATIONS.filter((n) => n.ward_id === id)

  return NextResponse.json({
    ward_id: id,
    notifications,
    is_demo: true,
    updated_at: new Date().toISOString(),
  })
}
