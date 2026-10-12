/**
 * TAPAS Notification Channel Abstraction Layer
 * Implements InApp, Twilio WhatsApp, Twilio SMS, and Simulated channels.
 * Honors NOTIFICATION_MODE=live vs simulated and validates credentials safely.
 */

export interface MessagePayload {
  to: string // phone or user ID
  recipientId?: string
  body: string
  reference: string
  recipientName?: string
  mediaUrl?: string
}

export interface SendResult {
  channel: 'in_app' | 'whatsapp' | 'sms' | 'simulated'
  success: boolean
  providerMessageId?: string
  status: 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED'
  error?: string
  isSimulated: boolean
}

export interface NotificationChannel {
  name: string
  isConfigured(): boolean
  send(payload: MessagePayload): Promise<SendResult>
}

let inAppIdCounter = 1000

/**
 * 1. In-App Notification Channel (Always available and real)
 */
export class InAppChannel implements NotificationChannel {
  name = 'in_app'

  isConfigured(): boolean {
    return true
  }

  async send(payload: MessagePayload): Promise<SendResult> {
    inAppIdCounter += 1
    return {
      channel: 'in_app',
      success: true,
      providerMessageId: `inapp-${Date.now()}-${payload.recipientId || payload.to.replace(/\D/g, '') || inAppIdCounter}`,
      status: 'DELIVERED',
      isSimulated: false,
    }
  }
}

/**
 * 2. Twilio WhatsApp Channel (Live with Sandbox or Twilio API)
 */
export class WhatsAppChannel implements NotificationChannel {
  name = 'whatsapp'

  isConfigured(): boolean {
    const sid = process.env.TWILIO_ACCOUNT_SID
    const token = process.env.TWILIO_AUTH_TOKEN
    const from = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'
    return Boolean(sid && token && from && process.env.NOTIFICATION_MODE === 'live')
  }

  async send(payload: MessagePayload): Promise<SendResult> {
    if (!this.isConfigured()) {
      return new SimulatedChannel('whatsapp').send(payload)
    }

    const sid = process.env.TWILIO_ACCOUNT_SID!
    const token = process.env.TWILIO_AUTH_TOKEN!
    const from = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'

    // Format destination to whatsapp:+...
    const rawTo = payload.to.startsWith('whatsapp:') ? payload.to : `whatsapp:${payload.to}`

    try {
      const auth = Buffer.from(`${sid}:${token}`).toString('base64')
      const bodyParams = new URLSearchParams({
        From: from,
        To: rawTo,
        Body: payload.body,
      })

      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyParams.toString(),
      })

      const data = await res.json()

      if (!res.ok) {
        return {
          channel: 'whatsapp',
          success: false,
          error: data.message || `Twilio HTTP error ${res.status}`,
          status: 'FAILED',
          isSimulated: false,
        }
      }

      // Rule 4.3: Never mark DELIVERED because the API accepted it. That is QUEUED.
      return {
        channel: 'whatsapp',
        success: true,
        providerMessageId: data.sid,
        status: 'QUEUED',
        isSimulated: false,
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return {
        channel: 'whatsapp',
        success: false,
        error: msg,
        status: 'FAILED',
        isSimulated: false,
      }
    }
  }
}

/**
 * 3. Twilio SMS Channel
 */
export class SmsChannel implements NotificationChannel {
  name = 'sms'

  isConfigured(): boolean {
    const sid = process.env.TWILIO_ACCOUNT_SID
    const token = process.env.TWILIO_AUTH_TOKEN
    const from = process.env.TWILIO_SMS_FROM
    return Boolean(sid && token && from && process.env.NOTIFICATION_MODE === 'live')
  }

  async send(payload: MessagePayload): Promise<SendResult> {
    if (!this.isConfigured()) {
      return new SimulatedChannel('sms').send(payload)
    }

    const sid = process.env.TWILIO_ACCOUNT_SID!
    const token = process.env.TWILIO_AUTH_TOKEN!
    const from = process.env.TWILIO_SMS_FROM!

    try {
      const auth = Buffer.from(`${sid}:${token}`).toString('base64')
      const bodyParams = new URLSearchParams({
        From: from,
        To: payload.to,
        Body: payload.body,
      })

      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyParams.toString(),
      })

      const data = await res.json()

      if (!res.ok) {
        return {
          channel: 'sms',
          success: false,
          error: data.message || `Twilio HTTP error ${res.status}`,
          status: 'FAILED',
          isSimulated: false,
        }
      }

      return {
        channel: 'sms',
        success: true,
        providerMessageId: data.sid,
        status: 'QUEUED',
        isSimulated: false,
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return {
        channel: 'sms',
        success: false,
        error: msg,
        status: 'FAILED',
        isSimulated: false,
      }
    }
  }
}

/**
 * 4. Simulated Channel (Safe fallback when keys are absent or mode is simulated)
 */
export class SimulatedChannel implements NotificationChannel {
  name: string

  constructor(targetName = 'simulated') {
    this.name = targetName
  }

  isConfigured(): boolean {
    return true
  }

  async send(payload: MessagePayload): Promise<SendResult> {
    return {
      channel: 'simulated',
      success: true,
      providerMessageId: `sim-${Date.now()}-${payload.reference}`,
      status: 'SENT',
      isSimulated: true,
    }
  }
}

export function getChannelStatus() {
  const isLiveMode = process.env.NOTIFICATION_MODE === 'live'
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const waFrom = process.env.TWILIO_WHATSAPP_FROM
  const smsFrom = process.env.TWILIO_SMS_FROM

  const waConfigured = Boolean(isLiveMode && sid && token && waFrom)
  const smsConfigured = Boolean(isLiveMode && sid && token && smsFrom)

  return {
    inApp: { live: true, label: 'In-app ✓ real' },
    whatsapp: {
      live: waConfigured,
      label: waConfigured ? 'WhatsApp ✓ live (Twilio sandbox)' : 'WhatsApp — not configured (Simulated fallback)',
    },
    sms: {
      live: smsConfigured,
      label: smsConfigured ? 'SMS ✓ live (verified numbers only)' : 'SMS — not configured (Simulated fallback)',
    },
  }
}
