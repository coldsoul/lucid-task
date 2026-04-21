import { useState } from 'react'
import { TimeRangePicker } from './components/TimeRangePicker'
import { FundsInput } from './components/FundsInput'
import { ResultCard } from './components/ResultCard'
import { fetchBestTrade, TradeResult } from './api/client'
import { formatForApi } from './utils/format'

export default function App() {
  const [fromDate, setFromDate] = useState<Date | null>(null)
  const [toDate, setToDate] = useState<Date | null>(null)
  const [funds, setFunds] = useState<number>(1000)
  const [result, setResult] = useState<TradeResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const canSubmit = fromDate !== null && toDate !== null && funds > 0

  async function handleSubmit() {
    if (!fromDate || !toDate) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await fetchBestTrade({
        from: formatForApi(fromDate),
        to: formatForApi(toDate),
        funds,
      })
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 16px' }}>
      <h1>Stock Advisor</h1>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <TimeRangePicker
          fromDate={fromDate}
          toDate={toDate}
          onChange={(from, to) => { setFromDate(from); setToDate(to) }}
        />
        <FundsInput value={funds} onChange={setFunds} />
        <button onClick={handleSubmit} disabled={!canSubmit || loading}>
          {loading ? 'Loading…' : 'Find Best Trade'}
        </button>
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <ResultCard result={result} />
    </div>
  )
}
