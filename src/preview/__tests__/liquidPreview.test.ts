import { describe, expect, it } from 'vitest'
import { defaultFooterFields } from '../../components/footer/schema'
import { preprocessBrazeShorthand, renderFooterPreview } from '../liquidPreview'

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
    const result = await renderFooterPreview({ ...defaultFooterFields, tipoFooter: 'General' }, 'CO', 'beige100')
    expect(result.error).toBeUndefined()
    expect(result.html).toContain('Centro de ayuda')
    expect(result.html).toContain('RAPPI S.A.S.')
    expect(result.html).not.toMatch(/\{%|\{\{/)
  })

  it('resolves country-specific copy for a different country (BR)', async () => {
    const result = await renderFooterPreview({ ...defaultFooterFields, tipoFooter: 'General' }, 'BR', 'beige100')
    expect(result.error).toBeUndefined()
    expect(result.html).toContain('Rappi Brasil Intermediação de Negócios')
  })

  it('resolves the RTS variant without throwing', async () => {
    const result = await renderFooterPreview({ ...defaultFooterFields, tipoFooter: 'RTS' }, 'MX', 'beige100')
    expect(result.error).toBeUndefined()
    expect(result.html.length).toBeGreaterThan(0)
  })

  it('resolves the RTS variant for BR (exercises the {{${x}}} if-condition convention)', async () => {
    const result = await renderFooterPreview({ ...defaultFooterFields, tipoFooter: 'RTS' }, 'BR', 'beige100')
    expect(result.error).toBeUndefined()
    expect(result.html).not.toMatch(/\{%|\{\{/)
  })

  it('resolves the SinAmor variant without throwing', async () => {
    const result = await renderFooterPreview({ ...defaultFooterFields, tipoFooter: 'SinAmor' }, 'AR', 'beige100')
    expect(result.error).toBeUndefined()
    expect(result.html.length).toBeGreaterThan(0)
  })

  it('reflects "Legales adicionales" text inside the rendered preview', async () => {
    const result = await renderFooterPreview(
      { ...defaultFooterFields, tipoFooter: 'General', legalesAdicionales: 'Promo exclusiva de prueba' },
      'CO',
      'beige100',
    )
    expect(result.html).toContain('Promo exclusiva de prueba')
  })

  it('picks up the pro footer styling from a Pro/ProBlack theme', async () => {
    // El content block solo entra a su rama 'pro' si font_style_look llegó
    // resuelto — es la comprobación de que el tema atraviesa hasta el preview.
    const [negro, pro] = await Promise.all([
      renderFooterPreview({ ...defaultFooterFields, tipoFooter: 'General' }, 'CO', 'beige100'),
      renderFooterPreview({ ...defaultFooterFields, tipoFooter: 'General' }, 'CO', 'problack'),
    ])
    expect(negro.error).toBeUndefined()
    expect(pro.error).toBeUndefined()
    expect(pro.html).not.toBe(negro.html)
  })
})
