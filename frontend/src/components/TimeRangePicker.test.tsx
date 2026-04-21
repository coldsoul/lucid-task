import { render, screen } from '@testing-library/react'
import { TimeRangePicker } from './TimeRangePicker'

describe('TimeRangePicker', () => {
  it('renders From and To labels', () => {
    render(
      <TimeRangePicker fromDate={null} toDate={null} onChange={() => {}} />
    )
    expect(screen.getByText('From')).toBeInTheDocument()
    expect(screen.getByText('To')).toBeInTheDocument()
  })

  it('renders two date inputs', () => {
    render(
      <TimeRangePicker fromDate={null} toDate={null} onChange={() => {}} />
    )
    // react-datepicker renders <input> elements
    const inputs = screen.getAllByRole('textbox')
    expect(inputs).toHaveLength(2)
  })

  it('displays formatted fromDate value', () => {
    const from = new Date('2026-01-05T09:30:00')
    render(
      <TimeRangePicker fromDate={from} toDate={null} onChange={() => {}} />
    )
    const inputs = screen.getAllByRole('textbox')
    expect(inputs[0]).toHaveValue('2026-01-05 09:30')
  })
})
