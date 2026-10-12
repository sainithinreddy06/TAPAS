import { describe, expect, it } from 'vitest'
import type { SelectedLocation } from '@/lib/location'
import { NATIONAL_REFERENCES, officialApplies, parseOfficialInformation, type OfficialInformation } from '@/lib/official'

const location: SelectedLocation = { id: 'fixture', name: 'Mumbai', latitude: 19.076, longitude: 72.8777, countryCode: 'IN', state: 'Maharashtra', district: 'Mumbai', locality: 'Mumbai', timezone: 'Asia/Kolkata', source: 'test' }
const item: OfficialInformation = { id: 'fixture-not-operational', title: 'Test local programme', summary: 'Fixture text', authority: 'Test authority', sourceUrl: 'https://example.gov.in/notice', kind: 'programme', scope: { countryCode: 'IN', state: 'Maharashtra', locality: 'Mumbai' }, issuedAt: '2026-01-01', validFrom: '2026-01-01', validUntil: '2026-12-31' }

describe('official geographic and temporal applicability', () => {
  it('never shows a state programme in another state', () => {
    expect(officialApplies(item, location, '2026-09-07')).toBe(true)
    expect(officialApplies(item, { ...location, state: 'Delhi' }, '2026-09-07')).toBe(false)
  })
  it('does not promote city-specific content nationally or infer missing context', () => {
    expect(officialApplies(item, { ...location, locality: 'Pune' }, '2026-09-07')).toBe(false)
    expect(officialApplies(item, { ...location, locality: undefined }, '2026-09-07')).toBe(false)
  })
  it('requires validity dates for active notices', () => {
    expect(officialApplies(item, location, '2027-01-01')).toBe(false)
    expect(officialApplies({ ...item, validUntil: undefined }, location, '2026-09-07')).toBe(false)
    expect(officialApplies(item, location, '2026-02-30')).toBe(false)
  })
  it('keeps national references separate from active programmes', () => {
    expect(NATIONAL_REFERENCES.every(reference => reference.kind === 'reference')).toBe(true)
    expect(NATIONAL_REFERENCES.every(reference => officialApplies(reference, location, '2026-09-07'))).toBe(true)
  })
  it('rejects fake authority URLs, missing validity and malformed scope', () => {
    expect(parseOfficialInformation({ items: [item] })).toHaveLength(1)
    expect(parseOfficialInformation({ items: [{ ...item, sourceUrl: 'javascript:alert(1)' }, { ...item, sourceUrl: 'https://not-government.example' }, { ...item, validUntil: undefined }, { ...item, scope: { countryCode: 'IN', state: 123 } }] })).toEqual([])
  })
})
