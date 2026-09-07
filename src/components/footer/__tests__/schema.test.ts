import { describe, expect, it } from 'vitest'
import { FOOTER_FIRMA_LABELS, FOOTER_FIRMA_VALUES, defaultFooterFields, footerSchema } from '../schema'

describe('FOOTER_FIRMA_VALUES', () => {
  it('is exactly the 3 values footer_general.html/footer_sinamor.html branch on', () => {
    expect(FOOTER_FIRMA_VALUES).toEqual(['sin firma', 'general', 'turbo'])
  })

  it('labels match the brand names (Rappi/Turbo), not the raw Liquid tokens', () => {
    expect(FOOTER_FIRMA_LABELS).toEqual({
      'sin firma': 'Sin firma',
      general: 'Rappi',
      turbo: 'Turbo',
    })
  })
})

describe('footerSchema.firma', () => {
  it('defaults to "sin firma"', () => {
    expect(defaultFooterFields.firma).toBe('sin firma')
  })

  it('accepts "general" and "turbo"', () => {
    expect(footerSchema.parse({ firma: 'general' }).firma).toBe('general')
    expect(footerSchema.parse({ firma: 'turbo' }).firma).toBe('turbo')
  })

  it('rejects a value outside the 3 real ones', () => {
    expect(() => footerSchema.parse({ firma: 'rappi-pide-carulla' })).toThrow()
  })
})
