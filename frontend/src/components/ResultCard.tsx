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
      <div>
        <p>No profitable trade exists in the selected time range.</p>
      </div>
    )
  }

  return (
    <div>
      <table>
        <tbody>
          <tr><td>Buy at</td><td>{formatDateTime(result.buy_at!)}</td></tr>
          <tr><td>Sell at</td><td>{formatDateTime(result.sell_at!)}</td></tr>
          <tr><td>Buy price</td><td>${result.buy_price!.toFixed(2)}</td></tr>
          <tr><td>Sell price</td><td>${result.sell_price!.toFixed(2)}</td></tr>
          <tr><td>Shares bought</td><td>{result.shares}</td></tr>
          <tr><td>Total cost</td><td>${result.total_cost.toFixed(2)}</td></tr>
          <tr><td>Profit</td><td>+${result.profit.toFixed(2)}</td></tr>
        </tbody>
      </table>
    </div>
  )
}
