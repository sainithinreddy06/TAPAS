import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { facility_id, ward_id, message } = body

    if (!facility_id) {
      return NextResponse.json({ error: 'facility_id is required' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      facility_id,
      ward_id,
      notification_state: 'DELIVERED',
      status: 'Emergency Alert Delivered to Hospital Casualty Desk',
      message: message || 'Heat casualty surge warning transmitted.',
      delivered_at: new Date().toISOString(),
      is_demo: true,
      warning: 'DEMO NOTIFICATION SERVICE — Simulated healthcare gateway',
    })
  } catch {
    return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 })
  }
}
