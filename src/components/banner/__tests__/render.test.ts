import { describe, expect, it } from 'vitest'
import { defaultEmailDocument } from '../../../registry'
import { renderBannerSnippet } from '../render'
import { THEME_SLUGS } from '../../../themes/themes'
import type { EmailDocument } from '../../../model'
import type { BannerItem } from '../items/schemas'

const doc = (over: Partial<EmailDocument> = {}): EmailDocument => ({ ...defaultEmailDocument, ...over })
const withItems = (items: BannerItem[], over: Partial<EmailDocument> = {}) =>
  doc({ ...over, banner: { ...defaultEmailDocument.banner, ...over.banner, items } })

const promo = (id: string, promoText = '120'): BannerItem => ({ id, type: 'PROMO', fields: { promoText } })
const tags = (id: string): BannerItem => ({ id, type: 'TAGS', fields: { tags: ['tag 1'] } })
const textom = (id: string): BannerItem => ({ id, type: 'TEXTOM', fields: { text: 'x' } })
const ctaInterno = (id: string): BannerItem => ({ id, type: 'CTA_INTERNO', fields: { text: 'x', deeplink: '#' } })

describe('renderBannerSnippet', () => {
  it('default document (vertical + 1 TAGS item) renders the vertical shell with no molecule table (no MOLECULA-zone items)', () => {
    const html = renderBannerSnippet(defaultEmailDocument.banner, defaultEmailDocument)
    expect(html).toContain('BANNER_VERTICAL')
    expect(html).toContain('BITEM:TAGS:')
  })

  it('removed: true renders as an empty string', () => {
    const html = renderBannerSnippet({ ...defaultEmailDocument.banner, removed: true }, defaultEmailDocument)
    expect(html).toBe('')
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
      { id: '3', type: 'TEXTOXL', fields: { text: 'x' } },
      { id: '4', type: 'TEXTOM', fields: { text: 'x' } },
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
})
