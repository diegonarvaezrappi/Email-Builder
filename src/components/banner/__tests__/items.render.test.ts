import { describe, expect, it } from 'vitest'
import { defaultEmailDocument } from '../../../registry'
import type { EmailDocument } from '../../../model'
import { richTextFromPlain } from '../../../richText/model'
import { DARK_THEME_SLUGS, THEME_SLUGS } from '../../../themes/themes'
import type { BannerItemRenderCtx } from '../schema'
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
    const short = renderCreditosSnippet({ creditosText: '120', variant: 'generica' }, doc(), ctx(bannerType))
    const long = renderCreditosSnippet({ creditosText: '12345', variant: 'generica' }, doc(), ctx(bannerType))
    expect(short).toContain('bnr-xl')
    expect(long).toContain('bnr-lg')
    expect(short).toContain('DE REINTEGRO')
  })

  it('has no Liquid left besides the _mail_general vars', () => {
    const html = renderCreditosSnippet({ creditosText: '120', variant: 'generica' }, doc(), ctx('vertical'))
    expect(html).not.toMatch(NO_LIQUID_TAG_RE)
    expect(html).not.toMatch(UNRESOLVED_BANNER_VAR_RE)
  })

  it('horizontal: fixes the master\'s "font-siaze" typo so the amount actually gets a font-size (was silently dropped by the browser)', () => {
    const html = renderCreditosSnippet({ creditosText: '120', variant: 'generica' }, doc(), ctx('horizontal'))
    expect(html).not.toContain('font-siaze')
    expect(html).toMatch(/font-size:\s*\{\{banner_copy_modulo_creditos_fontsize\}\}|font-size:\s*\d/)
  })

  describe('variant "acento"', () => {
    const pastelOrDarkCases = [
      ['beige100', 'horizontal'],
      ['beige100', 'vertical'],
      ['darkturbo', 'horizontal'],
      ['darkturbo', 'vertical'],
    ] as const

    it.each(pastelOrDarkCases)(
      'tema %s, %s: swaps bg_creditos/color_creditos for bg_solid_generico100_mail_body/color_acento2 (both occurrences)',
      (tema, bannerType) => {
        const html = renderCreditosSnippet({ creditosText: '120', variant: 'acento' }, doc({ global: { ...doc().global, tema } }), ctx(bannerType))
        expect(html).not.toContain('{{bg_creditos_mail_general}}')
        expect(html).not.toContain('{{color_creditos_mail_general}}')
        expect(html).toContain('{{bg_solid_generico100_mail_body}}')
        expect((html.match(/\{\{color_acento2_mail_general\}\}/g) ?? []).length).toBe(2)
      },
    )

    it.each(['pro', 'problack'] as const)('on %s, "acento" is a no-op — renders identically to "generica"', (tema) => {
      const withAcento = renderCreditosSnippet({ creditosText: '120', variant: 'acento' }, doc({ global: { ...doc().global, tema } }), ctx('vertical'))
      const withGenerica = renderCreditosSnippet(
        { creditosText: '120', variant: 'generica' },
        doc({ global: { ...doc().global, tema } }),
        ctx('vertical'),
      )
      expect(withAcento).toBe(withGenerica)
    })
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
})

describe('renderTagsSnippet', () => {
  it.each([1, 2, 3])('renders exactly %i pill(s) for %i label(s)', (n) => {
    const tags = Array.from({ length: n }, (_, i) => `tag${i}`)
    const html = renderTagsSnippet({ tags }, doc(), ctx('horizontal'))
    expect((html.match(/<h4/g) ?? []).length).toBe(n)
    for (const t of tags) expect(html).toContain(`> ${t} </h4>`)
  })

  it('never duplicates the wrapper table/structure regardless of label count', () => {
    const html = renderTagsSnippet({ tags: ['a', 'b', 'c'] }, doc(), ctx('vertical'))
    expect((html.match(/<table/g) ?? []).length).toBe(
      (renderTagsSnippet({ tags: ['a'] }, doc(), ctx('vertical')).match(/<table/g) ?? []).length,
    )
  })

  it('escapes HTML-significant characters in tag labels', () => {
    const html = renderTagsSnippet({ tags: ['<script>&x'] }, doc(), ctx('horizontal'))
    expect(html).toContain('&lt;script&gt;&amp;x')
    expect(html).not.toContain('<script>&x')
  })

  it('horizontal uses float:right, vertical uses margin:0 auto (orientation-specific alignment preserved)', () => {
    expect(renderTagsSnippet({ tags: ['a'] }, doc(), ctx('horizontal'))).toContain('float: right')
    expect(renderTagsSnippet({ tags: ['a'] }, doc(), ctx('vertical'))).toContain('margin: 0 auto')
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
