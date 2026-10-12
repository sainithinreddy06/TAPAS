import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DeathsDisplay, DeathsInline } from '@/components/risk/DeathsDisplay'

describe('DeathsDisplay', () => {
  it('shows the estimate with the supplied uncertainty and source metadata', () => {
    render(<DeathsDisplay value={6} low={4} high={9} source="Supplied model report" intervalLabel="90% confidence interval" when="on 7 Sep" />)
    expect(screen.getByText('6')).toBeInTheDocument()
    expect(screen.getByText(/modelled extra deaths on 7 Sep/)).toBeInTheDocument()
    expect(screen.getByText(/Reported range 4–9 \(90% confidence interval\)/)).toBeInTheDocument()
    expect(screen.getByText(/Source: Supplied model report/)).toBeInTheDocument()
  })
  it('widens display rounding outward without modifying the actual interval', () => {
    render(<DeathsDisplay value={6.4} low={4.7} high={8.2} />)
    expect(screen.getByText('6')).toBeInTheDocument()
    expect(screen.getByText(/range 4–9/)).toBeInTheDocument()
  })
  it('retains a wide upper bound when the central estimate is below one', () => {
    render(<DeathsDisplay value={0.1} low={0} high={9} level={5} />)
    expect(screen.getByText('<1')).toBeInTheDocument()
    expect(screen.getByText(/range 0–9/)).toBeInTheDocument()
    expect(screen.queryByText(/Low risk|mortality not expected/)).not.toBeInTheDocument()
  })
  it('does not invent a source or confidence level', () => {
    render(<DeathsDisplay value={1} low={0} high={3} />)
    expect(screen.getByText(/confidence level not supplied/)).toBeInTheDocument()
    expect(screen.getByText('Estimate source not supplied')).toBeInTheDocument()
    expect(screen.queryByText(/de Bont|90% CI/)).not.toBeInTheDocument()
  })
  it('marks an inverted or out-of-range interval invalid', () => {
    const { rerender } = render(<DeathsDisplay value={6} low={9} high={4} />)
    expect(screen.getByText('Uncertainty range unavailable or invalid')).toBeInTheDocument()
    expect(screen.queryByText(/range 6–6/)).not.toBeInTheDocument()
    rerender(<DeathsDisplay value={6} low={7} high={9} />)
    expect(screen.getByText('Uncertainty range unavailable or invalid')).toBeInTheDocument()
  })
  it.each([null, undefined, NaN, Infinity, -1])('keeps invalid or missing estimate %s unavailable', (value) => {
    render(<DeathsDisplay value={value} low={0} high={9} />)
    expect(screen.getByText('Mortality estimate unavailable')).toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })
  it('keeps the upper bound in the inline variant', () => {
    render(<DeathsInline value={0.1} low={0} high={9} />)
    expect(screen.getByText(/<1 modelled extra \(0–9\)/)).toBeInTheDocument()
  })
  it('reports a supplied zero with its range without inferring low risk', () => {
    render(<DeathsDisplay value={0} low={0} high={2} />)
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText(/range 0–2/)).toBeInTheDocument()
    expect(screen.queryByText(/no excess|Low risk/)).not.toBeInTheDocument()
  })
})
