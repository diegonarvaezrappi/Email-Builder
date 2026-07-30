import { describe, expect, it } from 'vitest'
import { CIERRE_VARIANT_INFO, CIERRE_VARIANT_VALUES, defaultCierreFields } from '../schema'
import { renderCierreSnippet } from '../render'
import { defaultEmailDocument } from '../../../registry'

const doc = (overrides: Partial<typeof defaultEmailDocument> = {}) => ({ ...defaultEmailDocument, ...overrides })

describe('renderCierreSnippet', () => {
  it('renders the default variant image for a normal theme and non-RTS footer', () => {
    const html = renderCierreSnippet(defaultCierreFields, doc())
    expect(html).toContain(CIERRE_VARIANT_INFO['rappi-pide'].url)
    expect(html).toContain('alt="RappiFirma"')
  })

  for (const variant of CIERRE_VARIANT_VALUES) {
    it(`resolves the "${variant}" variant to its own URL`, () => {
      const html = renderCierreSnippet({ ...defaultCierreFields, variant }, doc())
      expect(html).toContain(CIERRE_VARIANT_INFO[variant].url)
    })
  }

  it('never leaves the placeholder URL from cierre.html in the output', () => {
    const html = renderCierreSnippet(defaultCierreFields, doc())
    expect(html).not.toContain('1Szsf0kwqfJhdeu9hA944XWUGc85DFLZ5')
  })

  it('does not leak the pedagogical comment from 05_closing/cierre.html', () => {
    const html = renderCierreSnippet(defaultCierreFields, doc())
    expect(html).not.toContain('<!--')
    expect(html).not.toContain('Pide img')
  })

  it('returns empty when removed manually, regardless of variant', () => {
    const html = renderCierreSnippet({ ...defaultCierreFields, removed: true, variant: 'turbo-pide' }, doc())
    expect(html).toBe('')
  })

  it('returns empty for the Pro theme, even when not removed', () => {
    const html = renderCierreSnippet(defaultCierreFields, doc({ global: { ...defaultEmailDocument.global, tema: 'pro' } }))
    expect(html).toBe('')
  })

  it('returns empty for the ProBlack theme', () => {
    const html = renderCierreSnippet(
      defaultCierreFields,
      doc({ global: { ...defaultEmailDocument.global, tema: 'problack' } }),
    )
    expect(html).toBe('')
  })

  it('returns empty when Footer is RTS, regardless of the theme', () => {
    const html = renderCierreSnippet(defaultCierreFields, doc({ footer: { ...defaultEmailDocument.footer, tipoFooter: 'RTS' } }))
    expect(html).toBe('')
  })

  it('is visible again for a normal theme once Footer stops being RTS', () => {
    const html = renderCierreSnippet(
      defaultCierreFields,
      doc({ footer: { ...defaultEmailDocument.footer, tipoFooter: 'General' } }),
    )
    expect(html).not.toBe('')
  })
})
