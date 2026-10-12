import { describe, expect, it } from 'vitest'
import { directionsUrl, distanceKm, filterResources, parseOfficialResources, parseOverpass, phoneHref, type SafetyResource } from '@/lib/resources'
import type { SelectedLocation } from '@/lib/location'

const place: SelectedLocation = { id: 'test-mumbai', name: 'Test coordinates', latitude: 19.076, longitude: 72.8777, countryCode: 'IN', state: 'Maharashtra', district: 'Mumbai', timezone: 'Asia/Kolkata', source: 'test' }
const poi = { type: 'node', id: 123, lat: 19.077, lon: 72.879, tags: { amenity: 'clinic', name: 'Fixture clinic' } }

describe('nearby resource integrity', () => {
  it('calculates real great-circle proximity without travel-time claims', () => {
    expect(distanceKm(place, place)).toBe(0)
    expect(distanceKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 })).toBeCloseTo(111.195, 2)
    expect(distanceKm(place, { latitude: NaN, longitude: 0 })).toBeNaN()
  })
  it('keeps absent phone, hours and verification absent', () => {
    const [resource] = parseOverpass({ elements: [poi] }, place)
    expect(resource.verification).toBe('community-mapped')
    expect(resource.phone).toBeUndefined()
    expect(resource.openingHours).toBeUndefined()
    expect(resource.verifiedAt).toBeUndefined()
    expect(resource).not.toHaveProperty('openNow')
    expect(resource).not.toHaveProperty('capacity')
  })
  it('rejects invalid coordinates, private access and faraway records', () => {
    expect(parseOverpass({ elements: [{ ...poi, lat: null }, { ...poi, lat: 28.6 }, { ...poi, tags: { ...poi.tags, access: 'private' } }] }, place)).toEqual([])
  })
  it('does not turn generic water or shelters into cooling centres', () => {
    const rows = parseOverpass({ elements: [{ ...poi, tags: { amenity: 'shelter' } }, { ...poi, id: 124, tags: { amenity: 'drinking_water' } }] }, place)
    expect(rows).toHaveLength(1)
    expect(rows[0].category).toBe('water')
    expect(filterResources(rows, 'cooling')).toEqual([])
    expect(filterResources(rows, 'water')).toHaveLength(1)
  })
  it('rejects malformed and partial upstream responses', () => {
    expect(() => parseOverpass({}, place)).toThrow()
    expect(() => parseOverpass({ elements: [poi], remark: 'runtime error: timeout' }, place)).toThrow()
  })
  it('uses supplied emergency evidence for the emergency filter', () => {
    const rows = parseOverpass({ elements: [poi, { ...poi, id: 124, tags: { ...poi.tags, emergency: 'yes' } }] }, place)
    expect(filterResources(rows, 'emergency').map(row => row.id)).toEqual(['osm-node-124'])
  })
  it('makes directions from real coordinates and rejects unsafe phones', () => {
    const [resource] = parseOverpass({ elements: [poi] }, place)
    const url = new URL(directionsUrl(resource, place)!)
    expect(url.searchParams.get('destination')).toBe('19.077,72.879')
    expect(url.searchParams.get('origin')).toBe('19.076,72.8777')
    expect(phoneHref('javascript:alert(1)')).toBeUndefined()
    expect(directionsUrl({ ...resource, latitude: NaN } as SafetyResource)).toBeUndefined()
  })
  it('requires an official source and excludes expired relief records', () => {
    const official = { id: 'fixture-only', name: 'Fixture relief record', authority: 'Test authority', sourceUrl: 'https://example.gov.in/resources', countryCode: 'IN', category: 'cooling', latitude: poi.lat, longitude: poi.lon }
    expect(parseOfficialResources({ resources: [official] }, place)).toHaveLength(1)
    expect(parseOfficialResources({ resources: [{ ...official, sourceUrl: 'https://example.gov.in.evil.test' }, { ...official, validUntil: '2020-01-01' }, { ...official, latitude: undefined }] }, place)).toEqual([])
  })
})
