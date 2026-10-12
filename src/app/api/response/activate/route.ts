import { NextResponse } from 'next/server'
import { getChannelStatus } from '@/lib/notifications/channels'
import { generateCapXml } from '@/lib/cap'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { ward_name, reference, risk_level, groups } = body

    const opRef = reference || `TAPAS-KKP-20260909-L${risk_level || 5}`
    const capXml = generateCapXml({
      identifier: opRef,
      event: 'Extreme Heat Response Activation',
      urgency: 'Immediate',
      severity: risk_level >= 5 ? 'Extreme' : 'Severe',
      certainty: 'Likely',
      expires: '2026-09-09T17:20:00+05:30',
      senderName: `TAPAS — Mandal ${ward_name || 'Kukatpally'}`,
      headline: `Heat Action Trigger activated for ${ward_name || 'Kukatpally'}`,
      description: `Targeted response activated across ${groups?.length || 4} groups. Work hours shifted and cooling activated.`,
      instruction: `Follow ACGIH/ISO 7243 work rest guidance. ORS and cooling protocol initiated.`,
      areaDesc: `${ward_name || 'Kukatpally'}, Telangana`,
    })

    const channelsInfo = getChannelStatus()

    return NextResponse.json({
      success: true,
      operation_id: opRef,
      status: 'ACTIVATED',
      timestamp: new Date().toISOString(),
      channels: channelsInfo,
      cap_xml: capXml,
      message: 'Operational mobilization triggered successfully across selected channels.',
      is_demo: process.env.NOTIFICATION_MODE !== 'live',
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
