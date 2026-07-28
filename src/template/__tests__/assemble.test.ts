import { describe, expect, it } from 'vitest'
import templateBaseRaw from '../../assets/templates/template_base.html?raw'
import { defaultEmailDocument } from '../../registry'
import { assembleEmailHtml } from '../assemble'
import { renderFooterSnippet } from '../../components/footer/render'

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

  it('writes the selected theme into the tema_general_mail_general assign', () => {
    const html = assembleEmailHtml({
      ...defaultEmailDocument,
      global: { ...defaultEmailDocument.global, tema: 'problack' },
    })
    expect(html).toContain("{% assign tema_general_mail_general = 'problack' %}")
    // Y el footer se estiliza según ese tema, sin campo propio.
    expect(html).toContain("{% assign font_style_look = 'pro' %}")
  })

  it('replaces the theme assign exactly once', () => {
    const html = assembleEmailHtml(defaultEmailDocument)
    const matches = html.match(/\{%\s*assign\s+tema_general_mail_general\s*=/g) ?? []
    expect(matches).toHaveLength(1)
  })

  it('touches nothing besides the theme assign and the FOOTER marker', () => {
    const doc = { ...defaultEmailDocument, global: { ...defaultEmailDocument.global, tema: 'problack' } }

    // El assign actual se lee del maestro en vez de hardcodearlo, para no
    // romperse si David cambia el tema por defecto del archivo.
    const currentAssign = /\{% assign tema_general_mail_general = '[^']*' %\}/.exec(templateBaseRaw)?.[0]
    expect(currentAssign).toBeDefined()

    const expected = templateBaseRaw
      .replace(currentAssign as string, "{% assign tema_general_mail_general = 'problack' %}")
      .replace('<!-- FOOTER -->', renderFooterSnippet(doc.footer, 'problack'))

    expect(assembleEmailHtml(doc)).toBe(expected)
  })
})
