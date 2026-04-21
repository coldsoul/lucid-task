import { useState } from 'react'
import { TimeRangePicker } from './components/TimeRangePicker'
import { FundsInput } from './components/FundsInput'
import { ResultCard } from './components/ResultCard'
import { fetchBestTrade } from './api/client'
import type { TradeResult } from './api/client'
import { formatForApi } from './utils/format'
import './App.css'

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
    <div className="app">
      <header className="app-header">
        <p className="app-eyebrow">Stock Advisor</p>
        <h1>Find your best trade</h1>
        <p>Enter a time window and available funds to find the optimal buy/sell pair.</p>
      </header>

      <div className="card">
        <div className="form-row">
          <TimeRangePicker
            fromDate={fromDate}
            toDate={toDate}
            onChange={(from, to) => { setFromDate(from); setToDate(to) }}
          />
          <FundsInput value={funds} onChange={setFunds} />
        </div>
        <button className="btn" onClick={handleSubmit} disabled={!canSubmit || loading}>
          {loading ? 'Finding best trade…' : 'Find Best Trade'}
        </button>
        {error && <div className="error-msg">{error}</div>}
        <ResultCard result={result} />
      </div>
    </div>
  )
}
