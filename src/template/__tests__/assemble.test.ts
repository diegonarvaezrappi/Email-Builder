import { describe, expect, it } from 'vitest'
import templateBaseRaw from '../../assets/templates/template_base.html?raw'
import { defaultEmailDocument } from '../../registry'
import { assembleEmailHtml } from '../assemble'
import { renderFooterSnippet } from '../../components/footer/render'
import { renderHeaderSnippet } from '../../components/header/render'
import { inlineTheme } from '../../themes/inlineTheme'
import { resolveGlobalVars } from '../../global/vars'

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

  it('leaves the other slots (not yet implemented) untouched', () => {
    // Desde la reestructuración a estructura_general.html estos ya no son
    // marcadores simples `<!-- X -->` (ese trato quedó solo para FOOTER, el
    // único implementado) sino comentarios de instrucciones en prosa — ver
    // la nota grande en scripts/sync-master.mjs.
    const html = assembleEmailHtml(defaultEmailDocument)
    for (const marker of [
      '<!-- BANNER : por defecto el template debe tener un banner vertical, con tags  -->',
      '<!-- WRAPPER DE CONTENIDOS:',
      '<!-- CIERRES -->',
    ]) {
      expect(html).toContain(marker)
    }
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

  it('touches nothing besides the theme, the HEADER marker and the FOOTER marker', () => {
    const doc = { ...defaultEmailDocument, global: { ...defaultEmailDocument.global, tema: 'problack' } }
    const expected = inlineTheme(templateBaseRaw, resolveGlobalVars(doc.global))
      .replace(/<!--\s*HEADER WRAPPER[\s\S]*?CIERRE HEADER WRAPPER\s*-->/, renderHeaderSnippet(doc.header, 'problack'))
      .replace('<!-- FOOTER -->', renderFooterSnippet(doc.footer, 'problack'))
    expect(assembleEmailHtml(doc)).toBe(expected)
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
    global: { tema: 'problack', fondoUrl: 'https://x.test/a.png' },
  })
  expect(html).not.toContain('filter:')
  expect(html).not.toContain('invert(')
})
