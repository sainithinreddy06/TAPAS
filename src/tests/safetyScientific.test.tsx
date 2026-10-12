import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ScheduleTable } from '@/components/occupational/ScheduleTable'
import { WbgtChart, validWorkRest, validWbgtBand } from '@/components/occupational/WbgtChart'
import { forecastDate, forecastPoints, UtciChart } from '@/components/ward/UtciChart'
import { freshnessOf } from '@/components/ward/FacilitiesTab'
import { alertValidity } from '@/components/alerts/validity'
import { validateCapXml } from '@/components/alerts/CapDownload'
import type { ForecastHour, OccupationalHour, OccupationalResponse } from '@/lib/types'

const emptySchedule: OccupationalResponse = {
  ward_id: 'test-ward', ward_name: 'Test ward', date: '2026-09-07', hourly: [],
  safe_windows: null, avoid_windows: null, work_rest: null,
}

describe('occupational display safety', () => {
  it.each(['loading', 'error', 'unavailable'] as const)('does not authorize continuous work in %s state', (state) => {
    render(<ScheduleTable state={state} />)
    expect(screen.queryByText('Continuous work permissible all day')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(state === 'loading' ? 'Loading work/rest guidance' : 'Work/rest guidance unavailable')
  })
  it('does not authorize work when a successful response omits guidance', () => {
    render(<ScheduleTable state="ready" data={emptySchedule} />)
    expect(screen.getByText('Work/rest guidance unavailable')).toBeInTheDocument()
    expect(screen.getAllByText('No windows supplied')).toHaveLength(2)
  })
  it('only displays complete valid supplied ratios', () => {
    expect(validWorkRest(25, 75)).toBe(true)
    expect(validWorkRest(null, 75)).toBe(false)
    expect(validWorkRest(110, -10)).toBe(false)
    expect(validWorkRest(30, 30)).toBe(false)
    expect(validWbgtBand('unexpected')).toBe(false)
    expect(validWbgtBand(null)).toBe(false)
  })
  it('renders unexpected WBGT classifications without crashing or deriving a band', () => {
    const hourly = [{ hour: 12, wbgt: 33, band: 'unexpected', work_pct: null, rest_pct: null }] as unknown as OccupationalHour[]
    expect(() => render(<WbgtChart hourly={hourly} />)).not.toThrow()
    expect(screen.getByText('Classification unavailable')).toBeInTheDocument()
    expect(screen.queryByText(/75% rest each hour|continuous work/)).not.toBeInTheDocument()
  })
})

describe('forecast date and baseline integrity', () => {
  const hourly: ForecastHour[] = [
    { time: '2026-09-07T20:00:00Z', utci: 30, baseline_p97: null },
    { time: '2026-09-07T10:00:00Z', utci: 40, baseline_p97: 0 },
    { time: 'invalid', utci: 99, baseline_p97: 25 },
  ]
  it('matches the actual date in the forecast timezone', () => {
    expect(forecastDate(hourly[0].time)).toBe('2026-09-08')
    const points = forecastPoints(hourly, '2026-09-08')
    expect(points).toHaveLength(1)
    expect(points[0].utci).toBe(30)
    expect(points[0].baseline).toBeNull()
    expect(points[0].exceedance).toBeNull()
  })
  it('preserves valid zero and excludes invalid timestamps', () => {
    const points = forecastPoints(hourly, '2026-09-07')
    expect(points).toHaveLength(1)
    expect(points[0].baseline).toBe(0)
  })
  it('does not fall back to another date', () => {
    render(<UtciChart hourly={hourly} selectedDate="2026-09-09" />)
    expect(screen.getByText(/unavailable for 2026-09-09/)).toBeInTheDocument()
    expect(screen.queryByTestId('utci-chart')).not.toBeInTheDocument()
  })
})

describe('alert identity and validity', () => {
  const xml = (id: string) => `<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2"><identifier>${id}</identifier><sender>test.example</sender><sent>2026-09-07T10:00:00Z</sent><status>Test</status></alert>`
  it('accepts the requested CAP identity and rejects substitution or malformed XML', () => {
    expect(() => validateCapXml(xml('requested-id'), 'requested-id')).not.toThrow()
    expect(() => validateCapXml(xml('different-id'), 'requested-id')).toThrow(/does not match/)
    expect(() => validateCapXml('<html>error</html>', 'requested-id')).toThrow(/valid CAP/)
  })
  it('distinguishes missing validity from current or expired alerts', () => {
    const now = Date.parse('2026-09-07T12:00:00Z')
    expect(alertValidity({ issued_at: null }, now)).toBe('unknown')
    expect(alertValidity({ issued_at: '2026-09-07T10:00:00Z', expires_at: '2026-09-07T11:00:00Z' }, now)).toBe('expired')
    expect(alertValidity({ issued_at: '2026-09-07T10:00:00Z', expires_at: '2026-09-07T13:00:00Z' }, now)).toBe('current')
  })
  it('does not call a future facility verification current', () => {
    expect(freshnessOf('2099-01-01').label).toBe('Verification date invalid')
    expect(freshnessOf(null).label).toBe('Verification not supplied')
  })
})
