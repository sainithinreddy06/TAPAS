import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThermalLayer } from '@/components/map/ThermalLayer'
import { fetchHeatGrid, snapshotGrid, NATIONAL_BOUNDS } from '@/lib/heatGrid'
import { LocationProvider } from '@/components/providers/LocationProvider'
import { getDefaultFacilities } from '@/lib/resources'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard',
}))

describe('Polka Dots Map Grid Restoration', () => {
  it('provides reliable non-empty snapshot points for national and city viewports', () => {
    const national = snapshotGrid(NATIONAL_BOUNDS, 3, '2026-09-10')
    expect(national).toBeDefined()
    expect(national!.points.length).toBeGreaterThan(0)
    expect(national!.provenance.source).toContain('Open-Meteo')

    // City zoom also falls back gracefully and never returns undefined
    const city = snapshotGrid([78.2, 17.2, 78.6, 17.6], 11, '2026-09-10')
    expect(city).toBeDefined()
    expect(city!.points.length).toBeGreaterThan(0)
  })

  it('fetchHeatGrid returns live points with Open-Meteo models provenance', async () => {
    const res = await fetchHeatGrid(NATIONAL_BOUNDS, 4, '2026-09-10', undefined, 'heat_index')
    expect(res.points.length).toBeGreaterThan(0)
    expect(res.provenance.source).toBe('Open-Meteo best-match weather models')
    expect(res.points[0].id).toBeDefined()
    expect(res.points[0].temperature).toBeTypeOf('number')
  })

  it('initializes thermal-circles circle layer on map and registers hover and click listeners', async () => {
    const addedLayers: any[] = []
    const addedSources: Record<string, any> = {}
    const eventListeners: Record<string, any[]> = {}

    const mockMap: any = {
      isStyleLoaded: () => true,
      getStyle: () => ({ layers: [{ id: 'background', type: 'background' }] }),
      getSource: (id: string) => addedSources[id],
      addSource: (id: string, source: any) => {
        addedSources[id] = { ...source, setData: vi.fn() }
      },
      getLayer: (id: string) => addedLayers.find((l) => l.id === id),
      addLayer: (layer: any) => {
        addedLayers.push(layer)
      },
      removeLayer: vi.fn(),
      removeSource: vi.fn(),
      on: (event: string, layerOrFn: any, fn?: any) => {
        const key = typeof layerOrFn === 'string' ? `${event}:${layerOrFn}` : event
        eventListeners[key] = eventListeners[key] || []
        eventListeners[key].push(fn || layerOrFn)
      },
      off: vi.fn(),
      getCanvas: () => ({ style: {} }),
      getBounds: () => ({
        getWest: () => 68,
        getSouth: () => 6,
        getEast: () => 98,
        getNorth: () => 38,
      }),
      getZoom: () => 4.4,
      queryRenderedFeatures: () => [{ properties: { id: '17.38,78.48' } }],
    }

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <LocationProvider>
          <ThermalLayer map={mockMap} date="2026-09-10" />
        </LocationProvider>
      </QueryClientProvider>
    )

    // Verify source and layer creation
    expect(addedSources['thermal-points']).toBeDefined()
    expect(addedSources['thermal-points'].type).toBe('geojson')

    const circleLayer = addedLayers.find((l) => l.id === 'thermal-circles')
    expect(circleLayer).toBeDefined()
    expect(circleLayer.type).toBe('circle')
    expect(circleLayer.source).toBe('thermal-points')
    expect(circleLayer.paint['circle-color']).toEqual(['get', 'color'])
    expect(circleLayer.paint['circle-opacity']).toBe(0.85)

    // Verify hover and click listeners are registered on thermal-circles
    expect(eventListeners['mousemove:thermal-circles']).toBeDefined()
    expect(eventListeners['mouseleave:thermal-circles']).toBeDefined()
    expect(eventListeners['click:thermal-circles']).toBeDefined()

    // Verify UI control panel elements
    await waitFor(() => {
      expect(screen.getByTestId('heat-layer')).toBeInTheDocument()
      expect(screen.getByText(/weather-model points/i)).toBeInTheDocument()
    })
  })

  it('provides default response network for water cooling stations, commercial AC, and nearby hospitals', () => {
    const facilities = getDefaultFacilities()
    expect(facilities.length).toBeGreaterThan(100)

    const water = facilities.filter((f: any) => f.category === 'water')
    const cooling = facilities.filter((f: any) => f.category === 'cooling')
    const medical = facilities.filter((f: any) => f.category === 'medical')

    expect(water.length).toBeGreaterThan(0)
    expect(cooling.length).toBeGreaterThan(0)
    expect(medical.length).toBeGreaterThan(0)

    // Verify properties
    for (const f of [...water.slice(0, 5), ...cooling.slice(0, 5), ...medical.slice(0, 5)]) {
      expect(f.id).toBeDefined()
      expect(f.name).toBeDefined()
      expect(typeof f.latitude).toBe('number')
      expect(typeof f.longitude).toBe('number')
    }
  })
})

