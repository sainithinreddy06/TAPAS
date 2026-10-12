import { describe, expect, it } from 'vitest'
import { api, fetchJson } from '@/lib/client'
import { coordinateLocation } from '@/lib/location'

describe('TAPAS Live Science Engine Contract Verification', () => {
  const loc = coordinateLocation(17.385, 78.4867) // Hyderabad centroid
  const date = '2026-09-10'

  it('GET /api/risk/map passes strict frontend schema and identity check', async () => {
    const res = await api.riskMap(date, loc)
    expect(res.date).toBe(date)
    expect(res.wards.length).toBeGreaterThan(0)
    for (const w of res.wards) {
      expect(w.ward_id).toBeTruthy()
      expect(w.risk_level).toBeGreaterThanOrEqual(1)
      expect(w.risk_level).toBeLessThanOrEqual(5)
      expect(w.excess_deaths_low).toBeLessThanOrEqual(w.excess_deaths ?? 0)
      expect(w.excess_deaths ?? 0).toBeLessThanOrEqual(w.excess_deaths_high ?? 0)
    }
  })

  it('GET /api/forecast/{ward_id} returns 48-hour hourly forecast without ApiError', async () => {
    const res = await api.wardForecast('HYD-001', loc, date)
    expect(res.ward_id).toBe('HYD-001')
    expect(res.hourly.length).toBe(48)
    for (const h of res.hourly) {
      expect(h.time).toMatch(/T.*(?:Z|[+-]\d{2}:?\d{2})$/)
      if (h.utci !== null) {
        expect(h.utci).toBeGreaterThanOrEqual(-50)
        expect(h.utci).toBeLessThanOrEqual(70)
      }
    }
  })

  it('GET /api/risk/{ward_id}?days=5 returns 5 dated ward entries', async () => {
    const res = await api.wardRisk('HYD-001', 5, loc, date)
    expect(res.ward_id).toBe('HYD-001')
    expect(res.days.length).toBe(5)
    for (const d of res.days) {
      expect(d.ward_id).toBe('HYD-001')
      expect(d.risk_level).toBeGreaterThanOrEqual(1)
      expect(d.risk_level).toBeLessThanOrEqual(5)
    }
  })

  it('GET /api/occupational/{ward_id}?date= satisfies work_pct + rest_pct == 100', async () => {
    const res = await api.occupational('HYD-001', date, loc)
    expect(res.ward_id).toBe('HYD-001')
    expect(res.date).toBe(date)
    expect(res.hourly.length).toBe(24)
    for (const h of res.hourly) {
      expect(h.hour).toBeGreaterThanOrEqual(0)
      expect(h.hour).toBeLessThanOrEqual(23)
      if (h.work_pct !== null && h.rest_pct !== null) {
        expect(Math.abs(h.work_pct + h.rest_pct - 100)).toBeLessThanOrEqual(0.01)
      }
    }
  })

  it('GET /api/facilities/{ward_id} returns facilities with distance and type', async () => {
    const res = await api.facilities('HYD-001', loc)
    expect(res.ward_id).toBe('HYD-001')
    expect(res.facilities.length).toBeGreaterThan(0)
    for (const f of res.facilities) {
      expect(f.id).toBeTruthy()
      expect(f.name).toBeTruthy()
      expect(f.type).toBeTruthy()
    }
  })

  it('GET /api/alerts returns active alerts and GET /api/alerts/{id}/cap returns valid CAP 1.2', async () => {
    const res = await api.alerts(1, 10, loc, date)
    expect(res.alerts).toBeDefined()
    if (res.alerts.length > 0) {
      const first = res.alerts[0]
      expect(first.id).toBeTruthy()
      const capXml = await api.capXml(first.id)
      expect(capXml).toContain('urn:oasis:names:tc:emergency:cap:1.2')
      expect(capXml).toContain(first.id)
    }
  })

  it('GET /api/hindcast and GET /api/heatgrid validate structure', async () => {
    const hindcast = await fetchJson('http://localhost:8000/api/hindcast') as { status: string; episodes: unknown[] }
    expect(hindcast.status).toBe('verified')
    expect(hindcast.episodes.length).toBeGreaterThan(0)

    const heatgrid = await fetchJson('http://localhost:8000/api/heatgrid?bbox=17.2,78.2,17.6,78.6&zoom=5&metric=utci') as Array<{ lat: number; lon: number; value: number; metric: string; level: number }>
    expect(Array.isArray(heatgrid)).toBe(true)
    expect(heatgrid.length).toBeGreaterThan(0)
    expect(heatgrid[0].metric).toBe('utci')
  }, 15000)
})
