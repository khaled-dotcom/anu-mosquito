import { describe, expect, it } from 'vitest'
import { formatCountdown, minutesUntil, nextOpenBatch } from './batches'

const now = new Date('2026-10-09T10:00:00Z').getTime()
const at = (minutes) => new Date(now + minutes * 60000).toISOString()

describe('nextOpenBatch', () => {
  const batches = [
    { id: 'closed', registration_end: at(-5), delivery_time: at(30), is_active: true },
    { id: 'later', registration_start: at(60), registration_end: at(120), delivery_time: at(180), is_active: true },
    { id: 'soon', registration_start: at(-60), registration_end: at(20), delivery_time: at(60), is_active: true },
    { id: 'off', registration_end: at(20), delivery_time: at(40), is_active: false },
  ]

  it('skips closed and inactive batches and picks the earliest delivery', () => {
    expect(nextOpenBatch(batches, now).id).toBe('soon')
  })

  it('returns a batch that opens later when nothing is open now', () => {
    expect(nextOpenBatch(batches.filter((b) => b.id !== 'soon'), now).id).toBe('later')
  })

  it('returns null when there is nothing to order for', () => {
    expect(nextOpenBatch([batches[0]], now)).toBeNull()
    expect(nextOpenBatch(undefined, now)).toBeNull()
  })
})

describe('countdown', () => {
  it('counts whole minutes', () => {
    expect(minutesUntil(at(45), now)).toBe(45)
    expect(minutesUntil(at(-3), now)).toBe(-3)
    expect(minutesUntil('not a date', now)).toBe(0)
  })

  it('formats minutes for people', () => {
    expect(formatCountdown(45)).toBe('45 min')
    expect(formatCountdown(60)).toBe('1 h')
    expect(formatCountdown(135)).toBe('2 h 15 min')
    expect(formatCountdown(0)).toBe('less than a minute')
  })
})
