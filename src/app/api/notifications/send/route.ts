import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      ward_id,
      headline,
      message_body,
      target_audience,
      channels = ['SMS', 'WhatsApp Broadcast'],
      severity = 'Warning',
    } = body

    if (!ward_id || !headline || !message_body) {
      return NextResponse.json(
        { error: 'ward_id, headline, and message_body are required' },
        { status: 400 }
      )
    }

    const newNotification = {
      id: `notif-${Date.now()}`,
      ward_id,
      name: headline,
      headline,
      message_body,
      target_audience: target_audience || 'Public & Field Workers',
      audience_count: 12500,
      channels,
      severity,
      delivery_status: 'SENT',
      response_status: 'NOT_ACKNOWLEDGED',
      status: 'Dispatched via Simulated Gateway',
      source: 'TAPAS Integrated Notification Gateway',
      is_demo: true,
      updated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
    }

    return NextResponse.json({
      success: true,
      notification: newNotification,
      message: 'Simulated alert successfully queued and dispatched',
      is_demo: true,
    })
  } catch {
    return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 })
  }
}
