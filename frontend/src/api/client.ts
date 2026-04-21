export interface TradeRequest {
  from: string   // YYYY-MM-DDTHH:MM
  to: string
  funds: number
}

export interface TradeResult {
  profitable: boolean
  buy_at: string | null
  sell_at: string | null
  buy_price: number | null
  sell_price: number | null
  shares: number
  total_cost: number
  profit: number
}

export async function fetchBestTrade(params: TradeRequest): Promise<TradeResult> {
  const url = new URL('/api/best-trade', window.location.origin)
  url.searchParams.set('from', params.from)
  url.searchParams.set('to', params.to)
  url.searchParams.set('funds', String(params.funds))

  const response = await fetch(url.toString())
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.detail ?? 'Request failed')
  }
  return data as TradeResult
}
