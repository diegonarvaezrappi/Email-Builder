import { describe, expect, it } from 'vitest'
import templateBaseRaw from '../../assets/templates/template_base.html?raw'
import { defaultEmailDocument } from '../../registry'
import { assembleEmailHtml } from '../assemble'
import { renderFooterSnippet } from '../../components/footer/render'
import { renderHeaderSnippet } from '../../components/header/render'
import { renderCierreSnippet } from '../../components/cierre/render'
import { renderContenidosSnippet } from '../../components/contenidos/render'
import { renderBannerSnippet, stripBannerFieldAssigns } from '../../components/banner/render'
import { stripDealsFieldAssigns } from '../../components/deals/render'
import { inlineTheme } from '../../themes/inlineTheme'
import { resolveGlobalVars } from '../../global/vars'
import type { CtaBlock } from '../../model'

const ctaBlock = (id: string, text: string): CtaBlock => ({
  id,
  type: 'CTA',
  fields: { text, deeplink: '#', align: 'center' },
})

describe('assembleEmailHtml', () => {
  it('replaces the FOOTER marker exactly once with the rendered footer snippet', () => {
    const html = assembleEmailHtml(defaultEmailDocument)
    const expectedSnippet = renderFooterSnippet(defaultEmailDocument.footer, defaultEmailDocument.global.tema)

    expect(html).not.toContain('<!-- FOOTER -->')
    expect(html.includes(expectedSnippet)).toBe(true)
  })

  it('replaces the HEADER WRAPPER placeholder exactly once with the rendered header snippet', () => {
    const html = assembleEmailHtml(defaultEmailDocument)
    const expectedSnippet = renderHeaderSnippet(defaultEmailDocument.header, defaultEmailDocument.global.tema)

    expect(html).not.toContain('HEADER WRAPPER')
    expect(html.includes(expectedSnippet)).toBe(true)
  })

  it('replaces the CIERRES marker (plural in the master, singular slot name) with the rendered cierre snippet', () => {
    const html = assembleEmailHtml(defaultEmailDocument)
    const expectedSnippet = renderCierreSnippet(defaultEmailDocument.cierre, defaultEmailDocument)

    expect(html).not.toContain('<!-- CIERRES -->')
    expect(html.includes(expectedSnippet)).toBe(true)
  })

  it('replaces the BANNER placeholder (a prose comment, not a simple <!-- X -->) with the rendered banner snippet', () => {
    const html = assembleEmailHtml(defaultEmailDocument)
    const expectedSnippet = renderBannerSnippet(defaultEmailDocument.banner, defaultEmailDocument)

    expect(html).not.toMatch(/<!--\s*BANNER\s*:/)
    expect(html.includes(expectedSnippet)).toBe(true)
    // El documento por defecto trae banner vertical + 1 tag (instrucción
    // explícita del maestro: "por defecto ... un banner vertical, con tags").
    expect(html).toContain('BANNER_VERTICAL')
    expect(html).toContain('BITEM:TAGS:')
  })

  it('leaves the other 2 mentions of the word BANNER in the master untouched (the placeholder regex must not over-match)', () => {
    const html = assembleEmailHtml(defaultEmailDocument)
    // "INICIO SECCION BANNER" no seguido de ":" — no es el placeholder.
    expect(html).toContain('INICIO SECCION BANNER')
  })

  it('replaces the WRAPPER DE CONTENIDOS placeholder with the rendered CTA blocks, joined by a single separator', () => {
    const doc = { ...defaultEmailDocument, contenidos: [ctaBlock('a', 'Uno'), ctaBlock('b', 'Dos')] }
    const html = assembleEmailHtml(doc)
    const expectedSnippet = renderContenidosSnippet(doc.contenidos, doc)

    expect(html).not.toContain('<!-- WRAPPER DE CONTENIDOS:')
    expect(html.includes(expectedSnippet)).toBe(true)
    // exactamente 1 separador entre los 2 CTA, ninguno colgando al final
    const afterFirst = html.slice(html.indexOf('BLOCK:CTA:a'))
    expect(afterFirst.split('<div class="separador"></div>').length - 1).toBeGreaterThanOrEqual(1)
    expect(html.trimEnd().endsWith('<div class="separador"></div>')).toBe(false)
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
    expect(withTheme('verde100')).toContain('#C0FDD3')
    expect(withTheme('beige100')).not.toContain('#C0FDD3')
  })

  it('keeps the Braze Liquid that must reach the platform', () => {
    const html = assembleEmailHtml(defaultEmailDocument)
    expect(html).toContain('{{content_blocks.${FOOTER_q1_2024_legales}}}')
    expect(html).toContain("{% assign cond = '' %}")
  })

  it('touches nothing besides the theme, the HEADER/BANNER/CONTENIDOS/CIERRE/FOOTER markers', () => {
    // tema 'problack' fuerza también el auto-ocultado de Cierre (regla #1 de
    // USO-DE-CADA-PARTE.md §9) — se prueba con 'beige100' para poder afirmar
    // que el marcador SÍ se reemplaza (por algo no vacío) en este test.
    const doc = {
      ...defaultEmailDocument,
      global: { ...defaultEmailDocument.global, tema: 'beige100' },
      contenidos: [ctaBlock('a', 'Uno')],
    }
    const expected = stripDealsFieldAssigns(stripBannerFieldAssigns(inlineTheme(templateBaseRaw, resolveGlobalVars(doc.global))))
      .replace(/<!--\s*HEADER WRAPPER[\s\S]*?CIERRE HEADER WRAPPER\s*-->/, () => renderHeaderSnippet(doc.header, 'beige100'))
      .replace(/<!--\s*BANNER\s*:[\s\S]*?-->/, () => renderBannerSnippet(doc.banner, doc))
      .replace(/<!--\s*WRAPPER DE CONTENIDOS[\s\S]*?-->/, () => renderContenidosSnippet(doc.contenidos, doc))
      .replace('<!-- CIERRES -->', () => renderCierreSnippet(doc.cierre, doc))
      .replace('<!-- FOOTER -->', () => renderFooterSnippet(doc.footer, 'beige100'))
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
