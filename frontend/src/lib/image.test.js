import { describe, expect, it, vi } from 'vitest'

vi.mock('../supabase', () => ({ supabase: {} }))

const { fitWithin, formatBytes, IMAGE_PRESETS, qualitySteps, validateImageFile } = await import('./image')

describe('image compression helpers', () => {
  it('shrinks large photos to fit, keeping the shape', () => {
    expect(fitWithin(4000, 3000, 1000)).toEqual({ width: 1000, height: 750 })
    expect(fitWithin(3000, 4000, 1000)).toEqual({ width: 750, height: 1000 })
  })

  it('never enlarges small photos', () => {
    expect(fitWithin(640, 480, 1000)).toEqual({ width: 640, height: 480 })
  })

  it('handles missing sizes', () => {
    expect(fitWithin(0, 0, 1000)).toEqual({ width: 0, height: 0 })
  })

  it('tries quality from best to smallest', () => {
    const steps = qualitySteps()
    expect(steps[0]).toBeGreaterThan(steps.at(-1))
    expect([...steps].sort((a, b) => b - a)).toEqual(steps)
  })

  it('keeps stored images small', () => {
    for (const preset of Object.values(IMAGE_PRESETS)) {
      expect(preset.targetBytes).toBeLessThanOrEqual(400 * 1024)
      expect(preset.maxSide).toBeLessThanOrEqual(1600)
    }
  })

  it('formats file sizes', () => {
    expect(formatBytes(900)).toBe('900 B')
    expect(formatBytes(2048)).toBe('2 KB')
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB')
  })

  it('rejects non-images and huge files', () => {
    expect(validateImageFile(null)).toMatch(/Choose/)
    expect(validateImageFile({ type: 'application/pdf', size: 10 })).toMatch(/photo/)
    expect(validateImageFile({ type: 'image/jpeg', size: 20 * 1024 * 1024 })).toMatch(/15 MB/)
    expect(validateImageFile({ type: 'image/jpeg', size: 2 * 1024 * 1024 })).toBe('')
  })
})
