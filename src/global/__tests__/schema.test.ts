import { describe, expect, it } from 'vitest'
import { CTA_STYLE_SELECT_LABELS, CTA_STYLE_SELECT_VALUES, globalSchema } from '../schema'

describe('CTA_STYLE_SELECT_VALUES', () => {
  it('is restricted to Default + the 4 colors the user asked to keep, in that exact order (2026-09-03)', () => {
    expect(CTA_STYLE_SELECT_VALUES).toEqual(['default', 'neon', 'blanco', 'negrogris', 'verde'])
  })

  it('labels match the exact text requested', () => {
    expect(CTA_STYLE_SELECT_LABELS).toEqual({
      default: 'Default',
      neon: 'Neon',
      blanco: 'Blanco',
      negrogris: 'Negro Gris',
      verde: 'Verde',
    })
  })
})

describe('globalSchema.ctaStyle', () => {
  it('defaults to "default" when the field is missing entirely', () => {
    expect(globalSchema.parse({}).ctaStyle).toBe('default')
  })

  it('accepts every value still offered by the select, unchanged', () => {
    for (const style of CTA_STYLE_SELECT_VALUES) {
      expect(globalSchema.parse({ ctaStyle: style }).ctaStyle).toBe(style)
    }
  })

  it('falls back to "default" for a value the select used to offer but no longer does (stale saved document), instead of failing the whole parse', () => {
    // Antes del 2026-09-03 el select ofrecía 15 estilos reales (pro, gris100,
    // blanconeon, etc.) — un documento guardado en localStorage con uno de
    // esos valores no debe hacer que safeParse() descarte el documento
    // ENTERO (ver persistence.ts) solo porque este campo puntual se redujo.
    expect(globalSchema.parse({ ctaStyle: 'pro' }).ctaStyle).toBe('default')
    expect(globalSchema.parse({ ctaStyle: 'gris100' }).ctaStyle).toBe('default')
    expect(globalSchema.parse({ ctaStyle: 'blanconeon' }).ctaStyle).toBe('default')
  })

  it('falls back to "default" for garbage input instead of throwing', () => {
    expect(globalSchema.parse({ ctaStyle: 'no-existe' }).ctaStyle).toBe('default')
    expect(globalSchema.parse({ ctaStyle: 123 }).ctaStyle).toBe('default')
    expect(globalSchema.parse({ ctaStyle: null }).ctaStyle).toBe('default')
  })
})

// Los 3 oscuros/invertidos salieron del selector el 2026-09-29.
describe('globalSchema · tema', () => {
  it('moves a saved/imported doc on a dark/inverted theme to the default theme instead of discarding it', () => {
    for (const tema of ['darkneon', 'darkturbo', 'darkneutro']) {
      const parsed = globalSchema.safeParse({ tema })
      expect(parsed.success).toBe(true)
      expect(parsed.success && parsed.data.tema).toBe('beige100')
    }
  })

  it('keeps any selectable theme as is', () => {
    expect(globalSchema.parse({ tema: 'pro' }).tema).toBe('pro')
    expect(globalSchema.parse({ tema: 'verde100' }).tema).toBe('verde100')
  })

  it('still rejects a theme that does not exist at all', () => {
    expect(globalSchema.safeParse({ tema: 'tema-inventado' }).success).toBe(false)
  })
})

describe('globalSchema · contentsBgColor', () => {
  it('defaults to no color', () => {
    expect(globalSchema.parse({}).contentsBgColor).toBe('')
  })

  it('keeps a valid #RRGGBB (normalized to upper case)', () => {
    expect(globalSchema.parse({ contentsBgColor: '#ff0dd1' }).contentsBgColor).toBe('#FF0DD1')
  })

  it('drops an invalid saved value instead of rejecting the document', () => {
    for (const bad of ['#FFF', 'rojo', 'rgba(0,0,0,0.5)', 123]) {
      const parsed = globalSchema.safeParse({ contentsBgColor: bad })
      expect(parsed.success).toBe(true)
      expect(parsed.success && parsed.data.contentsBgColor).toBe('')
    }
  })
})
