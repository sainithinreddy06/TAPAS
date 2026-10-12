import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { buildSampleGrid, sampleAxis } from '@/lib/map/sampling'
import {
  colourFor,
  colourGradient,
  legendTicks,
  stressLabel,
  UTCI_STOPS,
  HI_STOPS,
} from '@/lib/map/colormap'
import { probeField, nearestPoint, distanceKm } from '@/lib/map/probe'
import { computeHeatFieldDirect } from '@/lib/map/fieldWorkerClient'
import { getCachedLandMask } from '@/lib/map/landMask'
import { renderField } from '@/lib/map/renderField'
import { ProbeCard } from '@/components/map/ProbeCard'

describe('Raster Field Interpolation & Sampling (Part 2 & 3)', () => {
  const bbox: [number, number, number, number] = [78.0, 17.0, 79.0, 18.0] // [west, south, east, north]

  it('builds grid according to zoom levels', () => {
    expect(sampleAxis(3)).toBe(14)
    expect(sampleAxis(5)).toBe(13)
    expect(sampleAxis(7)).toBe(12)
    expect(sampleAxis(9)).toBe(11)
    expect(sampleAxis(12)).toBe(10)

    const grid = buildSampleGrid(bbox, 4)
    expect(grid.cols).toBe(14)
    expect(grid.rows).toBe(14)
    expect(grid.points.length).toBe(14 * 14)
    expect(grid.points[0].lat).toBeCloseTo(17.0)
    expect(grid.points[0].lon).toBeCloseTo(78.0)
    expect(grid.points[grid.points.length - 1].lat).toBeCloseTo(18.0)
    expect(grid.points[grid.points.length - 1].lon).toBeCloseTo(79.0)
  })

  it('computes 150x150 IDW field with cos(lat) correction and valid ranges', () => {
    const samples = [
      { lat: 17.2, lon: 78.2, value: 47.5 },
      { lat: 17.5, lon: 78.5, value: 39.0 },
      { lat: 17.8, lon: 78.8, value: 33.0 },
      { lat: 17.3, lon: 78.7, value: 28.0 },
    ]

    const field = computeHeatFieldDirect(samples, bbox, 150, 150, 2.5)
    expect(field).toBeInstanceOf(Float32Array)
    expect(field.length).toBe(150 * 150)

    // Center cell should be interpolated between sample min and max
    const centerVal = field[75 * 150 + 75]
    expect(Number.isNaN(centerVal)).toBe(false)
    expect(centerVal).toBeGreaterThanOrEqual(25)
    expect(centerVal).toBeLessThanOrEqual(50)
  })
})

describe('Colour Mapping & Gradients (Part 4 & 9)', () => {
  it('maps UTCI values to COST Action 730 thermal stress categories', () => {
    // Extreme heat stress (>46)
    const [rExt, gExt, bExt] = colourFor(48, 'utci')
    expect(rExt).toBeGreaterThan(150)

    // Deep blue for no thermal stress (<9)
    const [rBlue, gBlue, bBlue] = colourFor(8, 'utci')
    expect(bBlue).toBe(UTCI_STOPS[0][1][2])

    // Labels
    expect(stressLabel(48, 'utci')).toBe('Extreme')
    expect(stressLabel(40, 'utci')).toBe('Very strong')
    expect(stressLabel(34, 'utci')).toBe('Strong')
    expect(stressLabel(28, 'utci')).toBe('Moderate')
    expect(stressLabel(20, 'utci')).toBe('No thermal stress')
  })

  it('generates real CSS linear gradient string', () => {
    const gradUtci = colourGradient('utci')
    expect(gradUtci).toContain('linear-gradient(to right')
    expect(gradUtci).toContain('rgb(46,84,140)')
    expect(gradUtci).toContain('rgb(110,24,36)')

    const gradHi = colourGradient('heat_index')
    expect(gradHi).toContain('linear-gradient(to right')
  })

  it('provides ticks at official category boundaries', () => {
    const utciTicks = legendTicks('utci')
    expect(utciTicks.map((t) => t[0])).toEqual([9, 26, 32, 38, 46])

    const hiTicks = legendTicks('heat_index')
    expect(hiTicks.map((t) => t[0])).toEqual([20, 27, 32, 41, 54])
  })
})

describe('Hover Readout & Probing (Part 8)', () => {
  const bbox: [number, number, number, number] = [78.0, 17.0, 79.0, 18.0]
  const field = new Float32Array(150 * 150)
  field.fill(40.0)

  it('probes interpolated field at arbitrary lat/lon with bilinear interpolation', () => {
    const probed = probeField(field, 150, 150, bbox, 17.5, 78.5)
    expect(probed).toBeCloseTo(40.0, 1)

    // Outside bbox returns null
    expect(probeField(field, 150, 150, bbox, 16.0, 78.5)).toBeNull()
    expect(probeField(field, 150, 150, bbox, 17.5, 80.0)).toBeNull()
  })

  it('finds nearest sample point and accurate distance in km', () => {
    const points = [
      { latitude: 17.385, longitude: 78.486, name: 'Hyderabad Central' },
      { latitude: 17.44, longitude: 78.348, name: 'HITEC City' },
    ]

    const dist = distanceKm(17.385, 78.486, 17.44, 78.348)
    expect(dist).toBeGreaterThan(10)
    expect(dist).toBeLessThan(20)

    const nearest = nearestPoint(points, 17.39, 78.48)
    expect(nearest?.point.name).toBe('Hyderabad Central')
    expect(nearest?.distanceKm).toBeLessThan(2)
  })
})

describe('ProbeCard Component (Part 8)', () => {
  it('renders headline UTCI, tabular numbers, nearest parameters and honest disclosure', () => {
    render(
      <ProbeCard
        lat={17.412}
        lon={78.487}
        value={41.2}
        metric="utci"
        nearest={{
          temperature: 38.4,
          mrt: 58.1,
          humidity: 62,
          wind: 1.2,
          heatIndex: 44.8,
        }}
        distanceKm={8.4}
        placeName="Begumpet, Hyderabad"
        validTime="Valid 10 Sept, 3:00 pm IST"
      />
    )

    // Headline & Category
    expect(screen.getByText(/41\.2/)).toBeInTheDocument()
    expect(screen.getByText(/VERY STRONG/i)).toBeInTheDocument()
    expect(screen.getByText(/near Begumpet, Hyderabad/)).toBeInTheDocument()

    // Secondary metrics
    expect(screen.getByText('38.4 °C')).toBeInTheDocument()
    expect(screen.getByText('58.1 °C')).toBeInTheDocument()
    expect(screen.getByText('62 %')).toBeInTheDocument()
    expect(screen.getByText('1.2 m/s')).toBeInTheDocument()
    expect(screen.getByText('44.8 °C')).toBeInTheDocument()

    // Honest disclosure
    expect(screen.getByText(/Interpolated · nearest model point/)).toBeInTheDocument()
    expect(screen.getByText('8.4 km')).toBeInTheDocument()
    expect(screen.getByText('Valid 10 Sept, 3:00 pm IST')).toBeInTheDocument()
  })
})

describe('Land Masking & Canvas Rendering (Part 5 & 6)', () => {
  const bbox: [number, number, number, number] = [68.0, 6.0, 98.0, 38.0]

  it('builds cached land mask of expected dimensions', () => {
    const mask = getCachedLandMask(bbox, 150, 150)
    expect(mask).toBeInstanceOf(Uint8Array)
    expect(mask.length).toBe(150 * 150)
  })

  it('renders field canvas upscaled 6x', () => {
    const field = new Float32Array(10 * 10).fill(38)
    const canvas = renderField(field, 10, 10, 'utci')
    expect(canvas).toBeInstanceOf(HTMLCanvasElement)
    expect(canvas.width).toBe(60)
    expect(canvas.height).toBe(60)
  })
})
