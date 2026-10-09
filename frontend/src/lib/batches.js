// Delivery batch helpers for the student home page.

function toTime(value) {
  if (value == null) return NaN
  if (typeof value === 'number') return value
  return new Date(value).getTime()
}

/** Whole minutes from `from` (default now) until `to`; negative when in the past. */
export function minutesUntil(to, from = Date.now()) {
  const end = toTime(to)
  const start = toTime(from)
  if (!Number.isFinite(end) || !Number.isFinite(start)) return 0
  return Math.ceil((end - start) / 60000)
}

/**
 * The batch a student should order for: still taking orders (or opening later),
 * earliest delivery first. Batches whose ordering window has closed are skipped.
 */
export function nextOpenBatch(batches, now = Date.now()) {
  const open = (batches || [])
    .filter((batch) => batch && batch.is_active !== false)
    .filter((batch) => {
      const closes = toTime(batch.registration_end)
      return Number.isFinite(closes) ? closes > now : toTime(batch.delivery_time) > now
    })
    .sort((a, b) => toTime(a.delivery_time) - toTime(b.delivery_time))

  return open[0] || null
}

export function formatClock(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

/** 45 → "45 min", 135 → "2 h 15 min", 0 → "less than a minute". */
export function formatCountdown(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return 'less than a minute'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}
