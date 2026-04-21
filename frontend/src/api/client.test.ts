import { vi, describe, it, expect, beforeEach } from 'vitest'
import { fetchBestTrade } from './client'

describe('fetchBestTrade', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('calls the correct URL with query params', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        profitable: true,
        buy_at: '2026-01-02T09:00:00',
        sell_at: '2026-01-02T10:00:00',
        buy_price: 100.0,
        sell_price: 150.0,
        shares: 10,
        total_cost: 1000.0,
        profit: 500.0,
      }),
    })
    vi.stubGlobal('fetch', mockFetch)

    await fetchBestTrade({ from: '2026-01-02T09:00', to: '2026-01-02T17:00', funds: 1000 })

    expect(mockFetch).toHaveBeenCalledOnce()
    const url = mockFetch.mock.calls[0][0] as string
    expect(url).toContain('/api/best-trade')
    expect(url).toContain('from=2026-01-02T09%3A00')
    expect(url).toContain('to=2026-01-02T17%3A00')
    expect(url).toContain('funds=1000')
  })

  it('returns parsed JSON on success', async () => {
    const payload = {
      profitable: true,
      buy_at: '2026-01-02T09:00:00',
      sell_at: '2026-01-02T10:00:00',
      buy_price: 100.0,
      sell_price: 150.0,
      shares: 10,
      total_cost: 1000.0,
      profit: 500.0,
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => payload }))

    const result = await fetchBestTrade({ from: '2026-01-02T09:00', to: '2026-01-02T17:00', funds: 1000 })
    expect(result.profitable).toBe(true)
    expect(result.profit).toBe(500.0)
  })

  it('throws an error on non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ detail: 'from must be before to' }),
      }),
    )

    await expect(
      fetchBestTrade({ from: '2026-01-02T17:00', to: '2026-01-02T09:00', funds: 1000 }),
    ).rejects.toThrow('from must be before to')
  })
})
