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
    // ProBlack: bg_solid #ECEFF3 y footer 'pro'.
    expect(html).toContain('#ECEFF3')
    expect(html).toContain("{% assign font_style_look = 'pro' %}")
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

  it('touches nothing besides the theme, the HERO link, and the HEADER/BANNER/CONTENIDOS/FOOTER anchors', () => {
    const doc = {
      ...defaultEmailDocument,
      global: { ...defaultEmailDocument.global, tema: 'beige100' },
      contenidos: [ctaBlock('a', 'Uno')],
    }
    let expected = stripDealsFieldAssigns(stripBannerFieldAssigns(inlineTheme(templateBaseRaw, resolveGlobalVars(doc.global))))
    expected = expected.replaceAll('AQUIELLINKDELBANNER', () => escapeHtmlAttr(doc.banner.link))
    expected = replaceCommentPlaceholder(expected, 'AQUÍ VA EL HEADER', renderHeaderSnippet(doc.header, 'beige100'))
    expected = replaceCommentPlaceholder(expected, 'AQUÍ VA EL BANNER', renderBannerSnippet(doc.banner, doc))
    expected = replaceContenidosWrapperInTest(expected, renderContenidosSnippet(doc.contenidos, doc))
    expected = replaceFooterExampleInTest(expected, renderFooterSnippet(doc.footer, 'beige100'))
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
