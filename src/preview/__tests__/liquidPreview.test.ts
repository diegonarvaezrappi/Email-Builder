import { describe, expect, it } from 'vitest'
import { defaultFooterFields } from '../../components/footer/schema'
import { preprocessBrazeShorthand, renderFooterPreview } from '../liquidPreview'
import { defaultGlobalFields } from '../../global/schema'

/** GlobalFields con el tema indicado (y el resto por defecto). */
const g = (tema: string, fondoUrl = '') => ({ ...defaultGlobalFields, tema, fondoUrl })

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

describe('renderFooterPreview', () => {
  it('resolves real, visible legal copy for General/CO with no Liquid left over', async () => {
    const result = await renderFooterPreview({ ...defaultFooterFields, tipoFooter: 'General' }, 'CO', g('beige100'))
    expect(result.error).toBeUndefined()
    expect(result.html).toContain('Centro de ayuda')
    expect(result.html).toContain('RAPPI S.A.S.')
    expect(result.html).not.toMatch(/\{%|\{\{/)
  })

  it('resolves country-specific copy for a different country (BR)', async () => {
    const result = await renderFooterPreview({ ...defaultFooterFields, tipoFooter: 'General' }, 'BR', g('beige100'))
    expect(result.error).toBeUndefined()
    expect(result.html).toContain('Rappi Brasil Intermediação de Negócios')
  })

  it('resolves the RTS variant without throwing', async () => {
    const result = await renderFooterPreview({ ...defaultFooterFields, tipoFooter: 'RTS' }, 'MX', g('beige100'))
    expect(result.error).toBeUndefined()
    expect(result.html.length).toBeGreaterThan(0)
  })

  it('resolves the RTS variant for BR (exercises the {{${x}}} if-condition convention)', async () => {
    const result = await renderFooterPreview({ ...defaultFooterFields, tipoFooter: 'RTS' }, 'BR', g('beige100'))
    expect(result.error).toBeUndefined()
    expect(result.html).not.toMatch(/\{%|\{\{/)
  })

  it('resolves the SinAmor variant without throwing', async () => {
    const result = await renderFooterPreview({ ...defaultFooterFields, tipoFooter: 'SinAmor' }, 'AR', g('beige100'))
    expect(result.error).toBeUndefined()
    expect(result.html.length).toBeGreaterThan(0)
  })

  it('reflects "Legales adicionales" text inside the rendered preview', async () => {
    const result = await renderFooterPreview(
      { ...defaultFooterFields, tipoFooter: 'General', legalesAdicionales: 'Promo exclusiva de prueba' },
      'CO',
      g('beige100')
    )
    expect(result.html).toContain('Promo exclusiva de prueba')
  })

  it('picks up the pro footer styling from a Pro/ProBlack theme', async () => {
    // El content block solo entra a su rama 'pro' si font_style_look llegó
    // resuelto — es la comprobación de que el tema atraviesa hasta el preview.
    const [negro, pro] = await Promise.all([
      renderFooterPreview({ ...defaultFooterFields, tipoFooter: 'General' }, 'CO', g('beige100')),
      renderFooterPreview({ ...defaultFooterFields, tipoFooter: 'General' }, 'CO', g('problack')),
    ])
    expect(negro.error).toBeUndefined()
    expect(pro.error).toBeUndefined()
    expect(pro.html).not.toBe(negro.html)
  })

  // Se mira solo la regla `body` de la superficie (la que lleva el fondo): el
  // content block del footer trae sus propios background-image, y el reset
  // `html,body{margin:0;padding:0}` también empareja un `body{...}`.
  const surfaceRule = (html: string) =>
    (html.match(/body\{[^}]*\}/g) ?? []).find((rule) => rule.includes('background-color')) ?? ''

  it('paints the custom background on the preview surface', async () => {
    // El footer va dentro del <td class="fondomobile"> del maestro, así que el
    // fondo se ve detrás de él — el preview usa las mismas propiedades.
    const url = 'https://x.test/fondo.png'
    const result = await renderFooterPreview(defaultFooterFields, 'CO', g('beige100', url))
    expect(result.error).toBeUndefined()
    expect(surfaceRule(result.html)).toContain(`background-image:url(${url})`)
    expect(surfaceRule(result.html)).toContain('background-size:100% auto')
  })

  it('paints no background image when none is set', async () => {
    const result = await renderFooterPreview(defaultFooterFields, 'CO', g('beige100'))
    expect(surfaceRule(result.html)).toContain('background-color:#FFF0DD')
    expect(surfaceRule(result.html)).not.toContain('background-image')
  })

  it('never carries the client dark-mode simulation — that lives as a CSS class on the <iframe>', async () => {
    // La simulación de cliente Claro/Oscuro (ui/Viewport.tsx) es un filter en
    // el <iframe> mismo, no algo que este HTML deba conocer o generar — un
    // filter puesto DENTRO de este documento no se pinta en Chromium
    // (verificado con capturas), así que este módulo ni lo intenta.
    const result = await renderFooterPreview(defaultFooterFields, 'CO', g('beige100'))
    expect(result.html).not.toContain('filter:')
  })
})
