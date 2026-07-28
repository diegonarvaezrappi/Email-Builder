import { describe, expect, it } from 'vitest'
import templateBaseRaw from '../../assets/templates/template_base.html?raw'
import { defaultEmailDocument } from '../../registry'
import { assembleEmailHtml } from '../assemble'
import { renderFooterSnippet } from '../../components/footer/render'

describe('assembleEmailHtml', () => {
  it('replaces the FOOTER marker exactly once with the rendered footer snippet', () => {
    const html = assembleEmailHtml(defaultEmailDocument)
    const expectedSnippet = renderFooterSnippet(defaultEmailDocument.footer)

    expect(html).not.toContain('<!-- FOOTER -->')
    expect(html.includes(expectedSnippet)).toBe(true)
  })

  it('leaves the other slot markers (not yet implemented) untouched', () => {
    const html = assembleEmailHtml(defaultEmailDocument)
    for (const marker of ['<!-- BANNER -->', '<!-- CONTENIDOS -->', '<!-- CIERRE -->']) {
      expect(html).toContain(marker)
    }
  })

  it('does not change anything outside the FOOTER marker', () => {
    const html = assembleEmailHtml(defaultEmailDocument)
    const [beforeFooter] = templateBaseRaw.split('<!-- FOOTER -->')
    expect(html.startsWith(beforeFooter)).toBe(true)
  })
})
