import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { FundsInput } from './FundsInput'

function ControlledFundsInput({ onChange }: { onChange: (v: number) => void }) {
  const [value, setValue] = useState(0)
  return (
    <FundsInput
      value={value}
      onChange={(v) => {
        setValue(v)
        onChange(v)
      }}
    />
  )
}

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
    render(<ControlledFundsInput onChange={onChange} />)
    const input = screen.getByRole('spinbutton') as HTMLInputElement

    await userEvent.clear(input)
    await userEvent.type(input, '500')

    expect(onChange).toHaveBeenLastCalledWith(500)
  })

  it('has min of 1 to prevent zero or negative funds', () => {
    render(<FundsInput value={1000} onChange={() => {}} />)
    expect(screen.getByRole('spinbutton')).toHaveAttribute('min', '1')
  })
})
