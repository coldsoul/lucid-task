import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import App from './App'
import * as client from './api/client'

// Replace react-datepicker with a simple input so we can drive date state
// without fighting the library's calendar DOM.
vi.mock('./components/TimeRangePicker', () => ({
  TimeRangePicker: ({ fromDate, toDate, onChange }: any) => (
    <>
      <input
        data-testid="from-input"
        readOnly
        value={fromDate?.toISOString() ?? ''}
        onClick={() => onChange(new Date('2026-01-05T09:00:00'), toDate)}
      />
      <input
        data-testid="to-input"
        readOnly
        value={toDate?.toISOString() ?? ''}
        onClick={() => onChange(fromDate, new Date('2026-01-05T17:00:00'))}
      />
    </>
  ),
}))

describe('App', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the page heading', () => {
    render(<App />)
    expect(screen.getByText(/Stock Advisor/i)).toBeInTheDocument()
  })

  it('button is disabled when dates are not set', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /Find Best Trade/i })).toBeDisabled()
  })

  it('button is enabled after both dates are selected', async () => {
    render(<App />)
    await userEvent.click(screen.getByTestId('from-input'))
    await userEvent.click(screen.getByTestId('to-input'))
    expect(screen.getByRole('button', { name: /Find Best Trade/i })).toBeEnabled()
  })

  it('displays trade result after successful API response', async () => {
    vi.spyOn(client, 'fetchBestTrade').mockResolvedValue({
      profitable: true,
      buy_at: '2026-01-05T09:00:00',
      sell_at: '2026-01-05T10:00:00',
      buy_price: 100.0,
      sell_price: 150.0,
      shares: 10,
      total_cost: 1000.0,
      profit: 500.0,
    })

    render(<App />)
    await userEvent.click(screen.getByTestId('from-input'))
    await userEvent.click(screen.getByTestId('to-input'))
    await userEvent.click(screen.getByRole('button', { name: /Find Best Trade/i }))

    await waitFor(() => {
      expect(screen.getAllByText(/2026-01-05/).length).toBeGreaterThan(0)
    })
  })

  it('displays error message when API call fails', async () => {
    vi.spyOn(client, 'fetchBestTrade').mockRejectedValue(new Error('`from` must be before `to`'))

    render(<App />)
    await userEvent.click(screen.getByTestId('from-input'))
    await userEvent.click(screen.getByTestId('to-input'))
    await userEvent.click(screen.getByRole('button', { name: /Find Best Trade/i }))

    await waitFor(() => {
      expect(screen.getByText(/`from` must be before `to`/i)).toBeInTheDocument()
    })
  })
})
