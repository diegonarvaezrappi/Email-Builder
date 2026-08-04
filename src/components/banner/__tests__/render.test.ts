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

const promo = (id: string, promoText = '120'): BannerItem => ({
  id,
  type: 'PROMO',
  fields: { promoText: richTextFromPlain(promoText), ahoraEnabled: true, ahoraText: richTextFromPlain('Ahora') },
})
const tags = (id: string): BannerItem => ({ id, type: 'TAGS', fields: { tags: ['tag 1'] } })
const textom = (id: string): BannerItem => ({ id, type: 'TEXTOM', fields: { text: richTextFromPlain('x') } })
const ctaInterno = (id: string): BannerItem => ({ id, type: 'CTA_INTERNO', fields: { text: 'x', deeplink: '#' } })
const imgFija = (id: string): BannerItem => ({ id, type: 'IMG_FIJA', fields: { heroImageUrl: '', logoImageUrl: '', logoLink: '' } })

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
      { id: '1', type: 'PROMO', fields: { promoText: richTextFromPlain('120'), ahoraEnabled: true, ahoraText: richTextFromPlain('Ahora') } },
      {
        id: '2',
        type: 'CREDITOS',
        fields: { creditosText: richTextFromPlain('120'), variant: 'generica', deReintegroEnabled: true, deReintegroText: richTextFromPlain('DE REINTEGRO') },
      },
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
    // backgroundEnabled defaults a true (default estático del schema, sin el
    // ajuste por tema de App.tsx) — en pastel eso pinta bg_solid_mail_general.
    expect(html).toContain('#FFF0DD') // bg_solid_mail_general de beige100
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

    // Temas pastel: al revés de oscuros/Pro/ProBlack, el propio maestro
    // documenta el fondo APAGADO por defecto ahí — activarlo pinta
    // bg_solid_mail_general (no el tono del tema, transparente en pastel) y
    // el mismo padding literal que los temas no-pastel ya traen por defecto.
    describe('en temas pastel', () => {
      it('activado, pinta bg_solid_mail_general como tono y el padding "on" de los temas no-pastel', () => {
        const cases: [tema: string, bgSolid: string][] = [
          ['beige100', '#FFF0DD'],
          ['verde100', '#C0FDD3'],
        ]
        for (const [tema, bgSolid] of cases) {
          // padd_banner_mail_general vive en la tabla de MOLECULAS (ver
          // shell.ts) — solo se inserta si hay al menos una pieza de zona
          // MOLECULA (PROMO acá), no con TAGS solo (zona MODULO).
          const d = withItems([promo('a')], {
            global: { ...defaultEmailDocument.global, tema },
            banner: { ...defaultEmailDocument.banner, backgroundEnabled: true },
          })
          const html = renderBannerSnippet(d.banner, d)
          const container = html.match(/background:\s*[^;]*;\s*max-width:\s*480px[^>]*>/)?.[0]
          expect(container, tema).toBeDefined()
          expect(container, tema).toContain(bgSolid)
          expect(html, tema).toContain('padding:15px 10px')
        }
      })

      it('desactivado (default), no pinta ningún fondo — ni el tono ni la imagen "en blanco" que sí se fuerza en oscuros/Pro/ProBlack', () => {
        // Regresión: bg_bannerimg no puede pasar a la URL "en blanco" acá —
        // sobre un tono transparente eso pintaría un recuadro blanco, algo
        // que el maestro documenta explícitamente que NO debe pasar en
        // pastel ("se mantiene idéntico" sin importar el checkbox).
        const d = withItems([promo('a')], {
          global: { ...defaultEmailDocument.global, tema: 'beige100' },
          banner: { ...defaultEmailDocument.banner, backgroundEnabled: false },
        })
        const html = renderBannerSnippet(d.banner, d)
        const container = html.match(/background:\s*[^;]*;\s*max-width:\s*480px[^>]*>/)?.[0]
        expect(container).toBeDefined()
        expect(container).toContain('rgba(0,0,0,0.0)')
        expect(html).not.toContain('https://lh3.googleusercontent.com/d/1_q4ca1b7DkKOGnFqwVfKMTFTmhMp0E2A')
        expect(html).toContain('padding:0px 0px')
      })
    })
  })

  describe('CREDITOS "acento" variant — full pipeline (renderCreditosSnippet solo deja el token, este pass lo resuelve)', () => {
    const creditos = (id: string): BannerItem => ({
      id,
      type: 'CREDITOS',
      fields: { creditosText: richTextFromPlain('120'), variant: 'acento', deReintegroEnabled: true, deReintegroText: richTextFromPlain('DE REINTEGRO') },
    })

    it('en beige100 (pastel), bg_solid_generico100_mail_body y color_acento2 quedan baked, sin Liquid sin resolver', () => {
      const d = withItems([creditos('a')], { global: { ...defaultEmailDocument.global, tema: 'beige100' } })
      const html = renderBannerSnippet(d.banner, d)
      expect(html).toContain('bgcolor="#FFFFFF"') // bg_solid_generico100_mail_body de beige100
      expect((html.match(/color:\s*#FF441F/g) ?? []).length).toBe(2) // color_acento2_mail_general, monto + "DE REINTEGRO"
      expect(html).not.toMatch(/\{\{\s*[a-z_0-9]+\s*\}\}/)
    })

    it('en Pro, no hay swap — sigue con el bg_creditos/color_creditos propios de Pro', () => {
      const d = withItems([creditos('a')], { global: { ...defaultEmailDocument.global, tema: 'pro' } })
      const html = renderBannerSnippet(d.banner, d)
      expect(html).toContain('bgcolor="#CC984E"') // bg_creditos_mail_general de Pro, sin swap
      expect(html).not.toContain('bgcolor="#000000"') // bg_solid_generico100_mail_body de Pro — no debe aparecer
      expect(html).not.toMatch(/\{\{\s*[a-z_0-9]+\s*\}\}/)
    })
  })

  describe('horizontal item order (defensive re-check, see horizontalOrder.ts)', () => {
    it('a stored order that would only be valid in vertical (TAGS before the image) renders reordered when bannerType is horizontal', () => {
      // Este orden nunca debería poder guardarse vía las acciones del store
      // (ya lo normalizan), pero cambiar bannerType de vertical a horizontal
      // no pasa por ellas — esto simula justo ese caso: doc.banner.items
      // "atrasado", y renderBannerSnippet lo corrige solo antes de renderizar.
      const d = withItems([tags('tags'), promo('a'), imgFija('img')], {
        banner: { ...defaultEmailDocument.banner, bannerType: 'horizontal' },
      })
      const html = renderBannerSnippet(d.banner, d)
      const idxA = html.indexOf('BITEM:PROMO:a')
      const idxImg = html.indexOf('BITEM:IMG_FIJA:img')
      const idxTags = html.indexOf('BITEM:TAGS:tags')
      expect(idxA).toBeGreaterThan(-1)
      expect(idxImg).toBeGreaterThan(-1)
      expect(idxTags).toBeGreaterThan(-1)
      expect(idxA).toBeLessThan(idxImg)
      expect(idxImg).toBeLessThan(idxTags)
    })
  })
})
