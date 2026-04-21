import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { FundsInput } from './FundsInput'

describe('FundsInput', () => {
  it('renders label and input', () => {
    render(<FundsInput value={1000} onChange={() => {}} />)
    expect(screen.getByText('Available Funds ($)')).toBeInTheDocument()
    expect(screen.getByRole('spinbutton')).toBeInTheDocument()
  })

  it('displays the current value', () => {
    render(<FundsInput value={2500} onChange={() => {}} />)
    expect(screen.getByRole('spinbutton')).toHaveValue(2500)
  })

  it('calls onChange with numeric value when user types', async () => {
    const onChange = vi.fn()
    render(<FundsInput value={0} onChange={onChange} />)
    const input = screen.getByRole('spinbutton') as HTMLInputElement

    // Simulate user typing by setting value and firing change event
    fireEvent.change(input, { target: { value: '500' } })

    expect(onChange).toHaveBeenLastCalledWith(500)
  })

  it('has min of 1 to prevent zero or negative funds', () => {
    render(<FundsInput value={1000} onChange={() => {}} />)
    expect(screen.getByRole('spinbutton')).toHaveAttribute('min', '1')
  })
})
