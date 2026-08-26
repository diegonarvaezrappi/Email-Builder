import { describe, expect, it } from 'vitest'
import { renderSeparadorLineaSnippet, renderSubtituloTextoSnippet, renderTituloTextoSnippet } from '../render'

const NO_LIQUID_TAG_RE = /\{%/

describe('renderTituloTextoSnippet', () => {
  it('substitutes the text into the <h2>', () => {
    const html = renderTituloTextoSnippet({ text: 'Mi título' })
    expect(html).toContain('<h2')
    expect(html).toContain('>Mi título<')
    expect(html).not.toContain('>Titulo<')
  })

  it('escapes HTML-significant characters', () => {
    const html = renderTituloTextoSnippet({ text: '<b>x</b>' })
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;')
    expect(html).not.toContain('<b>x</b>')
  })

  it('has no Liquid tags left; _mail_general and the module-align var survive for later passes', () => {
    const html = renderTituloTextoSnippet({ text: 'x' })
    expect(html).not.toMatch(NO_LIQUID_TAG_RE)
    expect(html).toContain('{{color_texto_mail_general}}')
    expect(html).toContain('{{body_alineado_molecular}}')
  })
})

describe('renderSubtituloTextoSnippet', () => {
  it('substitutes the text into the <h3>', () => {
    const html = renderSubtituloTextoSnippet({ text: 'Mi subtítulo' })
    expect(html).toContain('<h3')
    expect(html).toContain('>Mi subtítulo<')
    expect(html).not.toContain('bloque de texto')
  })

  it('escapes HTML-significant characters', () => {
    const html = renderSubtituloTextoSnippet({ text: '<i>y</i>' })
    expect(html).toContain('&lt;i&gt;y&lt;/i&gt;')
  })

  it('has no Liquid tags left', () => {
    expect(renderSubtituloTextoSnippet({ text: 'x' })).not.toMatch(NO_LIQUID_TAG_RE)
  })
})

describe('renderSeparadorLineaSnippet', () => {
  it('returns the decorative line, no fields to substitute', () => {
    const html = renderSeparadorLineaSnippet({})
    expect(html).toContain('role="molecula-separador"')
    expect(html).not.toMatch(NO_LIQUID_TAG_RE)
    // Sobreviven para la pasada de tema / de alineado del módulo dueño.
    expect(html).toContain('{{color_acento1_mail_general}}')
    expect(html).toContain('{{alineado_molecular_mail_body}}')
  })
})
