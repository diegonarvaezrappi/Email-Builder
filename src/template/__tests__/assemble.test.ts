import { describe, expect, it } from 'vitest'
import templateBaseRaw from '../../assets/templates/template_base.html?raw'
import { defaultEmailDocument } from '../../registry'
import { assembleEmailHtml } from '../assemble'
import { renderFooterSnippet } from '../../components/footer/render'
import { renderHeaderSnippet } from '../../components/header/render'
import { renderContenidosSnippet } from '../../components/contenidos/render'
import { renderBannerSnippet, stripBannerFieldAssigns } from '../../components/banner/render'
import { stripDealsFieldAssigns } from '../../components/deals/render'
import { inlineTheme } from '../../themes/inlineTheme'
import { resolveGlobalVars } from '../../global/vars'
import { elementBounds, indexOfOrThrow } from '../htmlEdits'
import { escapeHtmlAttr } from '../htmlText'
import type { CtaBlock, EmailDocument } from '../../model'

const ctaBlock = (id: string, text: string): CtaBlock => ({
  id,
  type: 'CTA',
  fields: { text, deeplink: '#', align: 'center', size: 'big' },
})

// Reimplementación INDEPENDIENTE (no importada de assemble.ts) de sus 3
// swallows de comentario/tabla — mismo criterio que el test original, que
// duplicaba los regexes de assemble.ts en vez de importarlos: si el test
// llamara a las mismas funciones que está probando, un bug ahí no se notaría.
function replaceCommentPlaceholder(html: string, anchor: string, rendered: string): string {
  const anchorIdx = indexOfOrThrow(html, anchor, 'test')
  const commentStart = html.lastIndexOf('<!--', anchorIdx)
  const commentEnd = html.indexOf('-->', anchorIdx) + 3
  return html.slice(0, commentStart) + rendered + html.slice(commentEnd)
}

function replaceContenidosWrapperInTest(html: string, rendered: string): string {
  const anchorIdx = indexOfOrThrow(html, 'WRAPPER DE CONTENIDOS', 'test')
  const commentStart = html.lastIndexOf('<!--', anchorIdx)
  const tableStart = html.indexOf('<table', anchorIdx)
  const tableBounds = elementBounds(html, tableStart + 1, 'table', 'test')
  return html.slice(0, commentStart) + rendered + html.slice(tableBounds.end)
}

function replaceFooterExampleInTest(html: string, rendered: string): string {
  const endLiteral = '{{content_blocks.${FOOTER_q1_2024_legales}}}'
  const startIdx = indexOfOrThrow(html, "{% assign cond = '' %}", 'test')
  const endIdx = html.indexOf(endLiteral, startIdx) + endLiteral.length
  return html.slice(0, startIdx) + rendered + html.slice(endIdx)
}

/** Reimplementación independiente de linkPlaceholders.ts#numberLinkPlaceholders. */
function numberLinkPlaceholdersInTest(html: string): string {
  let cta = 0
  let deal = 0
  return html
    .replace(/deeplink_cta = 'AQUIELLINKDELCTA'/g, () => `deeplink_cta = 'AQUIELLINKDELCTA${++cta}'`)
    .replace(/href="LINKDEAL"/g, () => `href="LINKDEAL${++deal}"`)
}

// Reimplementación independiente de assemble.ts#withBackgroundDecl/applySectionBackground
// — mismo criterio que el resto de este archivo (ver el comentario grande de arriba).
function withBackgroundDeclInTest(openTag: string, size: string, position: string, repeat: string): string {
  let out = openTag.replace(/background-size:\s*[^;"]+;?/, `background-size: ${size};`)
  out = out.replace(/background-position:\s*[^;"]+;?/, `background-position: ${position};`)
  return /background-repeat:\s*[^;"]+;?/.test(out)
    ? out.replace(/background-repeat:\s*[^;"]+;?/, `background-repeat: ${repeat};`)
    : out.replace(/(background-position:\s*[^;"]+;)/, `$1 background-repeat: ${repeat};`)
}

function applyFondomobileInTest(html: string, global: EmailDocument['global']): string {
  const anchorIdx = indexOfOrThrow(html, 'class="fondomobile"', 'test')
  const start = html.lastIndexOf('<td', anchorIdx)
  const end = html.indexOf('>', anchorIdx) + 1
  let openTag = withBackgroundDeclInTest(html.slice(start, end), global.fondoSize, global.fondoPosition, global.fondoRepeat)
  if (global.fondoUrl.trim() !== '') {
    openTag = openTag.slice(0, 3) + ` role="img" aria-label="${escapeHtmlAttr(global.fondoAlt)}"` + openTag.slice(3)
  }
  return html.slice(0, start) + openTag + html.slice(end)
}

function applySectionBackgroundInTest(
  html: string,
  commentAnchor: string,
  bg: { url: string; alt: string; size: string; position: string; repeat: string },
): string {
  const anchorIdx = indexOfOrThrow(html, commentAnchor, 'test')
  const start = html.indexOf('<td', anchorIdx)
  const end = html.indexOf('>', start) + 1
  let openTag = html.slice(start, end).replace(/url\([^)]*\)/, `url(${bg.url})`)
  openTag = withBackgroundDeclInTest(openTag, bg.size, bg.position, bg.repeat)
  if (bg.url.trim() !== '') {
    openTag = openTag.slice(0, 3) + ` role="img" aria-label="${escapeHtmlAttr(bg.alt)}"` + openTag.slice(3)
  }
  return html.slice(0, start) + openTag + html.slice(end)
}

describe('assembleEmailHtml', () => {
  it('replaces the FOOTER example block exactly once with the rendered footer snippet', () => {
    const html = assembleEmailHtml(defaultEmailDocument)
    const expectedSnippet = renderFooterSnippet(defaultEmailDocument.footer, defaultEmailDocument.global.tema)

    expect(html.includes(expectedSnippet)).toBe(true)
    // El ejemplo del maestro fija firma='general'; el default real de la app
    // es 'sinfirma' (footer/schema.ts) — si el ejemplo sobreviviera sin
    // reemplazar, este literal se colaría.
    expect(html).not.toContain("firma = 'general'")
  })

  it('replaces the "AQUÍ VA EL HEADER" placeholder with the rendered header snippet', () => {
    const html = assembleEmailHtml(defaultEmailDocument)
    const expectedSnippet = renderHeaderSnippet(defaultEmailDocument.header, defaultEmailDocument.global.tema)

    expect(html).not.toContain('AQUÍ VA EL HEADER')
    expect(html.includes(expectedSnippet)).toBe(true)
  })

  it('has no trace of the retired Cierre molecule (folded into Footer\'s own firma select 2026-09-07) nor its old <!-- CIERRES --> marker (removed from the master entirely 2026-09-15)', () => {
    const html = assembleEmailHtml(defaultEmailDocument)
    expect(html).not.toContain('CIERRES')
    expect(html).not.toContain('RappiFirma')
  })

  it('replaces the "AQUÍ VA EL BANNER" placeholder with the rendered banner snippet', () => {
    const html = assembleEmailHtml(defaultEmailDocument)
    const expectedSnippet = renderBannerSnippet(defaultEmailDocument.banner, defaultEmailDocument)

    expect(html).not.toContain('AQUÍ VA EL BANNER')
    expect(html.includes(expectedSnippet)).toBe(true)
    // El documento por defecto trae banner vertical + 1 tag (instrucción
    // explícita del maestro: "por defecto ... un banner vertical, con tags").
    expect(html).toContain('BANNER_VERTICAL')
    expect(html).toContain('BITEM:TAGS:')
  })

  // Desde el refactor HERO (2026-09-12) el <a> que lleva doc.banner.link ya
  // no vive dentro de cada archivo de banner (components/banner/render.ts) —
  // envuelve TODO el HERO (header + banner + imagen full width) a nivel de
  // estructura_general.html, así que la sustitución pasó a hacerse acá.
  it('replaces both AQUIELLINKDELBANNER occurrences (the <a> that wraps the whole HERO) with doc.banner.link, HTML-attribute-escaped', () => {
    const doc = { ...defaultEmailDocument, banner: { ...defaultEmailDocument.banner, link: 'https://x.test/a?b="c"' } }
    const html = assembleEmailHtml(doc)
    expect(html).not.toContain('AQUIELLINKDELBANNER')
    expect((html.match(/https:\/\/x\.test\/a\?b=&quot;c&quot;/g) ?? []).length).toBe(2)
  })

  it('replaces the WRAPPER DE CONTENIDOS placeholder (and the 480px table it introduces) with the rendered CTA blocks, joined by a single separator', () => {
    const doc = { ...defaultEmailDocument, contenidos: [ctaBlock('a', 'Uno'), ctaBlock('b', 'Dos')] }
    const html = assembleEmailHtml(doc)
    const expectedSnippet = renderContenidosSnippet(doc.contenidos, doc)

    expect(html).not.toContain('WRAPPER DE CONTENIDOS')
    expect(html.includes(expectedSnippet)).toBe(true)
    // exactamente 1 separador entre los 2 CTA, ninguno colgando al final
    const afterFirst = html.slice(html.indexOf('BLOCK:CTA:a'))
    expect(afterFirst.split('<div class="separador"></div>').length - 1).toBeGreaterThanOrEqual(1)
    expect(html.trimEnd().endsWith('<div class="separador"></div>')).toBe(false)
  })

  it('resolves a CONTENIDOS CTA\'s "default" ctaStyle via the tema, not the literal string "default" (pull 2026-09-02)', () => {
    const doc = {
      ...defaultEmailDocument,
      global: { ...defaultEmailDocument.global, tema: 'problack', ctaStyle: 'default' as const },
      contenidos: [ctaBlock('a', 'Uno')],
    }
    const html = assembleEmailHtml(doc)
    expect(html).toContain("style_Look = 'problack'")
    expect(html).not.toContain("style_Look = 'default'")
  })

  it('leaves no trace of the WRAPPER DE CONTENIDOS marker when there are no CTAs', () => {
    // defaultEmailDocument ya trae un CTA por defecto (siempre debajo del
    // banner, ver registry.ts) — se fuerza contenidos: [] acá para seguir
    // probando el caso real "0 CTAs", no un default incidental.
    const html = assembleEmailHtml({ ...defaultEmailDocument, contenidos: [] })
    expect(html).not.toContain('WRAPPER DE CONTENIDOS')
    expect(html).not.toContain('BLOCK:CTA:')
  })

  it('bakes the selected theme in, leaving no theme Liquid in the output', () => {
    const html = assembleEmailHtml({
      ...defaultEmailDocument,
      global: { ...defaultEmailDocument.global, tema: 'problack' },
    })
    // ProBlack: bg_solid #ECEFF3 y footer 'problack' — su rama propia, que el
    // maestro agregó en el pull 7f349d9 (antes caía en la de 'pro').
    expect(html).toContain('#ECEFF3')
    expect(html).toContain("{% assign font_style_look = 'problack' %}")
    // Ni el assign de entrada, ni las 11 ramas, ni referencias sin resolver.
    expect(html).not.toContain('tema_general_mail_general')
    expect(html).not.toMatch(/\{\{\s*[a-z_0-9]+_mail_general\s*\}\}/)
  })

  it('produces different colours for different themes', () => {
    const withTheme = (tema: string) =>
      assembleEmailHtml({ ...defaultEmailDocument, global: { ...defaultEmailDocument.global, tema } })
    expect(withTheme('beige100')).toContain('#FFF0DD')
    expect(withTheme('verde100')).toContain('#CBFCD9')
    expect(withTheme('beige100')).not.toContain('#CBFCD9')
  })

  it('keeps the Braze Liquid that must reach the platform', () => {
    const html = assembleEmailHtml(defaultEmailDocument)
    expect(html).toContain('{{content_blocks.${FOOTER_q1_2024_legales}}}')
    expect(html).toContain("{% assign cond = '' %}")
  })

  it('touches nothing besides the theme, the 3 background configs, the HERO link, and the HEADER/BANNER/CONTENIDOS/FOOTER anchors', () => {
    const doc = {
      ...defaultEmailDocument,
      global: { ...defaultEmailDocument.global, tema: 'beige100' },
      contenidos: [ctaBlock('a', 'Uno')],
    }
    let expected = stripDealsFieldAssigns(stripBannerFieldAssigns(inlineTheme(templateBaseRaw, resolveGlobalVars(doc.global))))
    expected = applyFondomobileInTest(expected, doc.global)
    expected = applySectionBackgroundInTest(expected, 'el background-image es reemplazable', {
      url: doc.global.heroBgUrl,
      alt: doc.global.heroBgAlt,
      size: doc.global.heroBgSize,
      position: doc.global.heroBgPosition,
      repeat: doc.global.heroBgRepeat,
    })
    expected = applySectionBackgroundInTest(expected, 'mismo fondo que el HERO', {
      url: doc.global.contentsBgUrl,
      alt: doc.global.contentsBgAlt,
      size: doc.global.contentsBgSize,
      position: doc.global.contentsBgPosition,
      repeat: doc.global.contentsBgRepeat,
    })
    // Sin link del usuario el token del HERO se conserva (no queda href="") —
    // ver template/linkPlaceholders.ts.
    expected = expected.replaceAll('AQUIELLINKDELBANNER', () =>
      escapeHtmlAttr(doc.banner.link.trim() === '' ? 'AQUIELLINKDELBANNER' : doc.banner.link),
    )
    expected = replaceCommentPlaceholder(expected, 'AQUÍ VA EL HEADER', renderHeaderSnippet(doc.header, 'beige100'))
    expected = replaceCommentPlaceholder(expected, 'AQUÍ VA EL BANNER', renderBannerSnippet(doc.banner, doc))
    expected = replaceContenidosWrapperInTest(expected, renderContenidosSnippet(doc.contenidos, doc))
    expected = replaceFooterExampleInTest(expected, renderFooterSnippet(doc.footer, 'beige100'))
    expected = numberLinkPlaceholdersInTest(expected)
    expect(assembleEmailHtml(doc)).toBe(expected)
  })

  it('strips the 5 example `banner_copy_*/banner_img_*` assigns the master leaves live (uncommented) before the doctype', () => {
    const html = assembleEmailHtml(defaultEmailDocument)
    expect(html).not.toContain('banner_copy_modulo_promo')
    expect(html).not.toContain('banner_copy_modulo_creditos')
    expect(html).not.toContain('banner_copy_modulo_textoxl')
    expect(html).not.toContain('banner_copy_modulo_textom')
    expect(html).not.toContain('banner_img_modulo_auto_ancho')
    expect(html).not.toContain('EJEMPLO DE DEFINICION DE CAMPOS PARA BANNER')
  })

  it('regression: a "$" in free text (ej. legalesAdicionales) never corrupts the export via String.replace special patterns', () => {
    const doc = {
      ...defaultEmailDocument,
      footer: { ...defaultEmailDocument.footer, legalesAdicionales: 'Promo de $& pesos' },
    }
    expect(assembleEmailHtml(doc)).toContain('Promo de $& pesos')
  })
})

describe('assembleEmailHtml · fondo personalizado', () => {
  const withFondo = (fondoUrl: string) =>
    assembleEmailHtml({ ...defaultEmailDocument, global: { ...defaultEmailDocument.global, fondoUrl } })

  it('drops the URL into the bg_imgevento_mail_general of the fondomobile td', () => {
    const url = 'https://lh3.googleusercontent.com/d/1qztlsmSfPI2eNsQ'
    expect(withFondo(url)).toContain(`background-image: url(${url})`)
  })

  it('leaves url() empty when no background is set, as it was before', () => {
    // Ningún tema asigna bg_imgevento_mail_general, así que sin fondo la
    // variable resuelve a vacío — el comportamiento histórico.
    expect(withFondo('')).toContain('background-image: url()')
  })

  it('escapes what would break out of the url(...)', () => {
    const html = withFondo('https://x.test/a(b).png')
    expect(html).toContain('background-image: url(https://x.test/a%28b%29.png)')
    expect(html).not.toContain('a(b).png')
  })

  it('accepts Liquid as the background, for a Braze content block', () => {
    expect(withFondo('{{content_blocks.${FONDO}}}')).toContain(
      'background-image: url({{content_blocks.${FONDO}}})',
    )
  })

  // El background-image del <td class="fondomobile"> no tiene un alt nativo —
  // se expone como role="img" aria-label="..." en el mismo <td>, solo cuando
  // hay imagen. Pedido explícito del usuario 2026-09-09 ("para todas las
  // imagenes que son agregadas como fondo, tambien agregales un campo ALT").
  // Se escopea al <td class="fondomobile"> puntual (no a "not.toContain
  // role=img" en TODO el documento): el doc por defecto ya trae deals con su
  // propio role="img" (productImageAlt), sin relación con este campo.
  const fondomobileTag = (html: string): string => {
    const anchor = html.indexOf('class="fondomobile"')
    const start = html.lastIndexOf('<td', anchor)
    const end = html.indexOf('>', anchor) + 1
    return html.slice(start, end)
  }

  it('exposes global.fondoAlt as role="img" aria-label="..." on the fondomobile td, only when there is a background', () => {
    const withAlt = (fondoUrl: string, fondoAlt: string) =>
      assembleEmailHtml({ ...defaultEmailDocument, global: { ...defaultEmailDocument.global, fondoUrl, fondoAlt } })

    expect(fondomobileTag(withAlt('https://x.test/a.png', 'Paisaje de la promo'))).toContain(
      'role="img" aria-label="Paisaje de la promo"',
    )

    const withoutImage = withAlt('', 'no debería aparecer')
    expect(fondomobileTag(withoutImage)).not.toContain('role="img"')
    expect(withoutImage).not.toContain('no debería aparecer')
  })

  // Tamaño/posición/repeat — pedido explícito del usuario (2026-09-16), sobre
  // los mismos 3 valores de background-size que el maestro ya soporta
  // literalmente (100% auto / 100% 100% / cover) y los 4 de background-repeat.
  it('defaults to the size/position/repeat the master already hardcodes (100% auto / center top / no-repeat)', () => {
    expect(fondomobileTag(assembleEmailHtml(defaultEmailDocument))).toBe(
      '<td class="fondomobile" width="100%" style="background-image: url(); background-size: 100% auto; background-position: center top; background-repeat: no-repeat;">',
    )
  })

  it('overrides size/position/repeat independently of the URL', () => {
    const html = assembleEmailHtml({
      ...defaultEmailDocument,
      global: {
        ...defaultEmailDocument.global,
        fondoUrl: 'https://x.test/a.png',
        fondoSize: 'cover',
        fondoPosition: 'left bottom',
        fondoRepeat: 'repeat-x',
      },
    })
    const tag = fondomobileTag(html)
    expect(tag).toContain('background-size: cover;')
    expect(tag).toContain('background-position: left bottom;')
    expect(tag).toContain('background-repeat: repeat-x;')
  })
})

describe('assembleEmailHtml · fondo de HERO-SECTION y CONTENTS-SECTION', () => {
  // Igual criterio de scoping que fondomobileTag: el <td> puntual de cada
  // sección, ubicado por el comentario que el maestro trae justo antes.
  const sectionTag = (html: string, commentAnchor: string): string => {
    const anchor = html.indexOf(`<!-- ${commentAnchor}`)
    const start = html.indexOf('<td', anchor)
    const end = html.indexOf('>', start) + 1
    return html.slice(start, end)
  }
  const heroTag = (html: string) => sectionTag(html, 'el background-image es reemplazable')
  const contentsTag = (html: string) => sectionTag(html, 'mismo fondo que el HERO')

  it('defaults to an empty URL (pedido explícito del usuario 2026-09-18) — the master\'s own placeholder is no longer the default', () => {
    const html = assembleEmailHtml(defaultEmailDocument)
    for (const tag of [heroTag(html), contentsTag(html)]) {
      expect(tag).toContain('background-image: url();')
      expect(tag).not.toContain('role="img"')
      // El tamaño/posición/repeat siguen igualando lo que el maestro ya
      // hardcodeaba, solo cambió el default de la URL.
      expect(tag).toContain('background-size: 100% auto;')
      expect(tag).toContain('background-position: center top;')
      expect(tag).toContain('background-repeat: repeat;')
    }
  })

  it('can still be set to the master\'s own placeholder image by hand', () => {
    const placeholderUrl = 'https://lh3.googleusercontent.com/d/1neHPofSevbcNLyO2pymbZk6QHZSrJO5-'
    const html = assembleEmailHtml({
      ...defaultEmailDocument,
      global: { ...defaultEmailDocument.global, heroBgUrl: placeholderUrl, contentsBgUrl: placeholderUrl },
    })
    expect(heroTag(html)).toContain(`background-image: url(${placeholderUrl})`)
    expect(contentsTag(html)).toContain(`background-image: url(${placeholderUrl})`)
  })

  it('lets HERO and CONTENTS diverge independently from each other', () => {
    const html = assembleEmailHtml({
      ...defaultEmailDocument,
      global: {
        ...defaultEmailDocument.global,
        heroBgUrl: 'https://x.test/hero.png',
        heroBgSize: 'cover',
        heroBgPosition: 'left top',
        heroBgRepeat: 'no-repeat',
        heroBgAlt: 'Fondo del hero',
        contentsBgUrl: 'https://x.test/contents.png',
        contentsBgSize: '100% 100%',
        contentsBgPosition: 'right bottom',
        contentsBgRepeat: 'repeat-y',
        contentsBgAlt: 'Fondo de contenidos',
      },
    })

    const hero = heroTag(html)
    expect(hero).toContain('background-image: url(https://x.test/hero.png)')
    expect(hero).toContain('background-size: cover;')
    expect(hero).toContain('background-position: left top;')
    expect(hero).toContain('background-repeat: no-repeat;')
    expect(hero).toContain('role="img" aria-label="Fondo del hero"')

    const contents = contentsTag(html)
    expect(contents).toContain('background-image: url(https://x.test/contents.png)')
    expect(contents).toContain('background-size: 100% 100%;')
    expect(contents).toContain('background-position: right bottom;')
    expect(contents).toContain('background-repeat: repeat-y;')
    expect(contents).toContain('role="img" aria-label="Fondo de contenidos"')
  })

  it('removes the background entirely (empty url(), no alt) when the URL is cleared, same convention as fondoUrl', () => {
    const html = assembleEmailHtml({
      ...defaultEmailDocument,
      global: { ...defaultEmailDocument.global, heroBgUrl: '', contentsBgUrl: '' },
    })
    expect(heroTag(html)).toContain('background-image: url();')
    expect(heroTag(html)).not.toContain('role="img"')
    expect(contentsTag(html)).toContain('background-image: url();')
    expect(contentsTag(html)).not.toContain('role="img"')
  })

  it('escapes what would break out of the url(...), same as fondoUrl', () => {
    const html = assembleEmailHtml({
      ...defaultEmailDocument,
      global: { ...defaultEmailDocument.global, heroBgUrl: 'https://x.test/a(b).png' },
    })
    expect(heroTag(html)).toContain('background-image: url(https://x.test/a%28b%29.png)')
  })
})

// Regla del propio maestro (_contenidos_wrapper.html, citada literal en
// template/linkPlaceholders.ts): un link sin valor no se exporta como
// href="", sale con el nombre del módulo y numerado, para que en la
// implementación encuentren los espacios. El maestro no la cumple (LINKDEAL
// ×2, deeplink_cta 'AQUIELLINK#' ×6) y no se toca, así que se resuelve acá.
describe('assembleEmailHtml · marcadores de link (banner · CTA · deals)', () => {
  const dealsDoc = (): EmailDocument => ({
    ...defaultEmailDocument,
    contenidos: [ctaBlock('a', 'Uno'), ctaBlock('b', 'Dos')].map((b) => ({
      ...b,
      fields: { ...b.fields, deeplink: '' },
    })) as EmailDocument['contenidos'],
  })

  it('keeps AQUIELLINKDELBANNER on the HERO <a> when the banner has no link, instead of href=""', () => {
    const html = assembleEmailHtml(defaultEmailDocument)
    expect(html).toContain('href="AQUIELLINKDELBANNER"')
    // Las 2 ocurrencias del maestro (href + originalsrc) siguen ahí.
    expect(html.split('AQUIELLINKDELBANNER').length - 1).toBe(2)
  })

  it('still uses the real link when the banner has one', () => {
    const html = assembleEmailHtml({
      ...defaultEmailDocument,
      banner: { ...defaultEmailDocument.banner, link: 'https://rappi.test/promo' },
    })
    expect(html).toContain('href="https://rappi.test/promo"')
    expect(html).not.toContain('AQUIELLINKDELBANNER')
  })

  it('numbers every CTA without a link, in order of appearance', () => {
    const html = assembleEmailHtml(dealsDoc())
    expect(html).toContain("{% assign deeplink_cta = 'AQUIELLINKDELCTA1' %}")
    expect(html).toContain("{% assign deeplink_cta = 'AQUIELLINKDELCTA2' %}")
    // Sin marcador "crudo" sin numerar, ni el href="" de antes.
    expect(html).not.toContain("deeplink_cta = 'AQUIELLINKDELCTA'")
    expect(html).not.toContain("deeplink_cta = '' ")
    expect(html.indexOf('AQUIELLINKDELCTA1')).toBeLessThan(html.indexOf('AQUIELLINKDELCTA2'))
  })

  it('leaves a CTA that does have a link untouched, and does not spend a number on it', () => {
    const doc = {
      ...defaultEmailDocument,
      contenidos: [
        { ...ctaBlock('a', 'Uno'), fields: { ...ctaBlock('a', 'Uno').fields, deeplink: 'https://rappi.test/a' } },
        { ...ctaBlock('b', 'Dos'), fields: { ...ctaBlock('b', 'Dos').fields, deeplink: '' } },
      ],
    } as EmailDocument
    const html = assembleEmailHtml(doc)
    expect(html).toContain("{% assign deeplink_cta = 'https://rappi.test/a' %}")
    // El único CTA sin link es el 1º que necesita marcador, así que va el 1.
    expect(html).toContain("{% assign deeplink_cta = 'AQUIELLINKDELCTA1' %}")
    expect(html).not.toContain('AQUIELLINKDELCTA2')
  })

  it('numbers every deal card without a link (LINKDEAL1, LINKDEAL2, …) in order of appearance', () => {
    // El documento por defecto trae 3 filas de 2 tarjetas, todas sin link.
    const html = assembleEmailHtml(defaultEmailDocument)
    for (let n = 1; n <= 6; n++) {
      expect(html).toContain(`href="LINKDEAL${n}"`)
    }
    expect(html).not.toContain('href="LINKDEAL"')
    expect(html.indexOf('LINKDEAL1')).toBeLessThan(html.indexOf('LINKDEAL2'))
  })

  // Inmutable a propósito: las 6 tarjetas del documento por defecto comparten
  // el MISMO objeto `fields` (defaultDealCardFields, reusado por referencia en
  // registry.ts), así que mutar una en sitio las cambiaría las 6.
  const withFirstDealLink = (link: string): EmailDocument => {
    let patched = false
    return {
      ...defaultEmailDocument,
      contenidos: defaultEmailDocument.contenidos.map((block) => {
        if (block.type !== 'DEALS' || patched) return block
        patched = true
        return {
          ...block,
          fields: {
            ...block.fields,
            items: block.fields.items.map((card, i) => (i === 0 ? { ...card, fields: { ...card.fields, link } } : card)),
          },
        }
      }),
    }
  }

  it('never invents a placeholder for a link the user actually typed', () => {
    const html = assembleEmailHtml(withFirstDealLink('https://rappi.test/deal'))
    expect(html).toContain('href="https://rappi.test/deal"')
    // Quedan 5 tarjetas sin link: se numeran 1..5, sin gastar un número en la
    // que sí lo tiene.
    expect(html).toContain('href="LINKDEAL1"')
    expect(html).toContain('href="LINKDEAL5"')
    expect(html).not.toContain('href="LINKDEAL6"')
  })

  it('does not renumber a real link that happens to contain the literal token', () => {
    const html = assembleEmailHtml(withFirstDealLink('https://rappi.test/LINKDEAL/promo'))
    expect(html).toContain('href="https://rappi.test/LINKDEAL/promo"')
  })
})

it('never carries the preview-only dark-client filter — that is view-only, in preview/liquidPreview.ts', () => {
  // El HTML exportado (lo que se copia/descarga/manda a Braze) no tiene
  // ningún concepto de "simular cliente oscuro" — eso es puramente del
  // preview del navegador. No debe existir una manera de que ese filtro se
  // cuele acá, sin importar el tema o el fondo elegidos.
  const html = assembleEmailHtml({
    ...defaultEmailDocument,
    global: { ...defaultEmailDocument.global, tema: 'problack', fondoUrl: 'https://x.test/a.png' },
  })
  expect(html).not.toContain('filter:')
  expect(html).not.toContain('invert(')
})

describe('assembleEmailHtml · tropicalización de slots', () => {
  it('HEADER tropicalizado envuelve el snippet en {% if %}...{% else %}, una sola vez, con la base en el {% else %}', () => {
    const doc: EmailDocument = {
      ...defaultEmailDocument,
      tropicalizations: { 'slot:HEADER': { branches: [{ countries: ['AR'], hidden: false, overrides: {} }] } },
    }
    const html = assembleEmailHtml(doc)
    expect(html.match(/\{% if \$\{user_id\} contains 'AR' %\}/g)).toHaveLength(1)
    expect(html).toContain('{% else %}')
    expect(html).toContain('{% endif %}')
  })

  it('CONTENIDOS no se tropicaliza como slot (cada bloque tiene su propia clave block:<id>)', () => {
    // Una clave slot:CONTENIDOS no existe (parseTargetKey la rechaza), pero
    // aunque alguien la escribiera a mano el render de CONTENIDOS jamás la
    // consulta — confirmamos que el array de bloques sale intacto.
    const doc = { ...defaultEmailDocument, tropicalizations: {} }
    expect(assembleEmailHtml(doc)).toBe(assembleEmailHtml(defaultEmailDocument))
  })

  it('FOOTER tropicalizado con una rama que cambia tipoFooter deja las 2 referencias de content block presentes, ambas resolubles por el preview', () => {
    const doc: EmailDocument = {
      ...defaultEmailDocument,
      tropicalizations: {
        'slot:FOOTER': {
          branches: [{ countries: ['BR'], hidden: false, overrides: { tipoFooter: 'RTS' } }],
        },
      },
    }
    const html = assembleEmailHtml(doc)
    expect(html).toContain('FOOTER_q1_2024_legales') // base (General)
    expect(html).toContain('FOOTER_RTS_q3_2024_legales') // rama BR
  })

  it('sin ramas emitibles, el documento es byte a byte idéntico al de no tropicalizar', () => {
    const withEmpty = {
      ...defaultEmailDocument,
      tropicalizations: { 'slot:HEADER': { branches: [{ countries: [], hidden: false, overrides: {} }] } },
    }
    expect(assembleEmailHtml(withEmpty)).toBe(assembleEmailHtml(defaultEmailDocument))
  })
})
