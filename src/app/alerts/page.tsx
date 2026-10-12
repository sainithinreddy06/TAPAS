'use client'
import { OfficialHelp } from '@/components/help/OfficialHelp'

import { useEffect, useState } from 'react'
import { AlertCard } from '@/components/alerts/AlertCard'
import { alertValidity } from '@/components/alerts/validity'
import { LocationSearch } from '@/components/location/LocationSearch'
import { useLocation } from '@/components/providers/LocationProvider'
import { useAlerts } from '@/hooks/useAlerts'
import { longDate } from '@/lib/utils'

export default function AlertsPage() {
  const { location, selectedWardId, selectedDate, setSelectedDate, dates } = useLocation()
  const { data, isLoading: isPending, isError, refetch } = useAlerts(1, 200)
  const [level, setLevel] = useState('all')
  const [showExpired, setShowExpired] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])
  const alerts = data?.alerts ?? []
  const filtered = alerts.filter((alert) => {
    if (alert.date !== selectedDate) return false
    if (selectedWardId && alert.ward_id !== selectedWardId) return false
    if (level !== 'all' && alert.risk_level !== Number(level)) return false
    if (!showExpired && alertValidity(alert, now) === 'expired') return false
    return true
  })

  return (
    <div className="mx-auto max-w-4xl px-3 py-4 sm:px-4">
      <header className="mb-4">
        <h1 className="text-lg font-semibold tracking-tight">Heat alerts and advisories</h1>
        <p className="mt-1 text-xs tapas-subtext">
          {location ? `Advisories requested for ${location.name}${selectedWardId ? ' and the selected ward' : ''}.` : 'Choose a place to request local advisory coverage.'}
          {' '}Source-issued messages are shown with their available validity metadata.
        </p>
      </header>
      <div className="mb-4"><LocationSearch /></div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-xs font-medium">
          Risk level
          <select className="h-11 rounded-md border border-border bg-card px-2 text-sm" value={level} onChange={(event) => setLevel(event.target.value)}>
            <option value="all">All levels</option>
            <option value="5">Level 5 — Extreme</option><option value="4">Level 4 — Very High</option>
            <option value="3">Level 3 — High</option><option value="2">Level 2 — Moderate</option><option value="1">Level 1 — Low</option>
          </select>
        </label>
        <label className="grid max-w-full gap-1 text-xs font-medium">
          Selected date
          <select className="h-11 max-w-full rounded-md border border-border bg-card px-2 text-sm" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)}>
            {(dates.includes(selectedDate) ? dates : [...dates, selectedDate].sort()).map((date) => <option value={date} key={date}>{longDate(date)}</option>)}
          </select>
        </label>
        <label className="flex min-h-11 items-center gap-2 text-xs"><input type="checkbox" checked={showExpired} onChange={(event) => setShowExpired(event.target.checked)} />Include expired messages</label>
      </div>
      {/* 2c: Structured Alert error state — single rendering in neutral --info, no red risk-4 */}
      {isError ? (
        <div className="rounded-xl border border-[var(--line-soft)] bg-[var(--surface-2)] p-5 text-[var(--ink-mid)] my-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--ink-low)] mb-2">ALERTS</div>
          <div className="flex items-center gap-2 font-semibold text-[var(--ink-high)] text-sm mb-1.5">
            <span className="text-[var(--info)] text-base font-bold">○</span>
            <span>Alert feed unavailable</span>
          </div>
          <p className="text-xs text-[var(--ink-mid)] leading-relaxed mb-3">
            TAPAS cannot reach the alert provider right now.<br />
            This does not mean no warnings are in force.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void refetch()}
              className="inline-flex items-center justify-center rounded-lg border border-[var(--line-firm)] bg-[var(--surface-3)] px-3.5 py-1.5 text-xs font-semibold text-[var(--ink-high)] hover:border-[var(--accent)] transition-colors"
            >
              Retry
            </button>
            <a
              href="https://mausam.imd.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[var(--ink-low)] hover:text-[var(--accent)] underline"
            >
              Official IMD bulletin ↗
            </a>
          </div>
          <div className="mt-3 text-[11px] text-[var(--ink-low)] font-mono border-t border-[var(--line-hair)] pt-2">
            Last successful check: {new Date(now).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })} IST
          </div>
        </div>
      ) : null}

      {isPending ? <p role="status" className="text-sm text-[var(--ink-low)] my-4">Loading alerts…</p> : null}

      {/* 2d: Distinct state for No Active Alerts */}
      {!isPending && !isError && !filtered.length ? (
        <div data-testid="no-alerts" className="rounded-xl border border-[var(--line-soft)] bg-[var(--surface-1)] p-5 text-[var(--ink-mid)] my-4">
          <div className="flex items-center gap-2 font-medium text-xs text-[var(--ink-high)]">
            <span className="text-[var(--info)] text-sm font-bold">○</span>
            <span>No active heat alerts for this area</span>
          </div>
          <p className="mt-1 text-[11px] text-[var(--ink-low)] font-mono pl-4">
            Checked {new Date(now).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })} IST
          </p>
        </div>
      ) : null}

      <OfficialHelp location={location} selectedDate={selectedDate} />
      <div className="space-y-3">{filtered.map((alert) => <AlertCard key={alert.id} alert={alert} now={now} />)}</div>
    </div>
  )
}
