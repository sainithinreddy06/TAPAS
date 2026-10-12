import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { RiskBadge } from '@/components/risk/RiskBadge'
import { RISK_COLORS, RISK_LABELS, RISK_TEXT_COLORS } from '@/lib/constants'
import type { RiskLevel } from '@/lib/types'

describe('RiskBadge', () => {
  it('does not classify missing risk as low', () => {
    render(<RiskBadge level={null} />)
    expect(screen.getByTestId('risk-badge')).toHaveTextContent('Risk unavailable')
    expect(screen.getByTestId('risk-badge')).toHaveAttribute('data-level', 'unknown')
    expect(screen.getByTestId('risk-badge')).not.toHaveStyle({ backgroundColor: RISK_COLORS[1] })
  })
  it('renders level 1 in the low-risk green', () => {
    render(<RiskBadge level={1} />)

    const badge = screen.getByTestId('risk-badge')
    expect(badge).toHaveTextContent('Level 1 — Low')
    expect(badge).toHaveStyle({ backgroundColor: RISK_COLORS[1] })
  })

  it('renders level 5 in the extreme dark red', () => {
    render(<RiskBadge level={5} />)

    const badge = screen.getByTestId('risk-badge')
    expect(badge).toHaveTextContent('Level 5 — Extreme')
    expect(badge).toHaveStyle({ backgroundColor: RISK_COLORS[5] })
  })

  it.each([1, 2, 3, 4, 5] as RiskLevel[])(
    'pairs the colour with the level number and label at level %i',
    (level) => {
      render(<RiskBadge level={level} />)

      const badge = screen.getByTestId('risk-badge')
      // Colour is never the only carrier of meaning.
      expect(badge).toHaveTextContent(`Level ${level} — ${RISK_LABELS[level]}`)
      expect(badge).toHaveStyle({ backgroundColor: RISK_COLORS[level] })
      expect(badge).toHaveAttribute('data-level', String(level))
    },
  )

  it('uses dark text on the amber level-2 badge for contrast', () => {
    render(<RiskBadge level={2} />)

    expect(screen.getByTestId('risk-badge')).toHaveStyle({ color: RISK_TEXT_COLORS[2] })
  })

  it('drops the label but keeps the level in compact mode', () => {
    render(<RiskBadge level={4} compact />)

    const badge = screen.getByTestId('risk-badge')
    expect(badge).toHaveTextContent('Level 4')
    expect(badge).not.toHaveTextContent('Very High')
    // The full meaning stays available to assistive technology.
    expect(badge).toHaveAttribute('aria-label', 'Risk level 4, Very High')
  })
})
