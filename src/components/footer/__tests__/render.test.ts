import { describe, expect, it } from 'vitest'
import { defaultFooterFields } from '../schema'
import { renderFooterSnippet, resolveFontStyleLook } from '../render'

// Temas reales del repo (01-foundations/global-styles/head-meta-tags.html).
// Desde el pull ~2026-09-02 ("actualización del cta", mismo lote que tocó
// footer_general.html/footer_sinamor.html), los 7 pasteles resuelven a su
// PROPIO slug (footer_general/footer_sinamor ganaron una rama por pastel) —
// ya no caen todos en 'negro' genérico. Solo los 3 oscuros/invertidos siguen
// en 'negro' (el maestro no les dio rama propia). Ver themes.ts#colorFooterForTheme.
const TEMAS_PASTEL = ['gris100', 'beige100', 'beige150', 'rosa100', 'purpura100', 'celeste100', 'verde100']
const TEMAS_NEGRO = ['darkneon', 'darkturbo', 'darkneutro']
const TEMAS_PRO = ['pro', 'problack']

describe('resolveFontStyleLook', () => {
  it('resolves to the tema\'s own slug for the 7 pastel themes', () => {
    for (const tema of TEMAS_PASTEL) {
      expect(resolveFontStyleLook(tema, 'General')).toBe(tema)
    }
  })

  it('is negro for the 3 oscuros/invertidos — no matching footer branch for them', () => {
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
    for (const tema of [...TEMAS_PASTEL, ...TEMAS_NEGRO, ...TEMAS_PRO]) {
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
        "                            {% assign font_style_look = 'beige100' %}",
        "                            {% assign firma = 'sinfirma' %}",
        '                            {% assign show_legal_tyc = false %}',
        '                            {% assign show_legal_turbo = false %}',
        '                            {% assign show_legal_liquor = false %}',
        '                            {{content_blocks.${FOOTER_q1_2024_legales}}}',
      ].join('\n'),
    )
  })

  it('defaults firma to "sinfirma", and reflects an explicit choice verbatim', () => {
    expect(renderFooterSnippet(defaultFooterFields, 'beige100')).toContain("firma = 'sinfirma'")
    expect(renderFooterSnippet({ ...defaultFooterFields, firma: 'general' }, 'beige100')).toContain("firma = 'general'")
    expect(renderFooterSnippet({ ...defaultFooterFields, firma: 'turbo' }, 'beige100')).toContain("firma = 'turbo'")
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
