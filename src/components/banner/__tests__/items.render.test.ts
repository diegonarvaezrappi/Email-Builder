import { describe, expect, it } from 'vitest'
import { defaultEmailDocument } from '../../../registry'
import type { EmailDocument } from '../../../model'
import { richTextFromPlain } from '../../../richText/model'
import { DARK_THEME_SLUGS, THEME_SLUGS } from '../../../themes/themes'
import type { BannerItemRenderCtx } from '../schema'
import { defaultTagItem, tagsFieldsSchema } from '../items/schemas'
import {
  renderCreditosSnippet,
  renderCtaInternoSnippet,
  renderImgAutomaticaModuloSnippet,
  renderImgAutomaticaMoleculaSnippet,
  renderImgFijaSnippet,
  renderPromoSnippet,
  renderTagsSnippet,
  renderTextoComplementarioSnippet,
  renderTextoMSnippet,
  renderTextoXlSnippet,
} from '../items/render'

const doc = (over: Partial<EmailDocument> = {}): EmailDocument => ({ ...defaultEmailDocument, ...over })
const ctx = (bannerType: 'horizontal' | 'vertical'): BannerItemRenderCtx => ({ bannerType })
const promoFields = (promoText: string) => ({ promoText: richTextFromPlain(promoText), ahoraEnabled: true, ahoraText: richTextFromPlain('Ahora') })
const creditosFields = (creditosText: string, variant: 'generica' | 'acento' = 'generica') => ({
  creditosText: richTextFromPlain(creditosText),
  variant,
  deReintegroEnabled: true,
  deReintegroText: richTextFromPlain('DE REINTEGRO'),
})

// `{% %}` tags: ninguna de estas 9 piezas (todas salvo CTA_INTERNO) debe
// dejar una sola. `{{banner_*}}` sin resolver: bug real (resolveBannerVars
// debería haberlo sustituido o hecho throw). Los `{{xxx_mail_general}}` SÍ
// deben sobrevivir a propósito — eso lo resuelve renderBannerSnippet al
// final, no cada render de pieza — así que nunca se comprueban con un
// catch-all `{{`.
const NO_LIQUID_TAG_RE = /\{%/
const UNRESOLVED_BANNER_VAR_RE = /\{\{\s*banner_[a-z_0-9]+\s*\}\}/

describe('renderPromoSnippet', () => {
  it.each(['horizontal', 'vertical'] as const)('%s: short text -> bnr-xl, long text -> bnr-lg', (bannerType) => {
    const short = renderPromoSnippet(promoFields('120'), doc(), ctx(bannerType))
    const long = renderPromoSnippet(promoFields('$14.000'), doc(), ctx(bannerType))
    expect(short).toContain('bnr-xl')
    expect(long).toContain('bnr-lg')
  })

  it('carries the promo text verbatim, including a literal "$" (no String.replace corruption)', () => {
    const html = renderPromoSnippet(promoFields('$14.000'), doc(), ctx('horizontal'))
    expect(html).toContain('$14.000')
  })

  it('has no Liquid left (banner_* vars resolved; _mail_general left for the final theme pass)', () => {
    const html = renderPromoSnippet(promoFields('120'), doc(), ctx('horizontal'))
    expect(html).not.toMatch(NO_LIQUID_TAG_RE)
    expect(html).not.toMatch(UNRESOLVED_BANNER_VAR_RE)
    expect(html).toContain('{{bg_descuento_mail_general}}')
  })

  it('escapes HTML-significant characters in the promo text', () => {
    const html = renderPromoSnippet({ ...promoFields('120'), promoText: richTextFromPlain('<b>x</b>') }, doc(), ctx('horizontal'))
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;')
    expect(html).not.toContain('<b>x</b>')
  })

  // Regresión: reportado por el usuario 2026-08-25 ("entre Promo e Imagen
  // automática no hay espacio"). La tabla coloreada de PROMO (bgcolor de la
  // pastillita) traía el padding-bottom:7px de separación EN LA MISMA tabla
  // -> ese padding queda pintado del color de fondo en vez de transparente,
  // así que la pieza siguiente queda pegada. wrapColoredBadgeSpacing debe
  // envolverla en una tabla exterior transparente que sea la que cargue esa
  // separación.
  it.each(['horizontal', 'vertical'] as const)(
    '%s: wraps the colored badge in a transparent outer table carrying the padding-bottom, instead of leaving it on the colored table',
    (bannerType) => {
      const html = renderPromoSnippet(promoFields('120'), doc(), ctx(bannerType))
      const outerTagEnd = html.indexOf('>')
      const outerOpenTag = html.slice(0, outerTagEnd + 1)
      expect(outerOpenTag).not.toContain('bgcolor')
      expect(outerOpenTag).toContain('padding-bottom: 7px;')
      // La pastillita de siempre sigue adentro, intacta (bgcolor real, sin el padding-bottom extra).
      const innerTagStart = html.indexOf('<table', outerTagEnd)
      const innerTagEnd = html.indexOf('>', innerTagStart)
      const innerOpenTag = html.slice(innerTagStart, innerTagEnd + 1)
      expect(innerOpenTag).toContain('bgcolor="{{bg_descuento_mail_general}}"')
      expect(innerOpenTag).not.toContain('padding-bottom: 7px;')
    },
  )

  it('applies rich-text marks to the promo amount (bold, same mechanism as TEXTOM)', () => {
    const html = renderPromoSnippet(
      { ...promoFields('120'), promoText: [{ text: '120', marks: ['bold'] }] },
      doc(),
      ctx('vertical'),
    )
    expect(html).toContain('<span style="font-weight: bold;">120</span>')
  })

  describe('la celda "Ahora"', () => {
    it.each(['horizontal', 'vertical'] as const)('%s: reemplaza el texto "Ahora" por el que ponga el usuario', (bannerType) => {
      const html = renderPromoSnippet({ ...promoFields('120'), ahoraText: richTextFromPlain('Antes') }, doc(), ctx(bannerType))
      expect(html).toContain('>Antes<')
      expect(html).not.toContain('>Ahora<')
    })

    it.each(['horizontal', 'vertical'] as const)('%s: ahoraEnabled=false borra la celda completa, incluida su clase de sizing', (bannerType) => {
      const html = renderPromoSnippet({ ...promoFields('120'), ahoraEnabled: false }, doc(), ctx(bannerType))
      expect(html).not.toContain('Ahora')
      expect(html).not.toContain('banner_copy_modulo_ahora')
      // El resto de la pieza (el monto) sigue intacto.
      expect(html).toContain('120')
      expect(html).not.toMatch(NO_LIQUID_TAG_RE)
      expect(html).not.toMatch(UNRESOLVED_BANNER_VAR_RE)
    })

    it('escapa HTML-significant characters en el texto de "Ahora"', () => {
      const html = renderPromoSnippet({ ...promoFields('120'), ahoraText: richTextFromPlain('<b>x</b>') }, doc(), ctx('horizontal'))
      expect(html).toContain('&lt;b&gt;x&lt;/b&gt;')
      expect(html).not.toContain('<b>x</b>')
    })

    it('aplica modificadores de texto al "Ahora" (subrayado, mismo mecanismo que TEXTOM)', () => {
      const html = renderPromoSnippet(
        { ...promoFields('120'), ahoraText: [{ text: 'Ahora', marks: ['underline'] }] },
        doc(),
        ctx('vertical'),
      )
      expect(html).toContain('<span style="text-decoration: underline;">Ahora</span>')
    })
  })
})

describe('renderCreditosSnippet', () => {
  it.each(['horizontal', 'vertical'] as const)('%s: short -> bnr-xl, long -> bnr-lg, "DE REINTEGRO" survives untouched', (bannerType) => {
    const short = renderCreditosSnippet(creditosFields('120'), doc(), ctx(bannerType))
    const long = renderCreditosSnippet(creditosFields('12345'), doc(), ctx(bannerType))
    expect(short).toContain('bnr-xl')
    expect(long).toContain('bnr-lg')
    expect(short).toContain('DE REINTEGRO')
  })

  it('has no Liquid left besides the _mail_general vars', () => {
    const html = renderCreditosSnippet(creditosFields('120'), doc(), ctx('vertical'))
    expect(html).not.toMatch(NO_LIQUID_TAG_RE)
    expect(html).not.toMatch(UNRESOLVED_BANNER_VAR_RE)
  })

  it('horizontal: fixes the master\'s "font-siaze" typo so the amount actually gets a font-size (was silently dropped by the browser)', () => {
    const html = renderCreditosSnippet(creditosFields('120'), doc(), ctx('horizontal'))
    expect(html).not.toContain('font-siaze')
    expect(html).toMatch(/font-size:\s*\{\{banner_copy_modulo_creditos_fontsize\}\}|font-size:\s*\d/)
  })

  // Regresión: mismo bug que PROMO (ver el test homónimo más arriba) — CREDITOS
  // también tiene bgcolor + padding-bottom:7px en la misma tabla.
  it.each(['horizontal', 'vertical'] as const)(
    '%s: wraps the colored badge in a transparent outer table carrying the padding-bottom, instead of leaving it on the colored table',
    (bannerType) => {
      const html = renderCreditosSnippet(creditosFields('120'), doc(), ctx(bannerType))
      const outerTagEnd = html.indexOf('>')
      const outerOpenTag = html.slice(0, outerTagEnd + 1)
      expect(outerOpenTag).not.toContain('bgcolor')
      expect(outerOpenTag).toContain('padding-bottom: 7px;')
      const innerTagStart = html.indexOf('<table', outerTagEnd)
      const innerTagEnd = html.indexOf('>', innerTagStart)
      const innerOpenTag = html.slice(innerTagStart, innerTagEnd + 1)
      expect(innerOpenTag).toContain('bgcolor="{{bg_creditos_mail_general}}"')
      expect(innerOpenTag).not.toContain('padding-bottom: 7px;')
    },
  )

  describe('la leyenda "DE REINTEGRO"', () => {
    it.each(['horizontal', 'vertical'] as const)('%s: reemplaza el texto por el que ponga el usuario', (bannerType) => {
      const html = renderCreditosSnippet(
        { ...creditosFields('120'), deReintegroText: richTextFromPlain('REEMBOLSO') },
        doc(),
        ctx(bannerType),
      )
      expect(html).toContain('>REEMBOLSO<')
      expect(html).not.toContain('>DE REINTEGRO<')
    })

    it.each(['horizontal', 'vertical'] as const)('%s: deReintegroEnabled=false borra solo el <div> de la leyenda, el monto sigue intacto', (bannerType) => {
      const html = renderCreditosSnippet({ ...creditosFields('120'), deReintegroEnabled: false }, doc(), ctx(bannerType))
      expect(html).not.toContain('DE REINTEGRO')
      expect(html).toContain('120')
      expect(html).not.toMatch(NO_LIQUID_TAG_RE)
      expect(html).not.toMatch(UNRESOLVED_BANNER_VAR_RE)
    })

    it('aplica modificadores de texto (negrita, mismo mecanismo que PROMO/TEXTOM)', () => {
      const html = renderCreditosSnippet(
        { ...creditosFields('120'), deReintegroText: [{ text: 'DE REINTEGRO', marks: ['bold'] }] },
        doc(),
        ctx('vertical'),
      )
      expect(html).toContain('<span style="font-weight: bold;">DE REINTEGRO</span>')
    })
  })

  describe('variant "acento"', () => {
    const pastelOrDarkCases = [
      ['beige100', 'horizontal'],
      ['beige100', 'vertical'],
      ['darkturbo', 'horizontal'],
      ['darkturbo', 'vertical'],
      ['pro', 'horizontal'],
      ['pro', 'vertical'],
      ['problack', 'horizontal'],
      ['problack', 'vertical'],
    ] as const

    it.each(pastelOrDarkCases)(
      'tema %s, %s: swaps bg_creditos/color_creditos for bg_solid_generico100_mail_body/color_acento2 (both occurrences) — applies on los 11 temas, incl. Pro/ProBlack',
      (tema, bannerType) => {
        const html = renderCreditosSnippet(creditosFields('120', 'acento'), doc({ global: { ...doc().global, tema } }), ctx(bannerType))
        expect(html).not.toContain('{{bg_creditos_mail_general}}')
        expect(html).not.toContain('{{color_creditos_mail_general}}')
        expect(html).toContain('{{bg_solid_generico100_mail_body}}')
        expect((html.match(/\{\{color_acento2_mail_general\}\}/g) ?? []).length).toBe(2)
      },
    )
  })
})

describe('renderTextoXlSnippet', () => {
  it.each(['horizontal', 'vertical'] as const)('%s: short -> bnr-xl, long -> bnr-lg', (bannerType) => {
    expect(renderTextoXlSnippet({ text: richTextFromPlain('120') }, doc(), ctx(bannerType))).toContain('bnr-xl')
    expect(renderTextoXlSnippet({ text: richTextFromPlain('120 créditos') }, doc(), ctx(bannerType))).toContain('bnr-lg')
  })

  describe('accent color by theme', () => {
    const nonDarkThemes = THEME_SLUGS.filter((tema) => !DARK_THEME_SLUGS.includes(tema))

    it.each(nonDarkThemes)('%s (not a dark theme): keeps color_acento2_mail_general', (tema) => {
      const html = renderTextoXlSnippet(
        { text: richTextFromPlain('x') },
        doc({ global: { ...defaultEmailDocument.global, tema } }),
        ctx('vertical'),
      )
      expect(html, tema).toContain('{{color_acento2_mail_general}}')
      expect(html, tema).not.toContain('{{color_acento1_mail_general}}')
    })

    it.each(DARK_THEME_SLUGS)('%s (dark theme): switches to color_acento1_mail_general', (tema) => {
      const html = renderTextoXlSnippet(
        { text: richTextFromPlain('x') },
        doc({ global: { ...defaultEmailDocument.global, tema } }),
        ctx('vertical'),
      )
      expect(html, tema).toContain('{{color_acento1_mail_general}}')
      expect(html, tema).not.toContain('{{color_acento2_mail_general}}')
    })
  })
})

describe('renderTextoMSnippet', () => {
  it('horizontal uses the fixed 30px/31px inline size; vertical uses 50px/51px — no sizing vars involved', () => {
    const h = renderTextoMSnippet({ text: richTextFromPlain('x') }, doc(), ctx('horizontal'))
    const v = renderTextoMSnippet({ text: richTextFromPlain('x') }, doc(), ctx('vertical'))
    expect(h).toContain('font-size: 30px; line-height: 31px')
    expect(v).toContain('font-size: 50px; line-height: 51px')
    expect(h).toContain('class="bnr-md"')
  })

  it('has no Liquid left besides the _mail_general var', () => {
    const html = renderTextoMSnippet({ text: richTextFromPlain('de regalo') }, doc(), ctx('horizontal'))
    expect(html).not.toMatch(NO_LIQUID_TAG_RE)
    expect(html).not.toMatch(UNRESOLVED_BANNER_VAR_RE)
  })

  describe('accent color by theme (same rule as TEXTOXL)', () => {
    it.each(THEME_SLUGS.filter((tema) => !DARK_THEME_SLUGS.includes(tema)))(
      '%s (not a dark theme): keeps color_acento2_mail_general',
      (tema) => {
        const html = renderTextoMSnippet(
          { text: richTextFromPlain('x') },
          doc({ global: { ...defaultEmailDocument.global, tema } }),
          ctx('vertical'),
        )
        expect(html, tema).toContain('{{color_acento2_mail_general}}')
        expect(html, tema).not.toContain('{{color_acento1_mail_general}}')
      },
    )

    it.each(DARK_THEME_SLUGS)('%s (dark theme): switches to color_acento1_mail_general', (tema) => {
      const html = renderTextoMSnippet(
        { text: richTextFromPlain('x') },
        doc({ global: { ...defaultEmailDocument.global, tema } }),
        ctx('vertical'),
      )
      expect(html, tema).toContain('{{color_acento1_mail_general}}')
      expect(html, tema).not.toContain('{{color_acento2_mail_general}}')
    })
  })
})

describe('renderTextoComplementarioSnippet', () => {
  // Desde el pull que reemplazó modulo_texto_complementario.html (único, <h4>
  // hardcodeado en #FFFFFF) por el par real molecula_texto_complementario_
  // {horizontal,vertical}.html (<h2>, color: {{color_texto_mail_general}}) —
  // ver la nota completa en components/banner/items/render.ts.
  it.each(['horizontal', 'vertical'] as const)('%s: uses <h2>, not the old <h4>', (bannerType) => {
    const html = renderTextoComplementarioSnippet({ text: richTextFromPlain('x') }, doc(), ctx(bannerType))
    expect(html, bannerType).toContain('<h2')
    expect(html, bannerType).not.toContain('<h4')
  })

  it.each(['horizontal', 'vertical'] as const)('%s: replaces the placeholder with the user text', (bannerType) => {
    const html = renderTextoComplementarioSnippet({ text: richTextFromPlain('Nuevo texto complementario') }, doc(), ctx(bannerType))
    expect(html, bannerType).toContain('Nuevo texto complementario')
  })

  it.each(['horizontal', 'vertical'] as const)(
    '%s: no Liquid `{%%}` tags left, but color_texto_mail_general DOES survive for the final theme pass (no longer hardcoded #FFFFFF)',
    (bannerType) => {
      const html = renderTextoComplementarioSnippet({ text: richTextFromPlain('x') }, doc(), ctx(bannerType))
      expect(html, bannerType).not.toMatch(NO_LIQUID_TAG_RE)
      expect(html, bannerType).not.toMatch(UNRESOLVED_BANNER_VAR_RE)
      expect(html, bannerType).toContain('{{color_texto_mail_general}}')
      expect(html, bannerType).not.toContain('#FFFFFF')
    },
  )

  it('a color modifier (subtono1) overrides the default color_texto with its own {{color_acento1_mail_general}} token', () => {
    const html = renderTextoComplementarioSnippet(
      { text: [{ text: 'Nuevo texto', marks: ['colorAcento1'] }] },
      doc(),
      ctx('vertical'),
    )
    expect(html).toContain('{{color_acento1_mail_general}}')
  })
})

describe('renderImgAutomaticaMoleculaSnippet / renderImgAutomaticaModuloSnippet', () => {
  it('molecula: substitutes the image URL and width%', () => {
    const html = renderImgAutomaticaMoleculaSnippet({ imageUrl: 'https://x.test/a.png', widthPercent: 42 }, doc(), ctx('horizontal'))
    expect(html).toContain('https://x.test/a.png')
    expect(html).toContain('width: 42%')
    expect(html).not.toContain('1U4HZfNfRWpZ0XhMCmFF-4V4U2H3W8IcN')
  })

  it('modulo (horizontal only): substitutes the image URL and width%, uses a different placeholder URL than the molecula', () => {
    const html = renderImgAutomaticaModuloSnippet({ imageUrl: 'https://x.test/b.png', widthPercent: 55 })
    expect(html).toContain('https://x.test/b.png')
    expect(html).toContain('width: 55%')
    expect(html).not.toContain('braze-images.com')
  })

  // Regresión: pedido explícito del usuario 2026-08-25 — URL en blanco borra
  // el <img> entero en vez de dejar src="" (evita el ícono de "imagen no
  // cargada" en el mail).
  it('molecula: removes the <img> entirely when imageUrl is blank', () => {
    const html = renderImgAutomaticaMoleculaSnippet({ imageUrl: '', widthPercent: 80 }, doc(), ctx('horizontal'))
    expect(html).not.toContain('<img')
    expect(html).not.toContain('src=""')
  })

  it('modulo: removes the <img> entirely when imageUrl is blank', () => {
    const html = renderImgAutomaticaModuloSnippet({ imageUrl: '', widthPercent: 80 })
    expect(html).not.toContain('<img')
    expect(html).not.toContain('src=""')
  })
})

describe('renderImgFijaSnippet', () => {
  it('substitutes hero and logo URLs in both orientations', () => {
    const fields = { heroImageUrl: 'https://x.test/hero.png', logoImageUrl: 'https://x.test/logo.png', logoLink: '' }
    for (const bannerType of ['horizontal', 'vertical'] as const) {
      const html = renderImgFijaSnippet(fields, doc(), ctx(bannerType))
      expect(html).toContain('https://x.test/hero.png')
      expect(html).toContain('https://x.test/logo.png')
    }
  })

  it('wraps the logo in the link ONLY for vertical — horizontal has no such wrapper at all', () => {
    const fields = { heroImageUrl: '', logoImageUrl: '', logoLink: 'https://x.test/logo-link' }
    const vertical = renderImgFijaSnippet(fields, doc(), ctx('vertical'))
    const horizontal = renderImgFijaSnippet(fields, doc(), ctx('horizontal'))
    expect(vertical).toContain('https://x.test/logo-link')
    expect(horizontal).not.toContain('AQUIELLINKDELOGO1')
    expect(horizontal).not.toContain('https://x.test/logo-link')
  })

  it('leaves {{img_overlay_2_mail_general}} for the final theme pass (not a user field)', () => {
    const html = renderImgFijaSnippet({ heroImageUrl: '', logoImageUrl: '', logoLink: '' }, doc(), ctx('horizontal'))
    expect(html).toContain('{{img_overlay_2_mail_general}}')
  })

  // Regresión: pedido explícito del usuario 2026-08-25 — el logo (un <img>
  // real) desaparece cuando su URL queda en blanco, en vez de dejar src="".
  // El fondo (heroImageUrl) es background-image: url(...), no un <img> — ahí
  // un valor vacío ya no deja ningún ícono roto, así que sigue sustituyéndose
  // como siempre (url() vacío, no se borra nada).
  it.each(['horizontal', 'vertical'] as const)('%s: removes the logo <img> when logoImageUrl is blank, but keeps the hero background substitution', (bannerType) => {
    const html = renderImgFijaSnippet({ heroImageUrl: '', logoImageUrl: '', logoLink: '' }, doc(), ctx(bannerType))
    expect(html).not.toContain('<img')
    expect(html).not.toContain('src=""')
    expect(html).toContain('background-image: url();')
  })
})

describe('renderTagsSnippet', () => {
  it.each([1, 2, 3])('renders exactly %i pill(s) for %i label(s)', (n) => {
    const tags = Array.from({ length: n }, (_, i) => defaultTagItem(`tag${i}`))
    const html = renderTagsSnippet({ tags }, doc(), ctx('horizontal'))
    expect((html.match(/<h4/g) ?? []).length).toBe(n)
    for (const t of tags) expect(html).toContain(`> ${t.text} </h4>`)
  })

  it('never duplicates the wrapper table/structure regardless of label count', () => {
    const html = renderTagsSnippet({ tags: ['a', 'b', 'c'].map((t) => defaultTagItem(t)) }, doc(), ctx('vertical'))
    expect((html.match(/<table/g) ?? []).length).toBe(
      (renderTagsSnippet({ tags: [defaultTagItem('a')] }, doc(), ctx('vertical')).match(/<table/g) ?? []).length,
    )
  })

  it('escapes HTML-significant characters in tag labels', () => {
    const html = renderTagsSnippet({ tags: [defaultTagItem('<script>&x')] }, doc(), ctx('horizontal'))
    expect(html).toContain('&lt;script&gt;&amp;x')
    expect(html).not.toContain('<script>&x')
  })

  it('horizontal uses float:right, vertical uses margin:0 auto (orientation-specific alignment preserved)', () => {
    expect(renderTagsSnippet({ tags: [defaultTagItem('a')] }, doc(), ctx('horizontal'))).toContain('float: right')
    expect(renderTagsSnippet({ tags: [defaultTagItem('a')] }, doc(), ctx('vertical'))).toContain('margin: 0 auto')
  })

  it('shows the master icon by default, keeping the same output as before this field existed', () => {
    const html = renderTagsSnippet({ tags: [defaultTagItem('a')] }, doc(), ctx('vertical'))
    expect(html).toContain('<img')
    expect((html.match(/<img/g) ?? []).length).toBe(1)
  })

  it('hides only the disabled icon, keeping its own text and the other pills intact', () => {
    const html = renderTagsSnippet(
      { tags: [{ text: 'a', iconEnabled: false, iconUrl: defaultTagItem().iconUrl }, defaultTagItem('b')] },
      doc(),
      ctx('vertical'),
    )
    expect((html.match(/<img/g) ?? []).length).toBe(1)
    expect(html).toContain('> a </h4>')
    expect(html).toContain('> b </h4>')
  })

  it('treats a blank icon URL as "no icon", same convention as every other <img> field', () => {
    const html = renderTagsSnippet({ tags: [{ text: 'a', iconEnabled: true, iconUrl: '' }] }, doc(), ctx('vertical'))
    expect(html).not.toContain('<img')
    expect(html).toContain('> a </h4>')
  })

  it('substitutes a custom icon URL', () => {
    const html = renderTagsSnippet(
      { tags: [{ text: 'a', iconEnabled: true, iconUrl: 'https://x.test/custom-icon.png' }] },
      doc(),
      ctx('vertical'),
    )
    expect(html).toContain('src="https://x.test/custom-icon.png"')
  })

  it('migrates a legacy plain-string tag (pre-icon documents) into the new shape', () => {
    const parsed = tagsFieldsSchema.parse({ tags: ['legacy tag'] })
    expect(parsed.tags).toEqual([defaultTagItem('legacy tag')])
  })
})

describe('renderCtaInternoSnippet', () => {
  it('cta_alineado is fixed by orientation: left for horizontal, center for vertical', () => {
    const fields = { text: 'Pide aquí', deeplink: '#' }
    expect(renderCtaInternoSnippet(fields, doc(), ctx('horizontal'))).toContain("cta_alineado = 'left'")
    expect(renderCtaInternoSnippet(fields, doc(), ctx('vertical'))).toContain("cta_alineado = 'center'")
  })

  it('reflects doc.global.ctaStyle — the ONE exception to "clean Liquid output" (real Braze content block)', () => {
    const withStyle = doc({ global: { ...defaultEmailDocument.global, ctaStyle: 'pro' } })
    const html = renderCtaInternoSnippet({ text: 'x', deeplink: '#' }, withStyle, ctx('horizontal'))
    expect(html).toContain("style_Look = 'pro'")
    expect(html).toContain('{{content_blocks.${CTA-template}}}')
  })
})
