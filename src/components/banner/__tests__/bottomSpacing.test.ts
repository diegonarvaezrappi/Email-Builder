import { describe, expect, it } from 'vitest'
import { defaultEmailDocument } from '../../../registry'
import { renderBannerSnippet } from '../render'
import { bannerSchema, type BannerFields } from '../schema'
import { defaultImgAutomaticaMoleculaFields, defaultTextoMFields } from '../items/schemas'

const IMG_MARGIN = /<table data-type="text"[^>]*style=" margin-bottom: (\d+)px; "/g

function banner(over: Partial<BannerFields>): BannerFields {
  return bannerSchema.parse({
    ...defaultEmailDocument.banner,
    bannerType: 'vertical',
    items: [
      { id: 'img1', type: 'IMG_AUTOMATICA_MOLECULA', fields: defaultImgAutomaticaMoleculaFields },
      { id: 't', type: 'TEXTOM', fields: defaultTextoMFields },
      { id: 'img2', type: 'IMG_AUTOMATICA_MOLECULA', fields: defaultImgAutomaticaMoleculaFields },
    ],
    ...over,
  })
}

const margins = (fields: BannerFields) =>
  [...renderBannerSnippet(fields, { ...defaultEmailDocument, banner: fields }).matchAll(IMG_MARGIN)].map((m) => m[1])

describe('banner · espacio inferior', () => {
  it('por defecto cada pieza conserva su margin-bottom del maestro', () => {
    expect(banner({}).bottomSpacing).toBe(true)
    expect(margins(banner({}))).toEqual(['7', '7'])
  })

  it('apagado, solo la última pieza pierde su margen', () => {
    expect(margins(banner({ bottomSpacing: false }))).toEqual(['7', '0'])
  })

  it('los banners guardados sin el campo lo reciben en true', () => {
    const { bottomSpacing: _omit, ...rest } = banner({})
    expect(bannerSchema.parse(rest).bottomSpacing).toBe(true)
  })
})

describe('banner · espacio inferior según la última pieza', () => {
  const render = (items: BannerFields['items'], bottomSpacing: boolean) => {
    const fields = banner({ items, bottomSpacing })
    return renderBannerSnippet(fields, { ...defaultEmailDocument, banner: fields })
  }
  const promo = defaultEmailDocument.banner.items.find((i) => i.type === 'PROMO')!
  const tags = defaultEmailDocument.banner.items.find((i) => i.type === 'TAGS')!

  it('PROMO: el 7px del shorthand margin pasa a 0', () => {
    expect(render([promo], true)).toContain('margin: 0px auto 7px auto;')
    expect(render([promo], false)).toContain('margin: 0px auto 0px auto;')
  })

  it('TAGS: la celda pierde solo su padding inferior', () => {
    expect(render([tags], true)).toContain('padding: 5px 10px;')
    expect(render([tags], false)).toContain('padding: 5px 10px 0px 10px;')
  })
})
