import { describe, expect, it } from 'vitest'
import { applyImageModuleExclusivity } from '../exclusivity'
import { defaultTagItem } from '../items/schemas'
import type { BannerItem } from '../items/schemas'

const tags = (id: string): BannerItem => ({ id, type: 'TAGS', fields: { tags: [defaultTagItem()] } })
const imgFija = (id: string): BannerItem => ({ id, type: 'IMG_FIJA', fields: { heroImageUrl: '', logoImageUrl: '', logoLink: '' } })
const imgAutoModulo = (id: string): BannerItem => ({
  id,
  type: 'IMG_AUTOMATICA_MODULO',
  fields: { imageUrl: '', widthPercent: 80, borderRadiusEnabled: false },
})
const imgAutoMolecula = (id: string): BannerItem => ({ id, type: 'IMG_AUTOMATICA_MOLECULA', fields: { imageUrl: '', widthPercent: 80 } })

describe('applyImageModuleExclusivity', () => {
  it('removes an existing IMG_FIJA when the incoming type is IMG_AUTOMATICA_MODULO', () => {
    const result = applyImageModuleExclusivity([tags('a'), imgFija('b')], 'IMG_AUTOMATICA_MODULO')
    expect(result.map((it) => it.id)).toEqual(['a'])
  })

  it('removes an existing IMG_AUTOMATICA_MODULO when the incoming type is IMG_FIJA', () => {
    const result = applyImageModuleExclusivity([tags('a'), imgAutoModulo('b')], 'IMG_FIJA')
    expect(result.map((it) => it.id)).toEqual(['a'])
  })

  it('leaves everything untouched when the incoming type is not an image module', () => {
    const items = [tags('a'), imgFija('b')]
    expect(applyImageModuleExclusivity(items, 'PROMO')).toEqual(items)
  })

  it('does not remove IMG_AUTOMATICA_MOLECULA — it is a distinct type, not subject to this rule', () => {
    const result = applyImageModuleExclusivity([imgAutoMolecula('a'), imgFija('b')], 'IMG_AUTOMATICA_MODULO')
    expect(result.map((it) => it.id)).toEqual(['a'])
  })

  it('removes ALL matching image-module items, not just the first, if more than one somehow exists', () => {
    const result = applyImageModuleExclusivity([imgFija('a'), imgFija('b'), tags('c')], 'IMG_AUTOMATICA_MODULO')
    expect(result.map((it) => it.id)).toEqual(['c'])
  })
})
