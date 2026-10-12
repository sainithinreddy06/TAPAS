import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { onlineManager, useQuery } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OfflineBanner } from '@/components/layout/OfflineBanner'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { ServiceWorkerRegister } from '@/components/providers/ServiceWorkerRegister'

beforeEach(() => {
  vi.spyOn(window, 'matchMedia').mockImplementation((media) => ({
    matches: false, media, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  }))
})

afterEach(() => {
  cleanup()
  onlineManager.setOnline(true)
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('offline semantics', () => {
  it('labels an offline-restored shell even when the browser reports online', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    const marker = document.createElement('meta')
    marker.name = 'tapas-offline-shell'; marker.content = 'true'; document.head.append(marker)
    render(<OfflineBanner />)
    expect(screen.getByTestId('offline-banner')).toBeVisible()
    act(() => window.dispatchEvent(new Event('online')))
    expect(screen.queryByTestId('offline-banner')).not.toBeInTheDocument()
    marker.remove()
  })
  it('does not claim data exists or give an unrelated freshness time', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    render(<OfflineBanner />)
    expect(screen.getByTestId('offline-banner')).toHaveTextContent('Saved results, when available')
    expect(screen.getByTestId('offline-banner')).not.toHaveTextContent('showing data from')
  })

  it('runs the cache adapter after an offline startup and exposes its no-cache error', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    onlineManager.setOnline(false)
    const queryFn = vi.fn().mockRejectedValue(new Error('No saved forecast for this location.'))
    function QueryProbe() {
      const result = useQuery({ queryKey: ['offline-probe'], queryFn })
      return <p>{result.error?.message ?? result.fetchStatus}</p>
    }
    render(<QueryProvider><QueryProbe /></QueryProvider>)
    expect(await screen.findByText('No saved forecast for this location.')).toBeVisible()
    expect(queryFn).toHaveBeenCalledTimes(1)
  })

  it('re-arms a dismissed notice on a new outage', async () => {
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    render(<OfflineBanner />)
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss offline notice' }))
    expect(screen.queryByTestId('offline-banner')).not.toBeInTheDocument()
    online.mockReturnValue(true)
    act(() => window.dispatchEvent(new Event('online')))
    online.mockReturnValue(false)
    act(() => window.dispatchEvent(new Event('offline')))
    expect(await screen.findByTestId('offline-banner')).toBeVisible()
  })
})

describe('PWA installation and updates', () => {
  it('does not invent an install button when the browser offers no prompt', () => {
    render(<ServiceWorkerRegister />)
    expect(screen.queryByRole('button', { name: 'Install TAPAS' })).not.toBeInTheDocument()
  })

  it('uses the actual one-use browser prompt and does not claim installation after dismissal', async () => {
    render(<ServiceWorkerRegister />)
    const prompt = vi.fn().mockResolvedValue(undefined)
    const event = new Event('beforeinstallprompt', { cancelable: true })
    Object.assign(event, {
      prompt,
      userChoice: Promise.resolve({ outcome: 'dismissed', platform: 'web' }),
    })
    act(() => window.dispatchEvent(event))
    expect(event.defaultPrevented).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Install TAPAS' }))
    await waitFor(() => expect(prompt).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Install TAPAS' })).not.toBeInTheDocument())
    expect(screen.queryByText(/was added to this device/)).not.toBeInTheDocument()
  })

  it('leaves a new worker waiting until the user accepts an update', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const waiting = Object.assign(new EventTarget(), { postMessage: vi.fn() })
    const registration = Object.assign(new EventTarget(), {
      waiting, installing: null, update: vi.fn().mockResolvedValue(undefined),
    })
    const serviceWorker = Object.assign(new EventTarget(), {
      controller: {}, register: vi.fn().mockResolvedValue(registration),
    })
    const previous = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker')
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: serviceWorker })
    try {
      const view = render(<ServiceWorkerRegister />)
      act(() => window.dispatchEvent(new Event('load')))
      expect(await screen.findByRole('button', { name: 'Update and reload' })).toBeVisible()
      expect(waiting.postMessage).not.toHaveBeenCalled()
      fireEvent.click(screen.getByRole('button', { name: 'Update and reload' }))
      expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
      view.unmount()
    } finally {
      if (previous) Object.defineProperty(navigator, 'serviceWorker', previous)
      else Reflect.deleteProperty(navigator, 'serviceWorker')
    }
  })
})
