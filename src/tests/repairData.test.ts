import { describe, it, expect } from 'vitest'
import { dataState } from '@/lib/dataState'
import { parseNominatim } from '@/lib/geocoding'
import { snapshotGrid, viewportPoints, NATIONAL_BOUNDS, parseHeatPoint } from '@/lib/heatGrid'
import raw from '@/data/heat-snapshot.json'
import { recordedResources } from '@/lib/resources'
import { coordinateLocation } from '@/lib/location'
import type { DataProvenance } from '@/lib/types'
describe('repair data invariants', () => {
  it('never retains live status after a failed refresh or expired validity', () => {
    const provenance: DataProvenance = { status: 'live', source: 'Test source', issuedAt: null, fetchedAt: '2026-09-07T12:00:00Z', geographicId: 'test', fromCache: false, validUntil: null }
    expect(dataState({ provenance }, false, new Error('provider failed')).status).toBe('cached')
    expect(dataState({ provenance: { ...provenance, validUntil: '2020-01-01T00:00:00Z' } }).status).toBe('cached')
    expect(dataState({ provenance: { ...provenance, status: 'snapshot' } }, false, new Error()).status).toBe('snapshot')
  })
  it('has 68 real national samples and bounds adaptive request counts', () => {
    expect(snapshotGrid()!.points).toHaveLength(68)
    expect(viewportPoints(NATIONAL_BOUNDS, 3)).toHaveLength(68)
    expect(viewportPoints([77, 16, 80, 19], 7).length).toBeLessThanOrEqual(40)
    expect(viewportPoints([78.4, 17.3, 78.5, 17.4], 12)).toHaveLength(25)
  })
  it('preserves actual provider coordinates and source timestamps in recordings', () => {
    const g = raw.recordings[0], point = parseHeatPoint(g.data[0], g.requests[0], '2026-09-07', true)!
    expect(point.latitude).toBe(g.data[0].latitude); expect(point.longitude).toBe(g.data[0].longitude)
    expect([g.data[0].current.time, ...g.data[0].hourly.time]).toContain(Date.parse(point.time) / 1000)
    expect(snapshotGrid()!.provenance.status).toBe('snapshot')
  })
  it('rejects a response for a different point', () => {
    const g = raw.recordings[0]
    expect(() => parseHeatPoint({ ...g.data[0], latitude: 0 }, g.requests[0], '2026-09-07', true)).toThrow()
  })
  it('accepts arbitrary Indian geocoder records and rejects foreign or malformed coordinates', () => {
    const row = { lat: '18.4386', lon: '79.1288', display_name: 'Karimnagar, Telangana, India', osm_type: 'relation', osm_id: 42, address: { city: 'Karimnagar', country_code: 'in' } }
    expect(parseNominatim([row], false)[0].name).toContain('Karimnagar')
    expect(parseNominatim([{ ...row, lat: '' }, { ...row, address: { country_code: 'us' } }], false)).toHaveLength(0)
  })
  it('does not replay Mumbai POIs as Hyderabad resources', () => {
    expect(recordedResources(coordinateLocation(19.076, 72.8777))?.status).toBe('snapshot')
    expect(recordedResources(coordinateLocation(17.385, 78.487))).toBeUndefined()
  })
})
