import { describe, it, expect } from 'vitest'
import { formatForApi } from './format'

describe('formatForApi', () => {
  it('formats a date as YYYY-MM-DDTHH:MM', () => {
    const date = new Date(2026, 0, 5, 9, 30, 0)
    expect(formatForApi(date)).toBe('2026-01-05T09:30')
  })

  it('pads month, day, hour, and minute with leading zeros', () => {
    const date = new Date(2026, 0, 1, 9, 0, 0)
    expect(formatForApi(date)).toBe('2026-01-01T09:00')
  })

  it('does not include seconds', () => {
    const date = new Date(2026, 0, 5, 10, 23, 45)
    expect(formatForApi(date)).toBe('2026-01-05T10:23')
  })

  it('handles dataset close time', () => {
    const date = new Date(2026, 3, 30, 17, 0, 0)
    expect(formatForApi(date)).toBe('2026-04-30T17:00')
  })
})
