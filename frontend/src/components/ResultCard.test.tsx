import { render, screen } from '@testing-library/react'
import { ResultCard } from './ResultCard'
import type { TradeResult } from '../api/client'

const profitableResult: TradeResult = {
  profitable: true,
  buy_at: '2026-01-15T10:23:00',
  sell_at: '2026-01-17T14:05:00',
  buy_price: 142.37,
  sell_price: 158.92,
  shares: 7,
  total_cost: 996.59,
  profit: 115.85,
}

const noTradeResult: TradeResult = {
  profitable: false,
  buy_at: null,
  sell_at: null,
  buy_price: null,
  sell_price: null,
  shares: 0,
  total_cost: 0,
  profit: 0,
}

describe('ResultCard', () => {
  it('shows nothing when result is null', () => {
    const { container } = render(<ResultCard result={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('displays buy and sell datetimes for profitable trade', () => {
    render(<ResultCard result={profitableResult} />)
    expect(screen.getByText(/2026-01-15/)).toBeInTheDocument()
    expect(screen.getByText(/2026-01-17/)).toBeInTheDocument()
  })

  it('displays shares, cost, and profit', () => {
    render(<ResultCard result={profitableResult} />)
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText(/996\.59/)).toBeInTheDocument()
    expect(screen.getByText(/115\.85/)).toBeInTheDocument()
  })

  it('shows no-profit message when not profitable', () => {
    render(<ResultCard result={noTradeResult} />)
    expect(
      screen.getByText(/No profitable trade exists in the selected time range/i)
    ).toBeInTheDocument()
  })

  it('does not show financial fields when not profitable', () => {
    render(<ResultCard result={noTradeResult} />)
    expect(screen.queryByText(/Buy at/i)).not.toBeInTheDocument()
  })
})
