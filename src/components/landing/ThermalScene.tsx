'use client'

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import type { EntryRole } from './roles'
import { ENTRY_ROLES } from './roles'
import styles from './ThermalScene.module.css'

const TERRAIN =
  'M119 362 203 312 278 330 351 275 455 291 527 248 645 278 685 313 797 321 874 382 857 451 781 475 733 530 610 551 531 524 419 567 338 526 241 529 178 480 101 455 128 405 91 385Z'

function contour(rx: number, ry: number, phase = 0) {
  return (
    Array.from({ length: 81 }, (_, index) => {
      const a = (index / 80) * Math.PI * 2
      const ripple = 1 + Math.sin(a * 3 + phase) * 0.12 + Math.cos(a * 5 - phase) * 0.055
      const x = 486 + Math.cos(a) * rx * ripple
      const y = 426 + Math.sin(a) * ry * ripple
      return (index === 0 ? 'M' : 'L') + x.toFixed(2) + ' ' + y.toFixed(2)
    }).join(' ') + 'Z'
  )
}

const BLOCKS = Array.from({ length: 66 }, (_, i) => {
  const row = Math.floor(i / 11)
  const column = i % 11
  return {
    x: 191 + column * 43 + row * 22,
    y: 368 + row * 25 - column * 8,
    h: 9 + ((i * 17) % 31),
    w: 10 + (i % 7),
  }
}).filter(({ x, y }) => Math.hypot((x - 487) / 1.4, y - 423) > 49)

function Building({ x, y, h, w }: (typeof BLOCKS)[number]) {
  const d = w * 0.55
  return (
    <g>
      <path
        d={'M' + x + ' ' + y + 'l' + w + ' ' + d + 'v' + -h + 'l' + -w + ' ' + -d + 'Z'}
        fill="#292823"
        stroke="#62513e"
        strokeWidth=".55"
      />
      <path
        d={'M' + (x + w) + ' ' + (y + d) + 'l' + w + ' ' + -d + 'v' + -h + 'l' + -w + ' ' + d + 'Z'}
        fill="#1a201f"
        stroke="#62513e"
        strokeWidth=".55"
      />
      <path
        d={'M' + x + ' ' + (y - h) + 'l' + w + ' ' + -d + ' ' + w + ' ' + d + ' ' + -w + ' ' + d + 'Z'}
        fill="#554333"
        stroke="#9e794e"
        strokeWidth=".6"
      />
    </g>
  )
}

function Region({ x, y, scale = 1, id }: { x: number; y: number; scale?: number; id: string }) {
  return (
    <g transform={'translate(' + x + ' ' + y + ') scale(' + scale + ')'}>
      <path
        d="M-81 9-56-23-13-32 20-18 61-25 89 2 71 29 25 39-9 26-53 32Z"
        fill={'url(#' + id + '-zone)'}
        stroke="#d67a3b"
        strokeWidth=".8"
      />
      {[1, 0.76, 0.53, 0.31].map((size, i) => (
        <path
          key={size}
          d="M-81 9C-83-15-54-25-20-22S24-37 57-20 97 9 65 23 26 36 1 28-65 40-81 9Z"
          transform={'translate(0 ' + -i * 5 + ') scale(' + size + ')'}
          fill="none"
          stroke={i > 1 ? '#f4ba68' : '#bb6239'}
          strokeWidth="1.1"
          opacity={0.9 - i * 0.12}
        />
      ))}
      <circle r="3" cy="-9" fill="#f2b84b" />
      <path d="M0-12V-39" stroke="#d5a174" strokeWidth=".8" />
      <path d="M-4-41H4M0-45V-37" stroke="#e9c59c" strokeWidth="1.2" />
    </g>
  )
}

const SCALE_PRESETS = [
  {
    role: 'citizen' as const,
    scale: 1.34,
    x: 18,
    y: -4,
    rotate: -3,
  },
  {
    role: 'officer' as const,
    scale: 1.08,
    x: 4,
    y: 12,
    rotate: 0,
  },
  {
    role: 'authority' as const,
    scale: 0.88,
    x: -12,
    y: -8,
    rotate: 3.5,
  },
]

export function ThermalScene({
  role,
  mode = 'explore',
  paused = false,
}: {
  role: EntryRole
  mode?: 'explore' | 'access'
  paused?: boolean
}) {
  const id = 'thermal-' + useId().replace(/:/g, '')
  const host = useRef<HTMLDivElement>(null)
  const [inactive, setInactive] = useState(false)

  // Derive role index directly from the role prop (single source of truth)
  const roleIndex = Math.max(0, ENTRY_ROLES.findIndex((r) => r.id === role))
  const roleIndexRef = useRef(roleIndex)
  roleIndexRef.current = roleIndex

  // Real-time camera transformation state for interactive zoom and pan
  const cameraRef = useRef({
    scale: 1.08,
    x: 4,
    y: 12,
    rotate: 0,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
  })

  // Apply default camera variables smoothly when role changes
  useEffect(() => {
    const element = host.current
    if (!element) return
    const preset = SCALE_PRESETS[roleIndex] || SCALE_PRESETS[1]
    cameraRef.current.scale = preset.scale
    cameraRef.current.x = preset.x
    cameraRef.current.y = preset.y
    cameraRef.current.rotate = preset.rotate

    element.style.setProperty('--cam-transition', 'transform 650ms cubic-bezier(.16, 1, 0.3, 1)')
    element.style.setProperty('--cam-scale', String(preset.scale))
    element.style.setProperty('--cam-x', `${preset.x}px`)
    element.style.setProperty('--cam-y', `${preset.y}px`)
    element.style.setProperty('--cam-rotate', `${preset.rotate}deg`)
  }, [roleIndex])

  // Mouse wheel scroll-to-zoom controller:
  // Strictly capped at preset.scale (Image 2) so the 3D model NEVER covers the text or page
  useEffect(() => {
    const element = host.current
    if (!element) return

    const handleWheel = (event: WheelEvent) => {
      const preset = SCALE_PRESETS[roleIndexRef.current] || SCALE_PRESETS[1]
      // HARD CAP: The maximum zoom is STRICTLY capped at the preset scale (Image 2)
      const maxScale = preset.scale
      const minScale = Number((preset.scale * 0.62).toFixed(3))

      const currentScale = cameraRef.current.scale
      const isZoomingIn = event.deltaY < 0
      const isZoomingOut = event.deltaY > 0

      // If user tries to zoom in but is already at maximum scale (Image 2):
      // Hard-stop! Do not grow, do not block page scroll
      if (isZoomingIn && currentScale >= maxScale - 0.001) {
        return
      }

      // If user zooms out to minimum overview scale, allow page to continue scrolling naturally
      if (isZoomingOut && currentScale <= minScale + 0.001) {
        return
      }

      // Inside the bounded zoom range: smooth, controlled scaling
      event.preventDefault()
      const zoomMultiplier = Math.exp(-event.deltaY * 0.0016)
      const newScale = Math.min(Math.max(currentScale * zoomMultiplier, minScale), maxScale)
      cameraRef.current.scale = newScale

      element.style.setProperty('--cam-transition', 'transform 40ms ease-out')
      element.style.setProperty('--cam-scale', String(newScale.toFixed(4)))
    }

    element.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      element.removeEventListener('wheel', handleWheel)
    }
  }, [])

  // Pointer interactions: clamped pan and ambient parallax
  useEffect(() => {
    const element = host.current
    if (!element) return
    let visible = true
    let frame = 0
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const precise = window.matchMedia('(hover: hover) and (pointer: fine)')

    const reset = () => {
      cancelAnimationFrame(frame)
      element.style.setProperty('--pointer-x', '0px')
      element.style.setProperty('--pointer-y', '0px')
    }

    const sync = () => {
      setInactive(!visible || document.hidden || reduced.matches)
      if (!visible || document.hidden || reduced.matches || !precise.matches || paused) reset()
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
        sync()
      },
      { threshold: 0.05 }
    )
    observer.observe(element)

    // Gentle hover parallax
    const onHoverParallax = (event: PointerEvent) => {
      if (paused || reduced.matches || !precise.matches || !visible || document.hidden) return
      const bounds = element.getBoundingClientRect()
      const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 14
      const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 10
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        element.style.setProperty('--pointer-x', x.toFixed(2) + 'px')
        element.style.setProperty('--pointer-y', y.toFixed(2) + 'px')
      })
    }

    // Interactive Drag: strictly clamped to prevent drifting over text
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 && event.pointerType === 'mouse') return
      cameraRef.current.isDragging = true
      cameraRef.current.dragStartX = event.clientX
      cameraRef.current.dragStartY = event.clientY
      try {
        element.setPointerCapture(event.pointerId)
      } catch {}
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!cameraRef.current.isDragging) {
        onHoverParallax(event)
        return
      }

      const preset = SCALE_PRESETS[roleIndexRef.current] || SCALE_PRESETS[1]
      const dx = event.clientX - cameraRef.current.dragStartX
      const dy = event.clientY - cameraRef.current.dragStartY
      cameraRef.current.dragStartX = event.clientX
      cameraRef.current.dragStartY = event.clientY

      // Clamped to ±25px so the model never drifts over the text on the left
      const nextX = Math.max(preset.x - 25, Math.min(preset.x + 25, cameraRef.current.x + dx * 0.4))
      const nextY = Math.max(preset.y - 25, Math.min(preset.y + 25, cameraRef.current.y + dy * 0.4))
      cameraRef.current.x = nextX
      cameraRef.current.y = nextY

      element.style.setProperty('--cam-transition', 'transform 20ms linear')
      element.style.setProperty('--cam-x', `${nextX.toFixed(1)}px`)
      element.style.setProperty('--cam-y', `${nextY.toFixed(1)}px`)
    }

    const onPointerUp = (event: PointerEvent) => {
      if (cameraRef.current.isDragging) {
        cameraRef.current.isDragging = false
        try {
          element.releasePointerCapture(event.pointerId)
        } catch {}
      }
    }

    // Touch pinch-to-zoom (clamped to maxScale / Image 2)
    let touchDistance = 0
    let touchStartScale = 1

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        touchDistance = Math.hypot(
          event.touches[0].clientX - event.touches[1].clientX,
          event.touches[0].clientY - event.touches[1].clientY
        )
        touchStartScale = cameraRef.current.scale
      }
    }

    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 2 && touchDistance > 0) {
        const preset = SCALE_PRESETS[roleIndexRef.current] || SCALE_PRESETS[1]
        const maxScale = preset.scale
        const minScale = Number((preset.scale * 0.62).toFixed(3))

        const currentDist = Math.hypot(
          event.touches[0].clientX - event.touches[1].clientX,
          event.touches[0].clientY - event.touches[1].clientY
        )
        const ratio = currentDist / touchDistance
        const newScale = Math.min(Math.max(touchStartScale * ratio, minScale), maxScale)
        cameraRef.current.scale = newScale
        element.style.setProperty('--cam-transition', 'transform 30ms ease-out')
        element.style.setProperty('--cam-scale', String(newScale.toFixed(4)))
        event.preventDefault()
      }
    }

    // Double-click to reset camera perspective back to default framing (Image 2)
    const onDblClick = () => {
      const preset = SCALE_PRESETS[roleIndexRef.current] || SCALE_PRESETS[1]
      cameraRef.current.scale = preset.scale
      cameraRef.current.x = preset.x
      cameraRef.current.y = preset.y
      cameraRef.current.rotate = preset.rotate

      element.style.setProperty('--cam-transition', 'transform 550ms cubic-bezier(.16, 1, 0.3, 1)')
      element.style.setProperty('--cam-scale', String(preset.scale))
      element.style.setProperty('--cam-x', `${preset.x}px`)
      element.style.setProperty('--cam-y', `${preset.y}px`)
      element.style.setProperty('--cam-rotate', `${preset.rotate}deg`)
    }

    element.addEventListener('pointerdown', onPointerDown)
    element.addEventListener('pointermove', onPointerMove)
    element.addEventListener('pointerup', onPointerUp)
    element.addEventListener('pointercancel', onPointerUp)
    element.addEventListener('touchstart', onTouchStart, { passive: true })
    element.addEventListener('touchmove', onTouchMove, { passive: false })
    element.addEventListener('dblclick', onDblClick)
    document.addEventListener('visibilitychange', sync)
    reduced.addEventListener('change', sync)
    precise.addEventListener('change', sync)
    sync()

    return () => {
      observer.disconnect()
      reset()
      element.removeEventListener('pointerdown', onPointerDown)
      element.removeEventListener('pointermove', onPointerMove)
      element.removeEventListener('pointerup', onPointerUp)
      element.removeEventListener('pointercancel', onPointerUp)
      element.removeEventListener('touchstart', onTouchStart)
      element.removeEventListener('touchmove', onTouchMove)
      element.removeEventListener('dblclick', onDblClick)
      document.removeEventListener('visibilitychange', sync)
      reduced.removeEventListener('change', sync)
      precise.removeEventListener('change', sync)
    }
  }, [paused])

  return (
    <div
      ref={host}
      className={styles.scene}
      data-role={role}
      data-mode={mode}
      data-paused={paused || inactive}
      data-testid="thermal-scene"
      aria-label="Interactive 3D thermal scene"
    >
      <div className={styles.atmosphere} />

      <svg viewBox="0 0 1000 740" className={styles.drawing} focusable="false">
        <defs>
          <linearGradient id={id + '-ground'} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#232c2b" />
            <stop offset=".6" stopColor="#171d1d" />
            <stop offset="1" stopColor="#101819" />
          </linearGradient>
          <linearGradient id={id + '-edge'} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#4c3930" />
            <stop offset="1" stopColor="#101619" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={id + '-heat'} x1=".1" y1=".1" x2=".8" y2="1">
            <stop stopColor="#f2b84b" stopOpacity=".06" />
            <stop offset=".42" stopColor="#f28c28" stopOpacity=".22" />
            <stop offset=".8" stopColor="#d84232" stopOpacity=".38" />
            <stop offset="1" stopColor="#b92f2f" stopOpacity=".1" />
          </linearGradient>
          <radialGradient id={id + '-zone'}>
            <stop stopColor="#f28c28" stopOpacity=".42" />
            <stop offset=".55" stopColor="#d84232" stopOpacity=".18" />
            <stop offset="1" stopColor="#b92f2f" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={id + '-body'} x1=".2" y1="0" x2=".65" y2="1">
            <stop stopColor="#ffe0a1" />
            <stop offset=".23" stopColor="#f2b84b" />
            <stop offset=".49" stopColor="#f05a32" />
            <stop offset=".69" stopColor="#ce3e2d" />
            <stop offset="1" stopColor="#f2a84b" stopOpacity=".6" />
          </linearGradient>
          <linearGradient id={id + '-plume'} x1="0" y1="1" x2=".1" y2="0">
            <stop stopColor="#d84232" stopOpacity=".42" />
            <stop offset=".65" stopColor="#f28c28" stopOpacity=".12" />
            <stop offset="1" stopColor="#f2b84b" stopOpacity="0" />
          </linearGradient>
          <pattern
            id={id + '-grid'}
            width="54"
            height="30"
            patternUnits="userSpaceOnUse"
            patternTransform="matrix(1 .26 -.8 .5 0 205)"
          >
            <path d="M54 0H0V30" fill="none" stroke="#72857d" strokeOpacity=".22" strokeWidth="1" />
          </pattern>
          <clipPath id={id + '-land'}>
            <path d={TERRAIN} />
          </clipPath>
          <clipPath id={id + '-human'}>
            <path d="M-10-158C-15-153-17-141-18-129L-31-85Q-33-78-28-76Q-23-74-20-82L-9-114-10-74-19-14Q-20-6-13-5Q-7-5-6-13L2-62 8-13Q9-5 15-5Q22-6 20-14L13-75 12-114 24-82Q27-74 32-77Q37-79 34-87L21-133Q19-151 11-157Q0-161-10-158Z" />
          </clipPath>
        </defs>

        <g className={styles.camera}>
          <g className={styles.parallax}>
            {/* Ground Shadow & Terrain Platform */}
            <ellipse cx="498" cy="540" rx="342" ry="69" fill="#030708" opacity=".6" />
            <g className={styles.terrain}>
              {[24, 16, 8].map((depth) => (
                <path
                  key={depth}
                  d={TERRAIN}
                  transform={'translate(0 ' + depth + ')'}
                  fill={'url(#' + id + '-edge)'}
                  stroke="#69503b"
                  strokeOpacity={0.06 + (24 - depth) * 0.006}
                />
              ))}
              <path d={TERRAIN} fill={'url(#' + id + '-ground)'} stroke="#736049" strokeWidth="1" />
              <g clipPath={'url(#' + id + '-land)'}>
                <rect x="80" y="240" width="820" height="340" fill={'url(#' + id + '-grid)'} />
                <path
                  d="M84 395 244 375 354 421 490 395 628 436 790 396 916 427M273 256 328 349 416 387 403 453 490 563M623 259 603 348 681 392 636 451 706 549"
                  fill="none"
                  stroke="#c3a079"
                  strokeOpacity=".29"
                  strokeWidth="3"
                />
                <path
                  d="M89 421 262 414 360 468 451 452 600 491 815 456 901 471"
                  fill="none"
                  stroke="#7a9a91"
                  strokeOpacity=".25"
                  strokeWidth="5"
                />
                {/* 3D Urban Blocks */}
                <g className={styles.buildings}>
                  {BLOCKS.map((block, index) => (
                    <Building key={index} {...block} />
                  ))}
                </g>
              </g>

              {/* Thermal Core Dispersion */}
              <path d={contour(252, 107)} fill={'url(#' + id + '-zone)'} />
              <g className={styles.groundContours}>
                {[1, 0.85, 0.67, 0.5, 0.33].map((size, index) => (
                  <path
                    key={size}
                    d={contour(246 * size, 102 * size, index * 0.17)}
                    fill="none"
                    stroke={index > 2 ? '#edb064' : '#c96539'}
                    strokeWidth={index > 2 ? '1.3' : '.8'}
                    opacity={0.4 + index * 0.1}
                  />
                ))}
              </g>
            </g>

            {/* ======================================================== */}
            {/* MANDAL SCALE: Ward 42 Boundaries, Heat Islands & Operational Beacons */}
            {/* ======================================================== */}
            <g className={styles.regional}>
              {/* Ward 42 Jurisdiction Pulsing Boundary Ribbon */}
              <path
                d="M216 388 298 339 396 356 453 329 550 365 539 446 472 481 371 496 307 457 226 451Z"
                fill="rgba(226, 114, 42, 0.08)"
                stroke="#e5c799"
                strokeWidth="1.2"
                className={styles.wardBoundary}
              />
              <Region x={296} y={394} scale={0.72} id={id} />
              <Region x={629} y={366} scale={0.9} id={id} />
              <Region x={622} y={489} scale={0.64} id={id} />

              {/* Operational Response Beacons */}
              {/* 1. Cooling Centre Beacon */}
              <g transform="translate(396, 356)">
                <circle cx="0" cy="0" r="4" fill="#f2b84b" />
                <circle cx="0" cy="0" r="14" fill="none" stroke="#f2b84b" className={styles.radarBeacon} />
                <path d="M-6 0H6M0-6V6" stroke="#100C09" strokeWidth="1.5" />
              </g>

              {/* 2. Misting Cannon Staging Axis */}
              <g transform="translate(539, 446)">
                <circle cx="0" cy="0" r="3.5" fill="#4F7B4A" />
                <circle cx="0" cy="0" r="12" fill="none" stroke="#4F7B4A" className={styles.radarBeacon} />
              </g>
            </g>

            {/* Mandal Specific Technical Callouts */}
            <g className={styles.calloutsMandal} fontFamily="monospace" fontSize="8" fill="#e7c795">
              <g transform="translate(230, 335)">
                <rect x="-4" y="-12" width="168" height="16" fill="#100C09" fillOpacity=".88" stroke="#3F3122" rx="3" />
                <text x="4" y="-1" fill="#f2b84b" fontWeight="bold">WARD 42 · KUKATPALLY [RISK L5]</text>
              </g>
              <g transform="translate(406, 350)">
                <path d="M-6 0H-18L-32 -14H-90" stroke="#d5a174" strokeWidth=".8" fill="none" />
                <rect x="-172" y="-22" width="138" height="15" fill="#100C09" fillOpacity=".88" stroke="#3F3122" rx="3" />
                <text x="-166" y="-11" fill="#c4a986">COOLING SHELTER (1.4 km)</text>
              </g>
              <g transform="translate(545, 452)">
                <path d="M4 0H20L34 16H80" stroke="#d5a174" strokeWidth=".8" fill="none" />
                <rect x="80" y="8" width="132" height="15" fill="#100C09" fillOpacity=".88" stroke="#3F3122" rx="3" />
                <text x="86" y="19" fill="#4F7B4A">MISTING CANNON STAGED</text>
              </g>
            </g>

            {/* ======================================================== */}
            {/* DISTRICT SCALE: Regional Synoptic Heat Dome & Multi-Ward Corridors */}
            {/* ======================================================== */}
            <g className={styles.district}>
              <path
                d="M191 333 272 413 339 451 379 531M465 299 455 346 560 398 548 525M685 313 632 391 712 466 733 530"
                fill="none"
                stroke="#d2b58d"
                strokeOpacity=".55"
                strokeDasharray="4 6"
              />
              <path
                d="M214 429 390 475 630 371 785 415M390 475 623 493 785 415"
                fill="none"
                stroke="#91a69a"
                strokeOpacity=".6"
                strokeWidth="1.2"
              />
              <Region x={217} y={445} scale={0.53} id={id} />
              <Region x={789} y={410} scale={0.74} id={id} />
              <Region x={396} y={501} scale={0.5} id={id} />

              {/* District Hospital Hubs & Triangles */}
              {[[350, 366], [705, 462], [528, 315]].map(([x, y]) => (
                <g key={x} transform={'translate(' + x + ' ' + y + ')'} stroke="#cad1b9" fill="#192522">
                  <path d="M-7 0 0-4 7 0 0 4Z" />
                  <path d="M0-4V-28M-4-23H4M0-27V-19" />
                  <circle r="2.5" fill="#f2b84b" />
                </g>
              ))}

              {/* Synoptic Heatwave Advection Arrows (NW Wind Corridor) */}
              <g stroke="#DE7629" strokeWidth="1.5" fill="none" opacity=".75">
                <path d="M120 280 L220 340 M210 330 L220 340 L208 346" />
                <path d="M180 230 L300 310 M290 300 L300 310 L288 316" />
              </g>
            </g>

            {/* District Specific Technical Callouts */}
            <g className={styles.calloutsDistrict} fontFamily="monospace" fontSize="8" fill="#e7c795">
              <g transform="translate(130, 260)">
                <rect x="0" y="-12" width="180" height="15" fill="#100C09" fillOpacity=".88" stroke="#3F3122" rx="3" />
                <text x="6" y="-1" fill="#DE7629">NW DESERT HEAT ADVECTION</text>
              </g>
              <g transform="translate(680, 290)">
                <rect x="0" y="-12" width="170" height="15" fill="#100C09" fillOpacity=".88" stroke="#3F3122" rx="3" />
                <text x="6" y="-1" fill="#f2b84b">DISTRICT SYNOPTIC ISOTHERM 46°C</text>
              </g>
              <g transform="translate(640, 485)">
                <rect x="0" y="-12" width="175" height="15" fill="#100C09" fillOpacity=".88" stroke="#3F3122" rx="3" />
                <text x="6" y="-1" fill="#C4A986">DISTRICT GENERAL TRIAGE ROUTE</text>
              </g>
            </g>

            {/* Dynamic Plumes & Convective Layer */}
            <g className={styles.heatField}>
              <g className={styles.laminar}>
                {[0, 1, 2, 3, 4, 5, 6].map((layer) => (
                  <path
                    key={layer}
                    d={contour(210 - layer * 13, 86 - layer * 6, layer * 0.12)}
                    transform={'translate(' + layer * 2 + ' ' + (-layer * 17 - 12) + ')'}
                    fill={'url(#' + id + '-heat)'}
                    fillOpacity={0.48}
                    stroke={layer > 3 ? '#eaaa5e' : '#dc693b'}
                    strokeWidth=".8"
                    strokeOpacity={0.57 - layer * 0.035}
                  />
                ))}
              </g>
              <g className={styles.plume}>
                <path
                  d="M319 430C291 373 350 341 332 283S356 225 375 203C334 280 390 302 365 356S385 409 373 441Z"
                  fill={'url(#' + id + '-plume)'}
                />
                <path
                  d="M570 435C536 381 588 357 564 297S591 230 599 202C600 277 630 294 607 350S631 410 614 440Z"
                  fill={'url(#' + id + '-plume)'}
                />
                <path
                  d="M363 431C359 391 384 368 373 337M599 426C584 398 610 359 598 327"
                  fill="none"
                  stroke="#e7b66c"
                  strokeWidth="1.4"
                  strokeOpacity=".4"
                />
              </g>
            </g>

            {/* ======================================================== */}
            {/* CITIZEN SCALE: Detailed Biometeorological Human Model */}
            {/* ======================================================== */}
            <g className={styles.human}>
              <g transform="translate(487 442)">
                {/* Surface Reflection & Conduction Ring */}
                <ellipse cy="-1" rx="36" ry="11" fill={'url(#' + id + '-zone)'} />
                <ellipse cy="-1" rx="30" ry="9" fill="none" stroke="#e3a251" strokeWidth=".9" />
                <ellipse cy="-1" rx="46" ry="14" fill="none" stroke="#d96e36" strokeWidth=".6" opacity=".6" />

                {/* Micro-sweat convective vapor currents */}
                <g className={styles.sweatPlume}>
                  <path d="M-8 -170 C -12 -190, 4 -205, -2 -225" stroke="#ffe0a1" strokeWidth=".9" fill="none" opacity=".6" />
                  <path d="M8 -165 C 16 -185, 2 -200, 10 -220" stroke="#f2b84b" strokeWidth=".9" fill="none" opacity=".6" />
                </g>

                {/* Cranial Head Thermal Zone */}
                <ellipse
                  cx="1"
                  cy="-181"
                  rx="13"
                  ry="17"
                  fill={'url(#' + id + '-body)'}
                  stroke="#f7c477"
                  strokeWidth=".9"
                />

                {/* Torso & Limbs Silhouette */}
                <path
                  d="M-10-158C-15-153-17-141-18-129L-31-85Q-33-78-28-76Q-23-74-20-82L-9-114-10-74-19-14Q-20-6-13-5Q-7-5-6-13L2-62 8-13Q9-5 15-5Q22-6 20-14L13-75 12-114 24-82Q27-74 32-77Q37-79 34-87L21-133Q19-151 11-157Q0-161-10-158Z"
                  fill={'url(#' + id + '-body)'}
                  fillOpacity=".94"
                  stroke="#ffc98a"
                  strokeWidth=".9"
                />

                {/* Anatomical Heat Flux Rings */}
                <g clipPath={'url(#' + id + '-human)'} fill="none" stroke="#ffd398" strokeOpacity=".46" strokeWidth=".8">
                  {Array.from({ length: 14 }, (_, i) => (
                    <ellipse key={i} cx="2" cy={-135 + i * 5} rx={9 + i * 3} ry={7 + i * 6} />
                  ))}
                  <path d="M2-160V-58M-13-133 2-122 16-133M-10-83 2-90 13-83" />
                </g>

                {/* Micro-telemetry leader lines */}
                {/* 1. Core Temp */}
                <path d="M26-148H85L108-166H175" stroke="#d9b780" strokeWidth=".8" fill="none" opacity=".85" />
                <circle cx="26" cy="-148" r="2.5" fill="#f2b84b" />
                <text x="112" y="-171" fill="#f2b84b" fontSize="8" letterSpacing="1.2" fontFamily="monospace" fontWeight="bold">
                  CORE TEMP: 38.6°C [HEAT STRAIN]
                </text>

                {/* 2. Sweat Evaporation Limit */}
                <path d="M-22-105H-75L-98-125H-175" stroke="#d9b780" strokeWidth=".8" fill="none" opacity=".85" />
                <circle cx="-22" cy="-105" r="2.5" fill="#DE7629" />
                <text x="-215" y="-130" fill="#e7c795" fontSize="8" letterSpacing="1.2" fontFamily="monospace">
                  EVAPORATIVE LIMIT: 82% RH
                </text>

                {/* 3. Surface Conduction */}
                <path d="M36-2H85L102 14H165" stroke="#d9b780" strokeWidth=".8" fill="none" opacity=".85" />
                <circle cx="36" cy="-2" r="2.5" fill="#C03B2B" />
                <text x="106" y="24" fill="#C03B2B" fontSize="8" letterSpacing="1.2" fontFamily="monospace">
                  SURFACE CONDUCTION: 54.2°C
                </text>
              </g>
            </g>

            {/* Rising Thermal Aerosol Particles */}
            <g className={styles.particles} fill="#edb577">
              {Array.from({ length: 24 }, (_, i) => (
                <circle
                  key={i}
                  className={styles.particle}
                  cx={287 + ((i * 71) % 420)}
                  cy={222 + ((i * 43) % 215)}
                  r={i % 3 === 0 ? 1.7 : 1}
                  style={
                    {
                      '--delay': -i * 0.7 + 's',
                      '--duration': 5 + (i % 5) + 's',
                    } as CSSProperties
                  }
                />
              ))}
            </g>

            {/* Optical Measurement Axes */}
            <g className={styles.measurements} fill="none" stroke="#b6a085" strokeWidth=".65" opacity=".5">
              <path d="M140 523 320 587 650 602M145 518 135 528M315 582 325 592M645 597 655 607" />
              <path d="M836 313V265H716M830 313H842M716 259V271" />
            </g>
          </g>
        </g>
      </svg>
    </div>
  )
}
