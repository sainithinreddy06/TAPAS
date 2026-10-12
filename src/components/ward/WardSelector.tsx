'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface WardOption {
  ward_id: string
  ward_name: string
  risk_level?: number | null
}

interface WardSelectorProps {
  wards: WardOption[]
  selectedWardId: string | null
  onSelectWard: (wardId: string | null) => void
  label?: string
  className?: string
}

export function WardSelector({
  wards,
  selectedWardId,
  onSelectWard,
  label = 'Covered ward',
  className,
}: WardSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 2b: Never render an empty dropdown. If no wards have coverage, remove control entirely.
  if (!wards || wards.length === 0) {
    return (
      <div className={cn('rounded-xl border border-[var(--line-soft)] bg-[var(--surface-1)] p-5 text-left', className)}>
        <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--ink-low)] mb-2">
          WARD-LEVEL COVERAGE
        </div>
        <p className="text-sm font-medium text-[var(--ink-mid)] mb-2">
          No ward boundary data is loaded for this area.
        </p>
        <p className="text-xs text-[var(--ink-low)] leading-relaxed mb-3">
          TAPAS is showing weather-model heat data for this location instead.
          Ward-level risk requires municipal boundary datasets, which are
          onboarded per city.
        </p>
        <div className="text-xs text-[var(--ink-low)] border-t border-[var(--line-hair)] pt-2.5">
          Covered so far: Hyderabad (GHMC) — 5 wards
        </div>
      </div>
    )
  }

  const selectedWard = wards.find((w) => w.ward_id === selectedWardId)
  const buttonText = selectedWard
    ? selectedWard.ward_name
    : `Select ward (${wards.length} available)`

  return (
    <div className={cn('relative max-w-full text-left', className)} ref={containerRef}>
      {label ? (
        <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--ink-low)] mb-1.5">
          {label}
        </label>
      ) : null}

      {/* Trigger on --surface-2, line-soft border, radius 10px */}
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex h-11 w-full min-w-[240px] items-center justify-between rounded-lg border border-[var(--line-soft)] bg-[var(--surface-2)] px-3.5 text-xs text-[var(--ink-high)] transition-all outline-none',
          isOpen ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]' : 'hover:border-[var(--line-firm)]'
        )}
      >
        <span className="truncate font-medium">{buttonText}</span>
        <ChevronDown
          className={cn(
            'ml-2 h-4 w-4 text-[var(--ink-low)] transition-transform duration-200',
            isOpen && 'rotate-180 text-[var(--accent)]'
          )}
        />
      </button>

      {/* Custom Menu on --surface-3, zero OS-blue */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-50 mt-1.5 max-h-60 w-full min-w-[260px] overflow-auto rounded-lg border border-[var(--line-soft)] bg-[var(--surface-3)] p-1 shadow-2xl backdrop-blur-md"
        >
          {/* Option to clear / all */}
          <button
            type="button"
            role="option"
            aria-selected={!selectedWardId}
            onClick={() => {
              onSelectWard(null)
              setIsOpen(false)
            }}
            className={cn(
              'group relative flex w-full items-center justify-between rounded-md py-2.5 pl-3.5 pr-2.5 text-xs transition-colors',
              !selectedWardId
                ? 'bg-[var(--surface-2)] text-[var(--ink-high)] font-semibold'
                : 'text-[var(--ink-mid)] hover:bg-[var(--surface-2)] hover:text-[var(--ink-high)]'
            )}
          >
            {/* 2px accent bar on hover/selected */}
            <span
              className={cn(
                'absolute left-0 top-1 bottom-1 w-[2px] rounded-r transition-opacity',
                !selectedWardId ? 'bg-[var(--accent)] opacity-100' : 'bg-[var(--accent)] opacity-0 group-hover:opacity-100'
              )}
            />
            <span className="truncate">All wards overview ({wards.length} total)</span>
            {!selectedWardId && <Check className="h-3.5 w-3.5 text-[var(--accent)] shrink-0" />}
          </button>

          {wards.map((ward) => {
            const isSelected = ward.ward_id === selectedWardId
            return (
              <button
                key={ward.ward_id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onSelectWard(ward.ward_id)
                  setIsOpen(false)
                }}
                className={cn(
                  'group relative flex w-full items-center justify-between rounded-md py-2.5 pl-3.5 pr-2.5 text-xs transition-colors',
                  isSelected
                    ? 'bg-[var(--surface-2)] text-[var(--ink-high)] font-semibold'
                    : 'text-[var(--ink-mid)] hover:bg-[var(--surface-2)] hover:text-[var(--ink-high)]'
                )}
              >
                {/* 2px accent bar on hover/selected */}
                <span
                  className={cn(
                    'absolute left-0 top-1 bottom-1 w-[2px] rounded-r transition-opacity',
                    isSelected ? 'bg-[var(--accent)] opacity-100' : 'bg-[var(--accent)] opacity-0 group-hover:opacity-100'
                  )}
                />
                <span className="truncate">
                  {ward.ward_name}
                  {ward.risk_level ? ` · Level ${ward.risk_level}` : ''}
                </span>
                {isSelected && <Check className="h-3.5 w-3.5 text-[var(--accent)] shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
