'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowUpRight, Pause, Play } from 'lucide-react'
import { ThermalScene } from '@/components/landing/ThermalScene'
import type { EntryRole } from '@/components/landing/roles'
import { useLocation } from '@/components/providers/LocationProvider'
import styles from './ThermalAccess.module.css'

export function ThermalAccess({ role, children }: { role: Exclude<EntryRole, 'citizen'>; children: ReactNode }) {
  const { selectionQuery } = useLocation()
  const [paused, setPaused] = useState(false)
  const isAuthority = role === 'authority'

  return (
    <div className={styles.access}>
      <section className={styles.scenePanel} aria-labelledby="access-scene-title">
        <Link href={`/?${selectionQuery}`} className={styles.brand} title="Return to home">
          <Image
            src="/tapas-emblem.png"
            alt="TAPAS Emblem"
            width={30}
            height={30}
            className={styles.brandLogo}
            priority
          />
          <span>TAPAS</span>
          <ArrowUpRight size={16} aria-hidden="true" />
        </Link>

        <div className={styles.sceneHeading}>
          <p className={styles.eyebrow}>{isAuthority ? 'DISTRICT AUTHORITY' : 'MANDAL OFFICER'} / RESPONSE ACCESS</p>
          <h1 id="access-scene-title">{isAuthority ? <>A wider view.<br /><span>A coordinated response.</span></> : <>Local intelligence.<br /><span>Action on the ground.</span></>}</h1>
          <p>{isAuthority ? 'Connect district-wide heat intelligence with the resources communities need.' : 'Bring ward-level heat intelligence into every field decision.'}</p>
        </div>

        <div className={styles.artwork}>
          <ThermalScene role={role} mode="access" paused={paused} />
        </div>

        <div className={styles.sceneFooter}>
          <p><span className={styles.legendLine} aria-hidden="true" /> Illustrative thermal scene</p>
          <button
            type="button"
            className={styles.motionControl}
            onClick={() => setPaused((value) => !value)}
            aria-label={paused ? 'Resume scene motion' : 'Pause scene motion'}
            aria-pressed={paused}
          >
            {paused ? <Play size={13} aria-hidden="true" /> : <Pause size={13} aria-hidden="true" />}
            <span>{paused ? 'Resume motion' : 'Pause motion'}</span>
          </button>
        </div>
      </section>
      {children}
    </div>
  )
}
