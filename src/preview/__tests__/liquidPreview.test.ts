import { describe, expect, it } from 'vitest'
import { defaultEmailDocument } from '../../registry'
import type { CtaBlock, EmailDocument } from '../../model'
import type { TipoFooter } from '../../components/footer/schema'
import { CTA_CONTENT_BLOCK_NAME } from '../../components/cta/render'
import {
  inlineCtaContentBlock,
  inlineFooterContentBlock,
  preprocessBrazeShorthand,
  renderEmailPreview,
} from '../liquidPreview'

/** El documento por defecto con el tema / footer / header que pida el test. */
const d = (over: Partial<EmailDocument> = {}): EmailDocument => ({ ...defaultEmailDocument, ...over })
const withTema = (tema: string, fondoUrl = '') => d({ global: { ...defaultEmailDocument.global, tema, fondoUrl } })
const withFooter = (tipoFooter: TipoFooter, over: Partial<EmailDocument['footer']> = {}) =>
  d({ footer: { ...defaultEmailDocument.footer, tipoFooter, ...over } })

const ctaBlock = (id: string, text: string): CtaBlock => ({ id, type: 'CTA', fields: { text, deeplink: '#', align: 'center' } })

describe('preprocessBrazeShorthand', () => {
  it('converts a bare ${x} inside a tag expression into a plain variable', () => {
    expect(preprocessBrazeShorthand("{% if ${user_id} contains 'BR' %}")).toBe("{% if user_id contains 'BR' %}")
  })

  it('stubs a dotted accessor with ${NAME} to a quoted placeholder', () => {
    expect(preprocessBrazeShorthand('{{preference_center.${EMAIL_PREFERENCE_CENTER_CO}}}')).toBe('{{"#"}}')
  })

  it('converts a bare ${x} with no dot inside an output tag into a plain variable', () => {
    expect(preprocessBrazeShorthand('{{${set_user_to_unsubscribed_url}}}')).toBe('{{set_user_to_unsubscribed_url}}')
  })

  it('fully collapses {{${x}}} used as an if-condition (footer_rts.html convention) into a plain variable', () => {
    expect(preprocessBrazeShorthand("{% if {{${user_id}}} contains 'BR' %}")).toBe("{% if user_id contains 'BR' %}")
  })

  it('collapses the {{$x}} (no inner brace) authoring bug into a plain variable', () => {
    expect(preprocessBrazeShorthand('{% assign legal_liquor_img = {{$imgchile}} %}')).toBe(
      '{% assign legal_liquor_img = imgchile %}',
    )
  })
})

describe('inlineFooterContentBlock', () => {
  it('swaps the opaque content block reference for its real body', () => {
    const out = inlineFooterContentBlock('antes {{content_blocks.${FOOTER_q1_2024_legales}}} después', 'General')
    expect(out).not.toContain('content_blocks')
    expect(out).toContain('antes ')
    expect(out).toContain(' después')
    expect(out).toContain('STYLE LOOK')
  })

  it('must run before preprocessBrazeShorthand, which would otherwise stub the reference away', () => {
    // Documenta el orden: preprocess convierte cualquier `algo.${...}` en "#",
    // así que invertirlo borraría el footer del preview.
    const reference = '{{content_blocks.${FOOTER_q1_2024_legales}}}'
    expect(preprocessBrazeShorthand(reference)).toBe('{{"#"}}')
    expect(inlineFooterContentBlock(reference, 'General').length).toBeGreaterThan(1000)
  })
})

describe('inlineCtaContentBlock', () => {
  const reference = `{{content_blocks.\${${CTA_CONTENT_BLOCK_NAME}}}}`

  it('swaps the opaque content block reference for its real body', () => {
    const out = inlineCtaContentBlock(`antes ${reference} después`)
    expect(out).not.toContain('content_blocks')
    expect(out).toContain('antes ')
    expect(out).toContain(' después')
    expect(out).toContain('Botón CTA')
  })

  it('replaces ALL occurrences, not just the first — a mail can have 0 a N CTAs', () => {
    const out = inlineCtaContentBlock(`uno: ${reference} dos: ${reference} tres: ${reference}`)
    expect(out).not.toContain('content_blocks')
    expect(out.split('Botón CTA').length - 1).toBeGreaterThanOrEqual(3)
  })

  it('is immune to preprocessBrazeShorthand stubbing either way — unlike Footer, "CTA-template" has a hyphen', () => {
    // Las regexes de preprocessBrazeShorthand usan \w* (sin guion), así que
    // nunca matchean `${CTA-template}` — la referencia queda intacta la toque
    // antes o después de esa función (a diferencia de Footer, cuyo nombre de
    // content block SÍ calza y se stubea a "#" si el orden se invirtiera).
    expect(preprocessBrazeShorthand(reference)).toBe(reference)
    expect(inlineCtaContentBlock(reference).length).toBeGreaterThan(1000)
  })
})

describe('renderEmailPreview', () => {
  it('resolves real, visible legal copy for General/CO with no Liquid left over', async () => {
    const result = await renderEmailPreview(withFooter('General'), 'CO')
    expect(result.error).toBeUndefined()
    expect(result.html).toContain('Centro de ayuda')
    expect(result.html).toContain('RAPPI S.A.S.')
    expect(result.html).not.toMatch(/\{%|\{\{/)
  })

  it('resolves country-specific copy for a different country (BR)', async () => {
    const result = await renderEmailPreview(withFooter('General'), 'BR')
    expect(result.error).toBeUndefined()
    expect(result.html).toContain('Rappi Brasil Intermediação de Negócios')
  })

  it('resolves the RTS variant without throwing', async () => {
    const result = await renderEmailPreview(withFooter('RTS'), 'MX')
    expect(result.error).toBeUndefined()
    expect(result.html.length).toBeGreaterThan(0)
  })

  it('resolves the RTS variant for BR (exercises the {{${x}}} if-condition convention)', async () => {
    const result = await renderEmailPreview(withFooter('RTS'), 'BR')
    expect(result.error).toBeUndefined()
    expect(result.html).not.toMatch(/\{%|\{\{/)
  })

  it('resolves the SinAmor variant without throwing', async () => {
    const result = await renderEmailPreview(withFooter('SinAmor'), 'AR')
    expect(result.error).toBeUndefined()
    expect(result.html.length).toBeGreaterThan(0)
  })

  it('reflects "Legales adicionales" text inside the rendered preview', async () => {
    const result = await renderEmailPreview(
      withFooter('General', { legalesAdicionales: 'Promo exclusiva de prueba' }),
      'CO',
    )
    expect(result.html).toContain('Promo exclusiva de prueba')
  })

  it('picks up the pro footer styling from a Pro/ProBlack theme', async () => {
    // El content block solo entra a su rama 'pro' si font_style_look llegó
    // resuelto — es la comprobación de que el tema atraviesa hasta el preview.
    const [negro, pro] = await Promise.all([
      renderEmailPreview(withTema('beige100'), 'CO'),
      renderEmailPreview(withTema('problack'), 'CO'),
    ])
    expect(negro.error).toBeUndefined()
    expect(pro.error).toBeUndefined()
    expect(pro.html).not.toBe(negro.html)
  })

  it('renders the header in the same document as the footer', async () => {
    // El preview es UN documento, no un bloque por componente: el header tiene
    // que venir dentro del mismo HTML que los legales.
    const result = await renderEmailPreview(d(), 'CO')
    expect(result.html).toMatch(/id="HEADER\d"/)
    expect(result.html).toContain('Centro de ayuda')
  })

  it('keeps the mail\'s own full-width wrapper and 600px content column', async () => {
    // Es lo que hace que el preview se vea como en Gmail (fondo a todo lo
    // ancho, contenido centrado) — sale del maestro, no de CSS de la app.
    const result = await renderEmailPreview(d(), 'CO')
    expect(result.html).toContain('role="content-container"')
    expect(result.html).toContain('max-width:600px')
  })

  it('bakes the theme background into the preview, with no app-injected surface', async () => {
    const result = await renderEmailPreview(withTema('beige100'), 'CO')
    expect(result.html).toContain('#FFF0DD')
    // El preview ya no envuelve nada en una superficie propia: no hay un
    // `body{background-color:…}` agregado por la app.
    expect(result.html).not.toMatch(/body\{background-color/)
  })

  it('paints the custom background through the mail\'s own fondomobile cell', async () => {
    const url = 'https://x.test/fondo.png'
    const result = await renderEmailPreview(withTema('beige100', url), 'CO')
    expect(result.error).toBeUndefined()
    expect(result.html).toContain(`background-image: url(${url})`)
  })

  it('resolves multiple CTA instances in the same preview, each with its own text', async () => {
    const result = await renderEmailPreview(
      d({ contenidos: [ctaBlock('a', 'Primer CTA'), ctaBlock('b', 'Segundo CTA')] }),
      'CO',
    )
    expect(result.error).toBeUndefined()
    expect(result.html).toContain('Primer CTA')
    expect(result.html).toContain('Segundo CTA')
    expect(result.html).not.toMatch(/\{%|\{\{/)
  })

  it('never carries the client dark-mode simulation — that is injected into the iframe DOM at runtime', async () => {
    // La simulación de cliente Claro/Oscuro la agrega ui/Viewport.tsx como un
    // <style> en el DOM del iframe, no este módulo: lo que sale de acá es el
    // HTML del mail y nada más.
    const result = await renderEmailPreview(d(), 'CO')
    expect(result.html).not.toContain('filter:')
    expect(result.html).not.toContain('invert(')
  })
})
