import { act, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ReferenceWeather } from '@/components/landing/ReferenceWeather'
import type { HeatPoint } from '@/lib/heatGrid'
import { fetchTickerReadings } from '@/lib/landing'

vi.mock('@/lib/landing', () => ({ fetchTickerReadings: vi.fn() }))

const point: HeatPoint = {
  id: 'delhi',
  name: 'Delhi',
  latitude: 28.6139,
  longitude: 77.209,
  time: '2026-09-09T08:30:00.000Z',
  temperature: 34.6,
  humidity: 62,
  wind: 2.3,
  apparent: 38.1,
  heatIndex: 40.2,
}

beforeEach(() => {
  vi.mocked(fetchTickerReadings).mockReset()
})

describe('ReferenceWeather', () => {
  it('labels the first returned city with model source, full valid IST time and supplied units', async () => {
    vi.mocked(fetchTickerReadings).mockResolvedValue([point, { ...point, id: 'mumbai', name: 'Mumbai' }])
    render(<ReferenceWeather />)

    expect(await screen.findByText('Delhi')).toBeVisible()
    const weather = screen.getByTestId('reference-weather')
    expect(weather).toHaveTextContent('Reference weather')
    expect(weather).toHaveTextContent('Open-Meteo weather model')
    expect(weather).toHaveTextContent(/Valid .*09.*Sept?.*2026.*14:00 IST/)
    expect(weather.querySelector('time')).toHaveAttribute('dateTime', point.time)
    expect(within(weather).getByText('34.6°C')).toBeVisible()
    expect(within(weather).getByText('62%')).toBeVisible()
    expect(within(weather).getByText('2.3 m/s')).toBeVisible()
    expect(weather).not.toHaveTextContent(/Mumbai|40.2|risk|live|safe/i)
  })

  it('keeps missing metrics unavailable without replacing the city or inventing values', async () => {
    vi.mocked(fetchTickerReadings).mockResolvedValue([
      { ...point, temperature: null, humidity: null, wind: null },
    ])
    render(<ReferenceWeather />)

    expect(await screen.findByText('Delhi')).toBeVisible()
    expect(screen.getAllByText('Unavailable')).toHaveLength(3)
    expect(screen.getByTestId('reference-weather')).not.toHaveTextContent(/0°C|0%|0 m\/s|Nagpur/)
  })

  it('keeps supplied zero readings instead of treating them as missing', async () => {
    vi.mocked(fetchTickerReadings).mockResolvedValue([
      { ...point, temperature: 0, humidity: 0, wind: 0 },
    ])
    render(<ReferenceWeather />)

    expect(await screen.findByText('0.0°C')).toBeVisible()
    expect(screen.getByText('0%')).toBeVisible()
    expect(screen.getByText('0.0 m/s')).toBeVisible()
  })

  it('uses the first valid city when an earlier point lacks valid metadata', async () => {
    vi.mocked(fetchTickerReadings).mockResolvedValue([
      { ...point, name: 'Invalid city', time: 'invalid' },
      point,
    ])
    render(<ReferenceWeather />)

    expect(await screen.findByText('Delhi')).toBeVisible()
    expect(screen.getByTestId('reference-weather')).not.toHaveTextContent('Invalid city')
  })

  it('shows unavailable for an empty response without recorded fallback readings', async () => {
    vi.mocked(fetchTickerReadings).mockResolvedValue([])
    render(<ReferenceWeather />)

    expect(await screen.findByText('Reference weather unavailable')).toBeVisible()
    expect(screen.getByTestId('reference-weather')).not.toHaveTextContent(/Nagpur|Delhi|°C|Recorded/)
  })

  it('shows unavailable after a request failure', async () => {
    vi.mocked(fetchTickerReadings).mockRejectedValue(new Error('Network unavailable'))
    render(<ReferenceWeather />)

    expect(await screen.findByText('Reference weather unavailable')).toBeVisible()
    expect(screen.queryByText('Loading reference weather…')).not.toBeInTheDocument()
  })

  it('shows loading and aborts the outstanding request on unmount', async () => {
    let resolveReadings!: (points: HeatPoint[]) => void
    vi.mocked(fetchTickerReadings).mockImplementation(() => new Promise((resolve) => {
      resolveReadings = resolve
    }))
    const view = render(<ReferenceWeather />)
    const signal = vi.mocked(fetchTickerReadings).mock.calls[0][0]

    expect(screen.getByText('Loading reference weather…')).toBeVisible()
    expect(signal?.aborted).toBe(false)
    view.unmount()
    expect(signal?.aborted).toBe(true)

    await act(async () => resolveReadings([point]))
    expect(screen.queryByTestId('reference-weather')).not.toBeInTheDocument()
  })
})
