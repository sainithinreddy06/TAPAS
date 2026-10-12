'use client'

import Link from 'next/link'
import { AlertTriangle, MapPin } from 'lucide-react'

import { CapDownload } from '@/components/alerts/CapDownload'
import { alertValidity } from '@/components/alerts/validity'
import { useLocation } from '@/components/providers/LocationProvider'
import { Button } from '@/components/ui/button'
import {
  RISK_COLORS,
  RISK_LABELS,
  RISK_TEXT_COLORS,
} from '@/lib/constants'
import type { Alert } from '@/lib/types'
import { formatDateTime, longDate, isRiskLevel } from '@/lib/utils'

export function AlertCard({ alert, now = Date.now() }: { alert: Alert; now?: number }) {
  const level = alert.risk_level
  const known = isRiskLevel(level)
  const validity = alertValidity(alert, now)
  const { location } = useLocation()
  const params = new URLSearchParams({ ward: alert.ward_id, date: alert.date })
  if (location) {
    params.set('lat', String(location.latitude))
    params.set('lon', String(location.longitude))
    params.set('place', location.name)
  }

  return (
    <article
      data-testid="alert-card"
      className="overflow-hidden rounded-lg border border-border bg-card"
    >
      <header
        className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2"
        style={{
          backgroundColor: known ? RISK_COLORS[level] : '#E5E7EB',
          color: known ? RISK_TEXT_COLORS[level] : '#374151',
        }}
      >
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
        <h3 className="text-sm font-bold uppercase tracking-wide">
          {known ? `Level ${level} — ${RISK_LABELS[level]}` : 'Risk classification unavailable'}
        </h3>
        <span aria-hidden="true" className="opacity-70">
          ·
        </span>
        <span className="text-sm font-semibold">{alert.ward_name}</span>
        <span className="ml-auto text-xs opacity-90">{longDate(alert.date)}</span>
      </header>

      <div className="p-3">
        {alert.headline ? <h4 className="mb-1 break-words text-sm font-semibold">{alert.headline}</h4> : null}
        <p className="whitespace-pre-line break-words text-sm leading-relaxed">{alert.advisory_en || 'English advisory text not supplied.'}</p>
        <p className="mt-2 text-xs font-medium tapas-subtext">{validity === 'expired' ? 'Expired message — not current guidance' : validity === 'scheduled' ? 'Future issue time — not yet current' : validity === 'current' ? `Valid until ${formatDateTime(alert.expires_at)}` : 'Validity not established: issue time or expiry missing'}{alert.provenance?.fromCache ? ' · Cached copy' : ''}</p>
      </div>

      <footer className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-2">
        <p className="text-[11px] tapas-subtext">
          Issued {formatDateTime(alert.issued_at)}
          {` · Source: ${alert.provenance?.source ?? 'not supplied'}`}
          {alert.ward_count
            ? ` · ${alert.ward_count} ward${alert.ward_count === 1 ? '' : 's'}`
            : ''}
          {alert.city ? ` · ${alert.city}` : ''}
        </p>

        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link
              href={location ? `/dashboard?${params.toString()}` : '/dashboard'}
            >
              <MapPin className="h-4 w-4" />
              {location ? 'View on map' : 'Find location'}
            </Link>
          </Button>
          <CapDownload alertId={alert.id} wardName={alert.ward_name} />
        </div>
      </footer>
    </article>
  )
}
