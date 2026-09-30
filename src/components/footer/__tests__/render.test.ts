import { describe, expect, it } from 'vitest'
import { defaultFooterFields } from '../schema'
import { footerTextColor, renderFooterSnippet, resolveFontStyleLook } from '../render'

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
      expect(resolveFontStyleLook(tema)).toBe(tema)
    }
  })

  it('is negro for the 3 oscuros/invertidos — no matching footer branch for them', () => {
    for (const tema of TEMAS_NEGRO) {
      expect(resolveFontStyleLook(tema)).toBe('negro')
    }
  })

  // Hasta el pull 7f349d9 (2026-09-22) los 2 resolvían a 'pro': el maestro no
  // le había dado rama propia a problack. Ese pull la agregó (negro puro) en
  // footer_general.html — ver themes.ts#FONT_STYLE_LOOK_FOR_THEME.
  it('resolves each premium theme to its own branch, now that problack has one', () => {
    expect(resolveFontStyleLook('pro')).toBe('pro')
    expect(resolveFontStyleLook('problack')).toBe('problack')
  })

  it('falls back to negro for a theme that no longer exists in the repo', () => {
    expect(resolveFontStyleLook('tema-que-david-borro')).toBe('negro')
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

  // footer_rts.html trae las mismas ramas por tema que el General desde que
  // se rehízo sobre su diseño (2026-09-17): ya no se fuerza 'negro'.
  it("renders the RTS content block reference following the theme's font_style_look", () => {
    const snippet = renderFooterSnippet({ ...defaultFooterFields, tipoFooter: 'RTS' }, 'pro')
    expect(snippet).toContain('{{content_blocks.${FOOTER_RTS_q3_2024_legales}}}')
    expect(snippet).toContain("font_style_look = 'pro'")
    for (const tema of [...TEMAS_PASTEL, ...TEMAS_PRO]) {
      expect(renderFooterSnippet({ ...defaultFooterFields, tipoFooter: 'RTS' }, tema)).toContain(`font_style_look = '${tema}'`)
    }
  })

  it('renders the Restaurantes (B2B) content block reference following the theme', () => {
    for (const tema of [...TEMAS_PASTEL, ...TEMAS_PRO]) {
      const snippet = renderFooterSnippet({ ...defaultFooterFields, tipoFooter: 'B2B' }, tema)
      expect(snippet).toContain('{{content_blocks.${FOOTER_ALIADOS}}}')
      expect(snippet).toContain(`font_style_look = '${tema}'`)
    }
  })

  it('sets font_style_look to problack for the ProBlack theme', () => {
    const snippet = renderFooterSnippet(defaultFooterFields, 'problack')
    expect(snippet).toContain("font_style_look = 'problack'")
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
      '<a href="https://promos.rappi.com/colombia/2025/promo2x1" style="text-decoration: none; color:#633D11">https://promos.rappi.com/colombia/2025/promo2x1</a>',
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

  // El link de "Legales adicionales" lleva el color de los legales que lo rodean
  // (color_letra del footer), no un gris fijo.
  it('colors a link in "Legales adicionales" like the surrounding legal text, per theme', () => {
    const legalesAdicionales = 'Más info https://promos.rappi.com/x'
    const cases: [string, string][] = [
      ['beige100', '#633D11'],
      ['purpura100', '#4C2B8C'],
      ['verde100', '#102E14'],
      ['pro', '#9EA1A2'],
      ['problack', '#000000'],
    ]
    for (const [tema, color] of cases) {
      expect(renderFooterSnippet({ ...defaultFooterFields, legalesAdicionales }, tema)).toContain(`color:${color}">https://promos.rappi.com/x</a>`)
    }
  })

  it('reads the color from the chosen footer type, including its fallback branch', () => {
    for (const tipo of ['General', 'SinAmor', 'RTS', 'B2B'] as const) {
      expect(footerTextColor(tipo, 'rosa100')).toBe('#4F145E')
    }
    // footer_simple.html no tiene rama 'problack': el texto cae al gris del else, y el link con él.
    expect(footerTextColor('SinAmor', 'problack')).toBe('#7D8188')
    expect(footerTextColor('General', 'problack')).toBe('#000000')
  })
})
