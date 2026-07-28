import { describe, expect, it } from 'vitest'
import { defaultFooterFields } from '../schema'
import { renderFooterSnippet, resolveFontStyleLook } from '../render'

describe('resolveFontStyleLook', () => {
  it('is negro for Generico/Turbo/TurboSelecto/Neutro', () => {
    for (const tipoKv of ['Generico', 'Turbo', 'TurboSelecto', 'Neutro'] as const) {
      expect(resolveFontStyleLook({ tipoKv, tipoFooter: 'General' })).toBe('negro')
    }
  })

  it('is pro for Pro/ProBlack', () => {
    expect(resolveFontStyleLook({ tipoKv: 'Pro', tipoFooter: 'General' })).toBe('pro')
    expect(resolveFontStyleLook({ tipoKv: 'ProBlack', tipoFooter: 'General' })).toBe('pro')
  })

  it('forces negro when Tipo de Footer is RTS, regardless of Tipo de Kv', () => {
    expect(resolveFontStyleLook({ tipoKv: 'Pro', tipoFooter: 'RTS' })).toBe('negro')
    expect(resolveFontStyleLook({ tipoKv: 'ProBlack', tipoFooter: 'RTS' })).toBe('negro')
    expect(resolveFontStyleLook({ tipoKv: 'Generico', tipoFooter: 'RTS' })).toBe('negro')
  })
})

describe('renderFooterSnippet', () => {
  it('renders the General content block reference with all legal flags off', () => {
    const snippet = renderFooterSnippet(defaultFooterFields)
    expect(snippet).toBe(
      [
        "                            {% assign cond = '' %}",
        "                            {% assign font_style_look = 'negro' %}",
        '                            {% assign show_legal_tyc = false %}',
        '                            {% assign show_legal_turbo = false %}',
        '                            {% assign show_legal_liquor = false %}',
        '                            {{content_blocks.${FOOTER_q1_2024_legales}}}',
      ].join('\n'),
    )
  })

  it('renders the SinAmor content block reference', () => {
    const snippet = renderFooterSnippet({ ...defaultFooterFields, tipoFooter: 'SinAmor' })
    expect(snippet).toContain('{{content_blocks.${FOOTER_VERSION2}}}')
  })

  it('renders the RTS content block reference and forces font_style_look to negro', () => {
    const snippet = renderFooterSnippet({ ...defaultFooterFields, tipoFooter: 'RTS', tipoKv: 'Pro' })
    expect(snippet).toContain('{{content_blocks.${FOOTER_RTS_q3_2024_legales}}}')
    expect(snippet).toContain("font_style_look = 'negro'")
  })

  it('sets font_style_look to pro for Pro/ProBlack outside RTS', () => {
    const snippet = renderFooterSnippet({ ...defaultFooterFields, tipoKv: 'ProBlack' })
    expect(snippet).toContain("font_style_look = 'pro'")
  })

  it('reflects the 3 legal checkboxes as lowercase Liquid booleans', () => {
    const snippet = renderFooterSnippet({
      ...defaultFooterFields,
      legalPromos: true,
      legalTurbo: true,
      legalLicores: true,
    })
    expect(snippet).toContain('show_legal_tyc = true')
    expect(snippet).toContain('show_legal_turbo = true')
    expect(snippet).toContain('show_legal_liquor = true')
  })

  it('wraps a URL inside "Legales adicionales" with the footer link style', () => {
    const snippet = renderFooterSnippet({
      ...defaultFooterFields,
      legalesAdicionales: 'Válido hasta el 31 de diciembre de 2026 https://promos.rappi.com/colombia/2025/promo2x1',
    })
    expect(snippet).toContain(
      '<a href="https://promos.rappi.com/colombia/2025/promo2x1" style="text-decoration: none; color:#7D8188">https://promos.rappi.com/colombia/2025/promo2x1</a>',
    )
  })

  it('keeps plain text without a URL untouched inside the cond assign', () => {
    const snippet = renderFooterSnippet({ ...defaultFooterFields, legalesAdicionales: 'Aplica hasta agotar existencias' })
    expect(snippet).toContain("{% assign cond = 'Aplica hasta agotar existencias' %}")
  })

  it('does not leak the pedagogical comments from Footer/footer.html', () => {
    const snippet = renderFooterSnippet(defaultFooterFields)
    expect(snippet).not.toContain('<!--')
    expect(snippet).not.toContain('DENTRO DE LAS COMILLAS')
  })
})
