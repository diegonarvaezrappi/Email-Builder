import { describe, expect, it } from 'vitest'
import templateBaseRaw from '../../assets/templates/template_base.html?raw'
import { defaultEmailDocument } from '../../registry'
import { assembleEmailHtml } from '../assemble'
import { renderFooterSnippet } from '../../components/footer/render'
import { inlineTheme } from '../../themes/inlineTheme'

describe('assembleEmailHtml', () => {
  it('replaces the FOOTER marker exactly once with the rendered footer snippet', () => {
    const html = assembleEmailHtml(defaultEmailDocument)
    const expectedSnippet = renderFooterSnippet(defaultEmailDocument.footer, defaultEmailDocument.global.tema)

    expect(html).not.toContain('<!-- FOOTER -->')
    expect(html.includes(expectedSnippet)).toBe(true)
  })

  it('leaves the other slot markers (not yet implemented) untouched', () => {
    const html = assembleEmailHtml(defaultEmailDocument)
    for (const marker of ['<!-- BANNER -->', '<!-- CONTENIDOS -->', '<!-- CIERRE -->']) {
      expect(html).toContain(marker)
    }
  })

  it('bakes the selected theme in, leaving no theme Liquid in the output', () => {
    const html = assembleEmailHtml({
      ...defaultEmailDocument,
      global: { ...defaultEmailDocument.global, tema: 'problack' },
    })
    // ProBlack: bg_solid #ECEFF3 y footer 'pro'.
    expect(html).toContain('#ECEFF3')
    expect(html).toContain("{% assign font_style_look = 'pro' %}")
    // Ni el assign de entrada, ni las 11 ramas, ni referencias sin resolver.
    expect(html).not.toContain('tema_general_mail_general')
    expect(html).not.toMatch(/\{\{\s*[a-z_0-9]+_mail_general\s*\}\}/)
  })

  it('produces different colours for different themes', () => {
    const withTheme = (tema: string) =>
      assembleEmailHtml({ ...defaultEmailDocument, global: { ...defaultEmailDocument.global, tema } })
    expect(withTheme('beige100')).toContain('#FFF0DD')
    expect(withTheme('verde100')).toContain('#C0FDD3')
    expect(withTheme('beige100')).not.toContain('#C0FDD3')
  })

  it('keeps the Braze Liquid that must reach the platform', () => {
    const html = assembleEmailHtml(defaultEmailDocument)
    expect(html).toContain('{{content_blocks.${FOOTER_q1_2024_legales}}}')
    expect(html).toContain("{% assign cond = '' %}")
  })

  it('touches nothing besides the theme and the FOOTER marker', () => {
    const doc = { ...defaultEmailDocument, global: { ...defaultEmailDocument.global, tema: 'problack' } }
    const expected = inlineTheme(templateBaseRaw, 'problack').replace(
      '<!-- FOOTER -->',
      renderFooterSnippet(doc.footer, 'problack'),
    )
    expect(assembleEmailHtml(doc)).toBe(expected)
  })
})
