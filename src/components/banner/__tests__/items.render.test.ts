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
    const short = renderPromoSnippet({ promoText: '120' }, doc(), ctx(bannerType))
    const long = renderPromoSnippet({ promoText: '$14.000' }, doc(), ctx(bannerType))
    expect(short).toContain('bnr-xl')
    expect(long).toContain('bnr-lg')
  })

  it('carries the promo text verbatim, including a literal "$" (no String.replace corruption)', () => {
    const html = renderPromoSnippet({ promoText: '$14.000' }, doc(), ctx('horizontal'))
    expect(html).toContain('$14.000')
  })

  it('has no Liquid left (banner_* vars resolved; _mail_general left for the final theme pass)', () => {
    const html = renderPromoSnippet({ promoText: '120' }, doc(), ctx('horizontal'))
    expect(html).not.toMatch(NO_LIQUID_TAG_RE)
    expect(html).not.toMatch(UNRESOLVED_BANNER_VAR_RE)
    expect(html).toContain('{{bg_descuento_mail_general}}')
  })

  it('escapes HTML-significant characters in the promo text', () => {
    const html = renderPromoSnippet({ promoText: '<b>x</b>' }, doc(), ctx('horizontal'))
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;')
    expect(html).not.toContain('<b>x</b>')
  })
})

describe('renderCreditosSnippet', () => {
  it.each(['horizontal', 'vertical'] as const)('%s: short -> bnr-xl, long -> bnr-lg, "DE REINTEGRO" survives untouched', (bannerType) => {
    const short = renderCreditosSnippet({ creditosText: '120' }, doc(), ctx(bannerType))
    const long = renderCreditosSnippet({ creditosText: '12345' }, doc(), ctx(bannerType))
    expect(short).toContain('bnr-xl')
    expect(long).toContain('bnr-lg')
    expect(short).toContain('DE REINTEGRO')
  })

  it('has no Liquid left besides the _mail_general vars', () => {
    const html = renderCreditosSnippet({ creditosText: '120' }, doc(), ctx('vertical'))
    expect(html).not.toMatch(NO_LIQUID_TAG_RE)
    expect(html).not.toMatch(UNRESOLVED_BANNER_VAR_RE)
  })

  it('horizontal: fixes the master\'s "font-siaze" typo so the amount actually gets a font-size (was silently dropped by the browser)', () => {
    const html = renderCreditosSnippet({ creditosText: '120' }, doc(), ctx('horizontal'))
    expect(html).not.toContain('font-siaze')
    expect(html).toMatch(/font-size:\s*\{\{banner_copy_modulo_creditos_fontsize\}\}|font-size:\s*\d/)
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
  it('replaces the placeholder sentence with the user text, no Liquid at all besides a plain-text run', () => {
    const html = renderTextoComplementarioSnippet({ text: richTextFromPlain('Nuevo texto complementario') })
    expect(html).toContain('Nuevo texto complementario')
    expect(html).not.toContain('Más de 500 opciones de tacos')
    // Este archivo, a diferencia de los demás, no tiene NINGÚN Liquid propio —
    // ni siquiera un `_mail_general` (su color es un #FFFFFF hardcodeado); un
    // run SIN modificadores de color no inyecta ningún {{...}} tampoco.
    expect(html).not.toMatch(/\{%|\{\{/)
  })

  it('a color modifier (subtono1) DOES inject a {{color_acento1_mail_general}} token for the final theme pass', () => {
    const html = renderTextoComplementarioSnippet({ text: [{ text: 'Nuevo texto', marks: ['colorAcento1'] }] })
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
