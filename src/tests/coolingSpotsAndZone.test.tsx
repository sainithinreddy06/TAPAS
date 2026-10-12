import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { getNearbyCoolingSpots, getLocalResponseNetwork } from '@/lib/coolingSpots'
import { CoolingSpotsPanel } from '@/components/help/CoolingSpotsPanel'

describe('Dynamic Nearest Verified Cooling Spots & Local Response Network', () => {
  it('returns 5 verified cooling spots for any given location with straight-line distance', () => {
    const origin = { latitude: 17.3616, longitude: 78.4747 } // Charminar
    const spots = getNearbyCoolingSpots(origin, 'Charminar')

    expect(spots.length).toBeGreaterThanOrEqual(4)
    expect(spots.length).toBeLessThanOrEqual(5)

    // All spots must have valid coordinates, straight-line distance, capacity, and hours
    for (const spot of spots) {
      expect(spot.distance_km).toBeGreaterThanOrEqual(0)
      expect(Number.isFinite(spot.latitude)).toBe(true)
      expect(Number.isFinite(spot.longitude)).toBe(true)
      expect(spot.name).toBeDefined()
      expect(spot.type).toBeDefined()
    }

    // Spots should be sorted in ascending order of distance
    for (let i = 1; i < spots.length; i++) {
      expect(spots[i].distance_km).toBeGreaterThanOrEqual(spots[i - 1].distance_km)
    }
  })

  it('calculates different distances when searching or fetching another location', () => {
    const hydCenter = { latitude: 17.4849, longitude: 78.4138 } // Kukatpally
    const banjara = { latitude: 17.4156, longitude: 78.4354 } // Banjara Hills

    const spotsHyd = getNearbyCoolingSpots(hydCenter, 'Kukatpally')
    const spotsBanjara = getNearbyCoolingSpots(banjara, 'Banjara Hills')

    // Nearest spot in Banjara should be near Banjara Hills
    expect(spotsBanjara[0].name).toContain('Banjara Hills')
    expect(spotsBanjara[0].distance_km).toBeLessThan(3.0)

    // Nearest spot in Kukatpally should be near Kukatpally
    expect(spotsHyd[0].name).toContain('Kukatpally')
    expect(spotsHyd[0].distance_km).toBeLessThan(3.0)
  })

  it('renders CoolingSpotsPanel with dynamic directions links containing origin coordinates', () => {
    const origin = { latitude: 17.4156, longitude: 78.4354 }
    const spots = getNearbyCoolingSpots(origin, 'Banjara Hills')

    render(
      <CoolingSpotsPanel
        spots={spots}
        wardName="Banjara Hills"
        userLocation={origin}
      />
    )

    // Header should reflect the fetched zone name
    expect(screen.getByText('Near Banjara Hills')).toBeInTheDocument()

    // Directions links should contain both origin and destination parameters
    const directionsLinks = screen.getAllByRole('link', { name: /Get Directions/i })
    expect(directionsLinks.length).toBe(spots.length)

    const firstHref = directionsLinks[0].getAttribute('href')
    expect(firstHref).toContain('origin=17.4156,78.4354')
    expect(firstHref).toContain('destination=')
  })

  it('customizes LocalResponseNetwork zone and officials for fetched locations', () => {
    const net = getLocalResponseNetwork('Banjara Hills')

    expect(net.officials.length).toBeGreaterThanOrEqual(3)
    expect(net.asha_workers.length).toBeGreaterThanOrEqual(2)

    // Check that officials and ASHA workers reflect the fetched zone
    const wardMember = net.officials.find((o) => o.designation === 'Ward Member')
    expect(wardMember?.status).toContain('Banjara Hills')

    const mro = net.officials.find((o) => o.designation === 'MRO')
    expect(mro?.status).toContain('Banjara Hills')

    const asha1 = net.asha_workers[0]
    expect(asha1.coverage_area).toContain('Banjara Hills')
  })
})
