import { describe, expect, it } from 'vitest'
import { defaultFooterFields } from '../schema'
import { renderFooterSnippet, resolveFontStyleLook } from '../render'

// Temas reales del repo (01-foundations/global-styles/head-meta-tags.html):
// los 9 primeros definen color_footer_mail_general = 'negro', pro/problack = 'pro'.
const TEMAS_NEGRO = ['beige100', 'beige150', 'rosa100', 'purpura100', 'celeste100', 'verde100', 'darkneon', 'darkturbo', 'darkneutro']
const TEMAS_PRO = ['pro', 'problack']

describe('resolveFontStyleLook', () => {
  it('is negro for the 9 pastel/dark themes', () => {
    for (const tema of TEMAS_NEGRO) {
      expect(resolveFontStyleLook(tema, 'General')).toBe('negro')
    }
  })

  it('is pro for the Pro/ProBlack themes', () => {
    for (const tema of TEMAS_PRO) {
      expect(resolveFontStyleLook(tema, 'General')).toBe('pro')
    }
  })

  it('forces negro when Tipo de Footer is RTS, regardless of the theme', () => {
    for (const tema of [...TEMAS_NEGRO, ...TEMAS_PRO]) {
      expect(resolveFontStyleLook(tema, 'RTS')).toBe('negro')
    }
  })

  it('falls back to negro for a theme that no longer exists in the repo', () => {
    expect(resolveFontStyleLook('tema-que-david-borro', 'General')).toBe('negro')
  })
})

describe('renderFooterSnippet', () => {
  it('renders the General content block reference with all legal flags off', () => {
    const snippet = renderFooterSnippet(defaultFooterFields, 'beige100')
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
    const snippet = renderFooterSnippet({ ...defaultFooterFields, tipoFooter: 'SinAmor' }, 'beige100')
    expect(snippet).toContain('{{content_blocks.${FOOTER_VERSION2}}}')
  })

  it('renders the RTS content block reference and forces font_style_look to negro', () => {
    const snippet = renderFooterSnippet({ ...defaultFooterFields, tipoFooter: 'RTS' }, 'pro')
    expect(snippet).toContain('{{content_blocks.${FOOTER_RTS_q3_2024_legales}}}')
    expect(snippet).toContain("font_style_look = 'negro'")
  })

  it('sets font_style_look to pro for the ProBlack theme outside RTS', () => {
    const snippet = renderFooterSnippet(defaultFooterFields, 'problack')
    expect(snippet).toContain("font_style_look = 'pro'")
  })

  it('emits font_style_look as a resolved literal, never as nested interpolation', () => {
    // Liquid no interpola {{ }} dentro de un string literal — emitir
    // '{{color_footer_mail_general}}' asignaría el texto crudo y no coincidiría
    // con ninguna rama de estilo. Estuvo así en el repo (4499862 / c88b818) y se
    // revirtió en bf7e9eb.
    const snippet = renderFooterSnippet(defaultFooterFields, 'pro')
    expect(snippet).not.toContain('{{color_footer_mail_general}}')
    expect(snippet).not.toContain('color_footer_mail_general')
  })

  it('reflects the 3 legal checkboxes as lowercase Liquid booleans', () => {
    const snippet = renderFooterSnippet(
      {
        ...defaultFooterFields,
        legalPromos: true,
        legalTurbo: true,
        legalLicores: true,
      },
      'beige100',
    )
    expect(snippet).toContain('show_legal_tyc = true')
    expect(snippet).toContain('show_legal_turbo = true')
    expect(snippet).toContain('show_legal_liquor = true')
  })

  it('wraps a URL inside "Legales adicionales" with the footer link style', () => {
    const snippet = renderFooterSnippet(
      {
        ...defaultFooterFields,
        legalesAdicionales: 'Válido hasta el 31 de diciembre de 2026 https://promos.rappi.com/colombia/2025/promo2x1',
      },
      'beige100',
    )
    expect(snippet).toContain(
      '<a href="https://promos.rappi.com/colombia/2025/promo2x1" style="text-decoration: none; color:#7D8188">https://promos.rappi.com/colombia/2025/promo2x1</a>',
    )
  })

  it('keeps plain text without a URL untouched inside the cond assign', () => {
    const snippet = renderFooterSnippet(
      { ...defaultFooterFields, legalesAdicionales: 'Aplica hasta agotar existencias' },
      'beige100',
    )
    expect(snippet).toContain("{% assign cond = 'Aplica hasta agotar existencias' %}")
  })

  it('does not leak the pedagogical comments from 03-components/footer/footer.html', () => {
    const snippet = renderFooterSnippet(defaultFooterFields, 'beige100')
    expect(snippet).not.toContain('<!--')
    expect(snippet).not.toContain('DENTRO DE LAS COMILLAS')
  })
})
