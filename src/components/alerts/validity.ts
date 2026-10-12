import type { Alert } from '@/lib/types'

export function alertValidity(alert: Pick<Alert, 'issued_at' | 'expires_at'>, now = Date.now()): 'expired' | 'scheduled' | 'current' | 'unknown' {
  const issued = alert.issued_at ? Date.parse(alert.issued_at) : NaN
  const expiry = alert.expires_at ? Date.parse(alert.expires_at) : NaN
  if (Number.isFinite(expiry) && expiry <= now) return 'expired'
  if (Number.isFinite(issued) && issued > now) return 'scheduled'
  return Number.isFinite(issued) && Number.isFinite(expiry) ? 'current' : 'unknown'
}
