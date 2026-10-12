'use client'

import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowDown, ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { useLocation } from '@/components/providers/LocationProvider'
import { ThermalScene } from './ThermalScene'
import { ReferenceWeather } from './ReferenceWeather'
import { ENTRY_ROLES } from './roles'
import styles from './Hero.module.css'

export function Hero() {
  const { selectionQuery } = useLocation()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const tabs = useRef<Array<HTMLButtonElement | null>>([])
  const gesture = useRef<{ x: number; y: number; id: number } | null>(null)
  const role = ENTRY_ROLES[index]

  const select = (next: number, focus = false) => {
    const clamped = Math.max(0, Math.min(ENTRY_ROLES.length - 1, next))
    setIndex(clamped)
    if (focus) tabs.current[clamped]?.focus()
  }
  const handleKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = event.key === 'ArrowRight' ? index + 1 : event.key === 'ArrowLeft' ? index - 1 : event.key === 'Home' ? 0 : event.key === 'End' ? ENTRY_ROLES.length - 1 : null
    if (next !== null) { event.preventDefault(); select(next, true) }
  }
  const startSwipe = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' || !event.isPrimary) return
    gesture.current = { x: event.clientX, y: event.clientY, id: event.pointerId }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const endSwipe = (event: PointerEvent<HTMLDivElement>) => {
    const start = gesture.current
    gesture.current = null
    if (!start || start.id !== event.pointerId) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) * 1.5) select(index + (dx < 0 ? 1 : -1))
  }

  return (
    <section className={styles.entry} aria-label="TAPAS entry experience" data-testid="thermal-entry" data-role={role.id}>
      <div className={styles.artWindow}>
        <div className={styles.sceneMount} data-testid="thermal-swipe-area" onPointerDown={startSwipe} onPointerUp={endSwipe} onPointerCancel={() => { gesture.current = null }}>
          <ThermalScene
            role={role.id}
            paused={paused}
          />
        </div>
      </div>
      <header className={styles.header}>
        <a href="#main" className={styles.brand} aria-label="TAPAS home">
          <Image
            src="/tapas-emblem.png"
            alt="TAPAS Emblem"
            width={38}
            height={38}
            className={styles.brandLogo}
            priority
          />
          <span>TAPAS<small>Thermal intelligence system</small></span>
        </a>
        <div className={styles.headerRight}>
          <span className={styles.systemLabel}>Extreme heat. Human impact.</span>
          <Link href={'/about?' + selectionQuery} className={styles.about}>About TAPAS <ArrowRight size={13} aria-hidden="true" /></Link>
        </div>
      </header>
      <div className={styles.body}>
        <div className={styles.introduction}>
          <p className={styles.eyebrow}><span className={styles.indicator} /> Heat intelligence, at every scale</p>
          <div className={styles.panels}>
            {ENTRY_ROLES.map((item, itemIndex) => {
              const active = itemIndex === index
              const href = item.href + (item.href.includes('?') ? '&' : '?') + selectionQuery
              return (
                <div key={item.id} id={'experience-' + item.id} role="tabpanel" aria-labelledby={'role-' + item.id} aria-hidden={!active} inert={!active} className={styles.panel} data-active={active}>
                  <p className={styles.scaleLabel}>0{itemIndex + 1} <span>/</span> {item.scaleLabel}</p>
                  <h1 className={styles.title}>{item.label}</h1>
                  <p className={styles.description}>{item.description}</p>
                  <ul className={styles.topics}>{item.topics.map((topic) => <li key={topic}>{topic}</li>)}</ul>
                  <Link href={href} prefetch={active} className={styles.enter}>{item.cta}<ArrowRight size={18} aria-hidden="true" /></Link>
                </div>
              )
            })}
          </div>
          <p className={styles.exploreNote}>Three perspectives. One connected heat picture.</p>
        </div>
        <div className={styles.fieldCaption} aria-hidden="true">
          <span className={styles.fieldCross}>+</span>
          <span>THERMAL EXPOSURE FIELD<small>Human · Local · Regional</small></span>
        </div>
        <div className={styles.sceneLegend}>
          <span className={styles.spectrum} aria-hidden="true" />
          <span>Illustrative thermal scene</span>
          <button type="button" className={styles.motionButton} aria-label={paused ? 'Resume motion' : 'Pause motion'} aria-pressed={paused} onClick={() => setPaused((value) => !value)}>
            {paused ? <Play size={12} aria-hidden="true" /> : <Pause size={12} aria-hidden="true" />}<span>{paused ? 'Resume motion' : 'Pause motion'}</span>
          </button>
        </div>
      </div>
      <footer className={styles.footer}>
        <div className={styles.navigation}>
          <div className={styles.navHeading}><span>Choose your perspective</span><span className={styles.count}>0{index + 1} / 03</span></div>
          <div className={styles.navRow}>
            <div role="tablist" aria-label="Choose your experience" onKeyDown={handleKeys} className={styles.tabs}>
              {ENTRY_ROLES.map((item, itemIndex) => (
                <button key={item.id} ref={(element) => { tabs.current[itemIndex] = element }} type="button" role="tab" id={'role-' + item.id} aria-controls={'experience-' + item.id} aria-selected={itemIndex === index} aria-label={item.label} tabIndex={itemIndex === index ? 0 : -1} onClick={() => select(itemIndex)} className={styles.tab}>
                  <span className={styles.tabNumber}>0{itemIndex + 1}</span><span>{item.shortLabel}</span>
                </button>
              ))}
            </div>
            <div className={styles.arrows}>
              <button type="button" aria-label="Previous experience" onClick={() => select(index - 1)} disabled={index === 0}><ChevronLeft size={18} aria-hidden="true" /></button>
              <button type="button" aria-label="Next experience" onClick={() => select(index + 1)} disabled={index === ENTRY_ROLES.length - 1}><ChevronRight size={18} aria-hidden="true" /></button>
            </div>
          </div>
          <span className={styles.swipeHint}>Swipe the scene to explore</span>
        </div>
        <div className={styles.weather}><ReferenceWeather /></div>
      </footer>
      <a href="#how-it-works-heading" className={styles.discover}>Discover how TAPAS works <ArrowDown size={12} aria-hidden="true" /></a>
      <span className={styles.screenReader} role="status" aria-live="polite" aria-atomic="true">{role.label + '. ' + role.description}</span>
    </section>
  )
}
