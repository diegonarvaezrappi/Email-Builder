import { describe, expect, it } from 'vitest'
import { FOOTER_FIRMA_LABELS, FOOTER_FIRMA_VALUES, defaultFooterFields, footerSchema } from '../schema'

describe('FOOTER_FIRMA_VALUES', () => {
  it('is exactly the 3 values footer_general.html/footer_sinamor.html branch on, using the literal the master documents (footer.html, commit 42ff0b2: "sinfirma", no space)', () => {
    expect(FOOTER_FIRMA_VALUES).toEqual(['sinfirma', 'general', 'turbo'])
  })

  it('labels match the brand names (Rappi/Turbo), not the raw Liquid tokens', () => {
    expect(FOOTER_FIRMA_LABELS).toEqual({
      sinfirma: 'Sin firma',
      general: 'Rappi',
      turbo: 'Turbo',
    })
  })
})

describe('footerSchema.firma', () => {
  it('defaults to "sinfirma"', () => {
    expect(defaultFooterFields.firma).toBe('sinfirma')
  })

  it('accepts "general" and "turbo"', () => {
    expect(footerSchema.parse({ firma: 'general' }).firma).toBe('general')
    expect(footerSchema.parse({ firma: 'turbo' }).firma).toBe('turbo')
  })

  it('falls back to "sinfirma" for the pre-2026-09-09 value ("sin firma", with a space) instead of failing the whole parse', () => {
    // Este campo shippeó el 2026-09-07 (commit 5b5e866) con 'sin firma' (CON
    // espacio) como valor real — se cambió a 'sinfirma' el 2026-09-09 al
    // alinear con el literal que el maestro documentó en 42ff0b2. Un
    // documento ya guardado en localStorage con el valor viejo no debe hacer
    // que safeParse (persistence.ts) descarte el documento ENTERO.
    expect(footerSchema.parse({ firma: 'sin firma' }).firma).toBe('sinfirma')
  })

  it('falls back to "sinfirma" for garbage input instead of throwing', () => {
    expect(footerSchema.parse({ firma: 'rappi-pide-carulla' }).firma).toBe('sinfirma')
    expect(footerSchema.parse({ firma: 123 }).firma).toBe('sinfirma')
    expect(footerSchema.parse({ firma: null }).firma).toBe('sinfirma')
  })
})
