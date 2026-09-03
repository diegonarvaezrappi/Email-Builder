import { describe, expect, it } from 'vitest'
import { CTA_SIZE_LABELS, CTA_SIZE_VALUES, ctaFieldsSchema, defaultCtaFields } from '../schema'

describe('CTA_SIZE_VALUES', () => {
  it('offers Big Cta first, then Small Cta (order + labels requested 2026-09-03)', () => {
    expect(CTA_SIZE_VALUES).toEqual(['big', 'small'])
    expect(CTA_SIZE_LABELS).toEqual({ big: 'Big Cta', small: 'Small Cta' })
  })
})

describe('ctaFieldsSchema.size', () => {
  it('defaults to "big" — reproduces the only size that existed before cta_size existed', () => {
    expect(defaultCtaFields.size).toBe('big')
  })

  it('accepts "small"', () => {
    expect(ctaFieldsSchema.parse({ size: 'small' }).size).toBe('small')
  })

  it('rejects a value outside big/small', () => {
    expect(() => ctaFieldsSchema.parse({ size: 'medium' })).toThrow()
  })
})
