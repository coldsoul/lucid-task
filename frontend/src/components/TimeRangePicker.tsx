import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

const DATASET_START = new Date('2026-01-01T09:00:00')
const DATASET_END = new Date('2026-04-30T17:00:00')
const TRADING_OPEN = new Date(0, 0, 0, 9, 0)
const TRADING_CLOSE = new Date(0, 0, 0, 17, 0)

const isWeekday = (date: Date) => {
  const day = date.getDay()
  return day !== 0 && day !== 6
}

interface Props {
  fromDate: Date | null
  toDate: Date | null
  onChange: (from: Date | null, to: Date | null) => void
}

export function TimeRangePicker({ fromDate, toDate, onChange }: Props) {
  return (
    <>
      <div className="field-group">
        <label className="field-label">From</label>
        <DatePicker
          selected={fromDate}
          onChange={(date: Date | null) => onChange(date, toDate)}
          showTimeSelect
          timeIntervals={1}
          dateFormat="yyyy-MM-dd HH:mm"
          minDate={DATASET_START}
          maxDate={DATASET_END}
          minTime={TRADING_OPEN}
          maxTime={TRADING_CLOSE}
          filterDate={isWeekday}
          placeholderText="Select date and time"
        />
      </div>
      <div className="field-group">
        <label className="field-label">To</label>
        <DatePicker
          selected={toDate}
          onChange={(date: Date | null) => onChange(fromDate, date)}
          showTimeSelect
          timeIntervals={1}
          dateFormat="yyyy-MM-dd HH:mm"
          minDate={fromDate ?? DATASET_START}
          maxDate={DATASET_END}
          minTime={TRADING_OPEN}
          maxTime={TRADING_CLOSE}
          filterDate={isWeekday}
          placeholderText="Select date and time"
        />
      </div>
      <p className="field-hint">Weekdays only · 09:00 – 17:00</p>
    </>
  )
}
