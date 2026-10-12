import { describe, expect, it } from 'vitest'
import { idwGrid } from '@/lib/map/interpolate'
import { buildContours, UTCI_BANDS, HI_BANDS } from '@/lib/map/contours'

describe('IDW Interpolation and Isotherm Contours (Part 2)', () => {
  const bbox: [number, number, number, number] = [78.0, 17.0, 79.0, 18.0] // [west, south, east, north]
  const samplePoints = [
    { lat: 17.2, lon: 78.2, value: 47.5 }, // Extreme (>46)
    { lat: 17.5, lon: 78.5, value: 39.0 }, // Very strong (38-46)
    { lat: 17.8, lon: 78.8, value: 33.0 }, // Strong (32-38)
    { lat: 17.3, lon: 78.7, value: 28.0 }, // Moderate (26-32)
  ]

  it('interpolates points onto a 160x160 regular grid', () => {
    const grid = idwGrid(samplePoints, bbox, 160, 160, 2)
    expect(grid).toBeInstanceOf(Float32Array)
    expect(grid.length).toBe(160 * 160)

    // Check no NaN values
    for (let i = 0; i < grid.length; i++) {
      expect(Number.isNaN(grid[i])).toBe(false)
      expect(grid[i]).toBeGreaterThanOrEqual(25)
      expect(grid[i]).toBeLessThanOrEqual(50)
    }
  })

  it('generates multi-polygon GeoJSON contour bands matching UTCI thresholds', () => {
    const grid = idwGrid(samplePoints, bbox, 160, 160, 2)
    const contours = buildContours(grid, 160, 160, bbox, 'utci')

    expect(contours.type).toBe('FeatureCollection')
    expect(contours.features.length).toBe(UTCI_BANDS.length)

    for (const feature of contours.features) {
      expect(feature.type).toBe('Feature')
      expect(feature.geometry.type).toBe('MultiPolygon')
      expect(feature.properties).toHaveProperty('threshold')
      expect(feature.properties).toHaveProperty('level')
      expect(feature.properties).toHaveProperty('label')
      expect(feature.properties?.metric).toBe('utci')
    }
  })

  it('generates NOAA Heat Index bands when metric is heat_index', () => {
    const grid = idwGrid(samplePoints, bbox, 160, 160, 2)
    const contours = buildContours(grid, 160, 160, bbox, 'heat_index')

    expect(contours.features.length).toBe(HI_BANDS.length)
    expect(contours.features[0].properties?.threshold).toBe(HI_BANDS[0])
    expect(contours.features[0].properties?.metric).toBe('heat_index')
  })
})
