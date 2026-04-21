import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

const DATASET_START = new Date('2026-01-01T09:00:00')
const DATASET_END = new Date('2026-04-30T17:00:00')
const TRADING_OPEN = new Date(0, 0, 0, 9, 0)
const TRADING_CLOSE = new Date(0, 0, 0, 17, 0)

interface Props {
  fromDate: Date | null
  toDate: Date | null
  onChange: (from: Date | null, to: Date | null) => void
}

export function TimeRangePicker({ fromDate, toDate, onChange }: Props) {
  return (
    <div style={{ display: 'flex', gap: '16px' }}>
      <div>
        <label>From</label>
        <DatePicker
          selected={fromDate}
          onChange={(date) => onChange(date, toDate)}
          showTimeSelect
          timeIntervals={1}
          dateFormat="yyyy-MM-dd HH:mm"
          minDate={DATASET_START}
          maxDate={DATASET_END}
          minTime={TRADING_OPEN}
          maxTime={TRADING_CLOSE}
          placeholderText="Select date and time"
        />
      </div>
      <div>
        <label>To</label>
        <DatePicker
          selected={toDate}
          onChange={(date) => onChange(fromDate, date)}
          showTimeSelect
          timeIntervals={1}
          dateFormat="yyyy-MM-dd HH:mm"
          minDate={fromDate ?? DATASET_START}
          maxDate={DATASET_END}
          minTime={TRADING_OPEN}
          maxTime={TRADING_CLOSE}
          placeholderText="Select date and time"
        />
      </div>
    </div>
  )
}
