import type { components, operations } from './types.gen'

export type TradeResult = components['schemas']['TradeResponse']
export type TradeRequest = operations['best_trade_api_best_trade_get']['parameters']['query']

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
