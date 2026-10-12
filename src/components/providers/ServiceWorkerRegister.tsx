'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, RefreshCw, X } from 'lucide-react'

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

type AppleNavigator = Navigator & { standalone?: boolean }

/** Single registration owner; installation appears only when supported. */
export function ServiceWorkerRegister() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const [iosHelp, setIosHelp] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [installing, setInstalling] = useState(false)
  const [updating, setUpdating] = useState(false)
  const reloadForUpdate = useRef(false)

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as AppleNavigator).standalone === true
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    setIosHelp(ios && !standalone)

    const onPrompt = (event: Event) => {
      if (standalone) return
      event.preventDefault()
      setInstallPrompt(event as InstallPromptEvent)
      setDismissed(false)
    }
    const onInstalled = () => {
      setInstallPrompt(null)
      setIosHelp(false)
      setStatus('TAPAS was added to this device.')
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return
    let disposed = false
    const hadController = navigator.serviceWorker.controller !== null
    let registration: ServiceWorkerRegistration | undefined
    let installingWorker: ServiceWorker | null = null

    const inspectWaiting = () => {
      if (!disposed && registration?.waiting && navigator.serviceWorker.controller) {
        setWaiting(registration.waiting)
      }
    }
    const onStateChange = () => {
      if (installingWorker?.state === 'installed') inspectWaiting()
    }
    const onUpdateFound = () => {
      installingWorker?.removeEventListener('statechange', onStateChange)
      installingWorker = registration?.installing ?? null
      installingWorker?.addEventListener('statechange', onStateChange)
    }
    const onControllerChange = () => {
      // A user accepting the update in another open tab also changes this
      // tab's worker. Reload its shell so chunks and worker remain compatible.
      if (reloadForUpdate.current || hadController) window.location.reload()
    }
    const checkUpdate = () => {
      if (navigator.onLine && document.visibilityState === 'visible') {
        void registration?.update().catch(() => undefined)
      }
    }
    const register = async () => {
      try {
        registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/', updateViaCache: 'none',
        })
        if (disposed) return
        inspectWaiting()
        registration.addEventListener('updatefound', onUpdateFound)
        onUpdateFound()
        void registration.update().catch(() => undefined)
      } catch {
        if (!disposed) setStatus('Offline preparation is unavailable. Reconnect and reload to try again.')
      }
    }

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
    window.addEventListener('online', checkUpdate)
    document.addEventListener('visibilitychange', checkUpdate)
    if (document.readyState === 'complete') void register()
    else window.addEventListener('load', register, { once: true })

    return () => {
      disposed = true
      window.removeEventListener('load', register)
      window.removeEventListener('online', checkUpdate)
      document.removeEventListener('visibilitychange', checkUpdate)
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      registration?.removeEventListener('updatefound', onUpdateFound)
      installingWorker?.removeEventListener('statechange', onStateChange)
    }
  }, [])

  async function install() {
    if (!installPrompt || installing) return
    setInstalling(true)
    try {
      await installPrompt.prompt()
      const result = await installPrompt.userChoice
      setStatus(result.outcome === 'accepted'
        ? 'Installation requested. Follow your browser’s confirmation.'
        : null)
    } catch {
      setStatus('The install prompt is unavailable. Use your browser’s install menu if offered.')
    } finally {
      setInstallPrompt(null)
      setInstalling(false)
    }
  }

  function update() {
    if (!waiting) return
    reloadForUpdate.current = true
    setUpdating(true)
    waiting.postMessage({ type: 'SKIP_WAITING' })
  }

  if (!waiting && (dismissed || (!installPrompt && !iosHelp && !status))) return null

  return (
    <aside
      aria-label="App installation and updates"
      className="no-print border-t border-border bg-card px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 text-sm">
        {waiting ? (
          <>
            <p className="min-w-0 flex-1">An updated TAPAS app is ready. Your selected location is kept in the page URL.</p>
            <button type="button" disabled={updating} onClick={update} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-60">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              {updating ? 'Updating…' : 'Update and reload'}
            </button>
          </>
        ) : (
          <>
            <div className="min-w-0 flex-1">
              {status ? <p role="status">{status}</p> : iosHelp && !installPrompt ? (
                <p>To add TAPAS on iPhone or iPad, open it in Safari, choose Share → Add to Home Screen, and keep Open as Web App enabled when offered.{' '}
                  <a className="underline" href="https://support.apple.com/en-in/guide/iphone/iphea86e5236/ios" target="_blank" rel="noopener noreferrer">Apple instructions</a>
                </p>
              ) : <p>Add TAPAS to this device for quicker access. New data and uncached maps need a connection.</p>}
            </div>
            {installPrompt && (
              <button type="button" onClick={() => void install()} disabled={installing} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-60">
                <Download className="h-4 w-4" aria-hidden="true" />
                {installing ? 'Opening install prompt…' : 'Install TAPAS'}
              </button>
            )}
            <button type="button" onClick={() => setDismissed(true)} aria-label="Dismiss app installation notice" className="flex h-11 w-11 shrink-0 items-center justify-center rounded hover:bg-muted">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </aside>
  )
}
