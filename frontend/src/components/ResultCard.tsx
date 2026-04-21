import type { TradeResult } from '../api/client'

interface Props {
  result: TradeResult | null
}

function formatDateTime(iso: string): string {
  return iso.replace('T', ' ').substring(0, 16)
}

export function ResultCard({ result }: Props) {
  if (result === null) return null

  if (!result.profitable) {
    return (
      <div className="result-section">
        <div className="result-header">
          <span className="result-title">Result</span>
        </div>
        <p className="result-no-trade">No profitable trade exists in the selected time range.</p>
      </div>
    )
  }

  return (
    <div className="result-section">
      <div className="result-header">
        <span className="result-title">Result</span>
        <span className="profit-chip">+${result.profit.toFixed(2)} profit</span>
      </div>
      <div className="result-row"><span className="result-key">Buy at</span><span className="result-val">{formatDateTime(result.buy_at!)}</span></div>
      <div className="result-row"><span className="result-key">Sell at</span><span className="result-val">{formatDateTime(result.sell_at!)}</span></div>
      <div className="result-row"><span className="result-key">Buy price</span><span className="result-val">${result.buy_price!.toFixed(2)}</span></div>
      <div className="result-row"><span className="result-key">Sell price</span><span className="result-val">${result.sell_price!.toFixed(2)}</span></div>
      <div className="result-row"><span className="result-key">Shares bought</span><span className="result-val">{result.shares}</span></div>
      <div className="result-row"><span className="result-key">Total cost</span><span className="result-val">${result.total_cost.toFixed(2)}</span></div>
      <div className="result-row"><span className="result-key">Profit</span><span className="result-val profit">+${result.profit.toFixed(2)}</span></div>
    </div>
  )
}
