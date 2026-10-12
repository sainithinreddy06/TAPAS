import { NextResponse } from 'next/server'

/**
 * Twilio Message Status Webhook
 * Receives delivery updates from Twilio for WhatsApp and SMS:
 * queued -> sent -> delivered -> read -> failed -> undelivered
 */
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || ''
    let messageSid = ''
    let messageStatus = ''
    let errorCode = ''
    let to = ''

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData()
      messageSid = (formData.get('MessageSid') as string) || ''
      messageStatus = (formData.get('MessageStatus') as string) || ''
      errorCode = (formData.get('ErrorCode') as string) || ''
      to = (formData.get('To') as string) || ''
    } else {
      const json = await request.json()
      messageSid = json.MessageSid || json.message_sid || ''
      messageStatus = json.MessageStatus || json.message_status || ''
      errorCode = json.ErrorCode || json.error_code || ''
      to = json.To || json.to || ''
    }

    // Map Twilio status to TAPAS delivery status
    let mappedStatus: 'QUEUED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' = 'SENT'
    const lower = messageStatus.toLowerCase()

    if (lower === 'delivered') mappedStatus = 'DELIVERED'
    else if (lower === 'read') mappedStatus = 'READ'
    else if (lower === 'failed' || lower === 'undelivered') mappedStatus = 'FAILED'
    else if (lower === 'queued') mappedStatus = 'QUEUED'

    return NextResponse.json({
      received: true,
      message_sid: messageSid,
      mapped_status: mappedStatus,
      raw_status: messageStatus,
      error_code: errorCode || null,
      destination: to,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
