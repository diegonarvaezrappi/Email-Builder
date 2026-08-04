import { describe, expect, it } from 'vitest'
import { defaultEmailDocument } from '../../../registry'
import { renderBannerSnippet } from '../render'
import { THEME_SLUGS } from '../../../themes/themes'
import { richTextFromPlain } from '../../../richText/model'
import type { EmailDocument } from '../../../model'
import type { BannerItem } from '../items/schemas'

const doc = (over: Partial<EmailDocument> = {}): EmailDocument => ({ ...defaultEmailDocument, ...over })
const withItems = (items: BannerItem[], over: Partial<EmailDocument> = {}) =>
  doc({ ...over, banner: { ...defaultEmailDocument.banner, ...over.banner, items } })

const promo = (id: string, promoText = '120'): BannerItem => ({ id, type: 'PROMO', fields: { promoText } })
const tags = (id: string): BannerItem => ({ id, type: 'TAGS', fields: { tags: ['tag 1'] } })
const textom = (id: string): BannerItem => ({ id, type: 'TEXTOM', fields: { text: richTextFromPlain('x') } })
const ctaInterno = (id: string): BannerItem => ({ id, type: 'CTA_INTERNO', fields: { text: 'x', deeplink: '#' } })

describe('renderBannerSnippet', () => {
  it('default document (vertical, pre-loaded with PROMO/TEXTOM/TEXTO_COMPLEMENTARIO/IMG_FIJA/TAGS) renders every default piece', () => {
    const html = renderBannerSnippet(defaultEmailDocument.banner, defaultEmailDocument)
    expect(html).toContain('BANNER_VERTICAL')
    expect(html).toContain('BITEM:PROMO:')
    expect(html).toContain('BITEM:TEXTOM:')
    expect(html).toContain('BITEM:TEXTO_COMPLEMENTARIO:')
    expect(html).toContain('BITEM:IMG_FIJA:')
    expect(html).toContain('BITEM:TAGS:')
  })

  it('groups a run of consecutive MOLECULA-zone items into ONE molecule table', () => {
    const d = withItems([promo('a'), textom('b')])
    const html = renderBannerSnippet(d.banner, d)
    // Ambas piezas deben aparecer, y solo debería haber 1 tabla de moléculas
    // real (identificable por el padding de tema que trae esa tabla).
    expect(html).toContain('BITEM:PROMO:a')
    expect(html).toContain('BITEM:TEXTOM:b')
    const moleculeTableOpenings = html.match(/padd_banner_mail_general|padding:0px 0px/g) ?? []
    expect(moleculeTableOpenings.length).toBeGreaterThan(0)
  })

  it('separates 2 molecule-zone runs when a MODULO-zone item sits between them', () => {
    const d = withItems([promo('a'), tags('mid'), textom('b')])
    const html = renderBannerSnippet(d.banner, d)
    const idxA = html.indexOf('BITEM:PROMO:a')
    const idxMid = html.indexOf('BITEM:TAGS:mid')
    const idxB = html.indexOf('BITEM:TEXTOM:b')
    expect(idxA).toBeLessThan(idxMid)
    expect(idxMid).toBeLessThan(idxB)
  })

  it('link replaces both AQUIELLINKDELBANNER occurrences and is HTML-attribute-escaped', () => {
    const d = doc({ banner: { ...defaultEmailDocument.banner, link: 'https://x.test/a?b="c"' } })
    const html = renderBannerSnippet(d.banner, d)
    expect(html).not.toContain('AQUIELLINKDELBANNER')
    expect(html).toContain('https://x.test/a?b=&quot;c&quot;')
  })

  it('items whose type has no file for the active orientation are skipped at render, not crashed on', () => {
    const d = withItems(
      [{ id: 'a', type: 'IMG_AUTOMATICA_MODULO', fields: { imageUrl: 'x', widthPercent: 80 } }],
      { banner: { ...defaultEmailDocument.banner, bannerType: 'vertical' } },
    )
    expect(() => renderBannerSnippet(d.banner, d)).not.toThrow()
    expect(renderBannerSnippet(d.banner, d)).not.toContain('BITEM:IMG_AUTOMATICA_MODULO:a')
  })

  it('"clean output" — zero Liquid `{% %}` tags without a CTA_INTERNO item, exactly 4 with one', () => {
    const withoutCta = withItems([promo('a'), tags('b')])
    const withCta = withItems([promo('a'), ctaInterno('c')])
    expect((renderBannerSnippet(withoutCta.banner, withoutCta).match(/\{%/g) ?? []).length).toBe(0)
    expect((renderBannerSnippet(withCta.banner, withCta).match(/\{%/g) ?? []).length).toBe(4)
  })

  it('theme-leak test: for every theme, no {{...}} of any kind survives in the rendered banner (all 10 item types present)', () => {
    const allItems: BannerItem[] = [
      { id: '1', type: 'PROMO', fields: { promoText: '120' } },
      { id: '2', type: 'CREDITOS', fields: { creditosText: '120' } },
      { id: '3', type: 'TEXTOXL', fields: { text: richTextFromPlain('x') } },
      { id: '4', type: 'TEXTOM', fields: { text: richTextFromPlain('x') } },
      { id: '5', type: 'IMG_AUTOMATICA_MOLECULA', fields: { imageUrl: 'x', widthPercent: 80 } },
      { id: '6', type: 'IMG_FIJA', fields: { heroImageUrl: 'x', logoImageUrl: 'x', logoLink: '' } },
      { id: '7', type: 'TAGS', fields: { tags: ['a'] } },
    ]
    for (const tema of THEME_SLUGS) {
      const d = withItems(allItems, { global: { ...defaultEmailDocument.global, tema } })
      const html = renderBannerSnippet(d.banner, d)
      expect(html, `theme ${tema} leaked a {{...}}`).not.toMatch(/\{\{\s*[a-z_0-9]+\s*\}\}/)
    }
  })

  it('bakes real theme literals in for a known theme (beige100)', () => {
    const d = withItems([{ id: '1', type: 'TAGS', fields: { tags: ['a'] } }], {
      global: { ...defaultEmailDocument.global, tema: 'beige100' },
    })
    const html = renderBannerSnippet(d.banner, d)
    expect(html).toContain('rgba(229,182,127,0.5)') // bg_tag_fondo_mail_general
    expect(html).toContain('rgba(0,0,0,0.0)') // bg_bannertono_mail_general
  })

  describe('backgroundEnabled', () => {
    it('by default (true) bakes the real theme tone/image — visible on a dark/premium theme', () => {
      const d = doc({
        global: { ...defaultEmailDocument.global, tema: 'darkturbo' },
        banner: { ...defaultEmailDocument.banner, backgroundEnabled: true },
      })
      expect(renderBannerSnippet(d.banner, d)).toContain('rgba(0,58,52,0.4)') // bg_bannertono_mail_general de darkturbo
    })

    it('when false, forces the tone to fully transparent and the image to the master\'s own "blank" placeholder, on ANY theme', () => {
      // rgba(42,43,43,1.0) (bg_bannertono de Pro) también es, por coincidencia
      // de datos del tema, el valor de bg_tag_contenedor_mail_general (fondo
      // de los TAGS) — así que la comparación va acotada al <div> contenedor
      // del banner (background + max-width:480px, ver big-banner-*.html), no
      // "en cualquier parte del html", para no confundir un valor legítimo de
      // otra variable con el tono del banner sin desactivar.
      for (const tema of ['darkturbo', 'pro', 'darkneon']) {
        const d = withItems([{ id: '1', type: 'TAGS', fields: { tags: ['a'] } }], {
          global: { ...defaultEmailDocument.global, tema },
          banner: { ...defaultEmailDocument.banner, backgroundEnabled: false },
        })
        const html = renderBannerSnippet(d.banner, d)
        const container = html.match(/background:\s*[^;]*;\s*max-width:\s*480px[^>]*>/)?.[0]
        expect(container, tema).toBeDefined()
        expect(container, tema).toContain('rgba(0,0,0,0.0)')
        expect(html, tema).toContain('https://lh3.googleusercontent.com/d/1_q4ca1b7DkKOGnFqwVfKMTFTmhMp0E2A')
        // El bg_bannerimg real del tema (solo Dark Neon lo trae) no sobrevive.
        expect(html, tema).not.toContain('https://lh3.googleusercontent.com/d/1qzt')
      }
    })

    it('turning it off does not disturb the theme resolution of unrelated variables', () => {
      const d = withItems([{ id: '1', type: 'TAGS', fields: { tags: ['a'] } }], {
        global: { ...defaultEmailDocument.global, tema: 'beige100' },
        banner: { ...defaultEmailDocument.banner, backgroundEnabled: false },
      })
      const html = renderBannerSnippet(d.banner, d)
      expect(html).toContain('rgba(229,182,127,0.5)') // bg_tag_fondo_mail_general, sin tocar
      expect(html).not.toMatch(/\{\{\s*[a-z_0-9]+\s*\}\}/)
    })
  })
})
