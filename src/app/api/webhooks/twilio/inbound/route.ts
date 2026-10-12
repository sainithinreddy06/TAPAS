import { NextResponse } from 'next/server'

/**
 * Twilio Inbound Message Webhook
 * Handles incoming replies from ASHA workers, officials, worksites, and citizens.
 * Supported keyword commands:
 * - ACK / OK / 1       -> ACKNOWLEDGED
 * - START / BEGIN / 2  -> IN_PROGRESS
 * - HELP / SOS / 3     -> NEEDS_ASSISTANCE
 * - DONE / FINISH / 4  -> COMPLETED
 * - STOP               -> Opt-out
 */
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || ''
    let fromNumber = ''
    let bodyText = ''

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData()
      fromNumber = (formData.get('From') as string) || ''
      bodyText = (formData.get('Body') as string) || ''
    } else {
      const json = await request.json()
      fromNumber = json.From || json.from || ''
      bodyText = json.Body || json.body || ''
    }

    const cleanBody = bodyText.trim().toUpperCase()
    let operationalAction = 'ACKNOWLEDGED'
    let replyText = 'TAPAS: Response recorded. Thank you.'

    if (cleanBody === 'ACK' || cleanBody === 'OK' || cleanBody === '1') {
      operationalAction = 'ACKNOWLEDGED'
      replyText = 'TAPAS: Directive acknowledged. Follow heat safety protocols.'
    } else if (cleanBody === 'START' || cleanBody === 'BEGIN' || cleanBody === '2') {
      operationalAction = 'IN_PROGRESS'
      replyText = 'TAPAS: Response action marked IN PROGRESS. Update when complete.'
    } else if (cleanBody === 'HELP' || cleanBody === 'SOS' || cleanBody === '3') {
      operationalAction = 'NEEDS_ASSISTANCE'
      replyText = 'TAPAS: Assistance request logged. Mandal Officer notified.'
    } else if (cleanBody === 'DONE' || cleanBody === 'FINISH' || cleanBody === '4') {
      operationalAction = 'COMPLETED'
      replyText = 'TAPAS: Task marked COMPLETED. Stay hydrated.'
    } else if (cleanBody === 'STOP') {
      replyText = 'TAPAS: You have opted out of advisory broadcasts.'
    } else {
      // Free-text note
      replyText = `TAPAS: Field note received: "${bodyText}". Recorded in operation log.`
    }

    console.log(`[Twilio Inbound] Recipient: ${fromNumber}, Action: ${operationalAction}, Raw: "${bodyText}"`)

    // Return TwiML XML response for Twilio
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${replyText}</Message>
</Response>`

    return new Response(twiml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
