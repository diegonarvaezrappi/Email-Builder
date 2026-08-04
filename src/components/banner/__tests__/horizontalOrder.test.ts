import { describe, expect, it } from 'vitest'
import { enforceHorizontalItemOrder } from '../horizontalOrder'
import { richTextFromPlain } from '../../../richText/model'
import type { BannerItem } from '../items/schemas'

const promo = (id: string): BannerItem => ({
  id,
  type: 'PROMO',
  fields: { promoText: richTextFromPlain('120'), ahoraEnabled: true, ahoraText: richTextFromPlain('Ahora') },
})
const textom = (id: string): BannerItem => ({ id, type: 'TEXTOM', fields: { text: [] } })
const tags = (id: string): BannerItem => ({ id, type: 'TAGS', fields: { tags: ['a'] } })
const imgFija = (id: string): BannerItem => ({ id, type: 'IMG_FIJA', fields: { heroImageUrl: '', logoImageUrl: '', logoLink: '' } })
const imgAutoModulo = (id: string): BannerItem => ({ id, type: 'IMG_AUTOMATICA_MODULO', fields: { imageUrl: '', widthPercent: 80 } })

describe('enforceHorizontalItemOrder', () => {
  it('vertical: never touches the order, whatever it is', () => {
    const items = [tags('a'), imgFija('b'), promo('c')]
    expect(enforceHorizontalItemOrder(items, 'vertical')).toBe(items)
  })

  it('horizontal: an already-valid order (molecules, then image, then tags) is left untouched (same reference)', () => {
    const items = [promo('a'), textom('b'), imgFija('c'), tags('d')]
    expect(enforceHorizontalItemOrder(items, 'horizontal')).toBe(items)
  })

  it('horizontal: pulls molecule-zone items back BEFORE the image module', () => {
    const items = [imgFija('img'), promo('a')]
    expect(enforceHorizontalItemOrder(items, 'horizontal').map((i) => i.id)).toEqual(['a', 'img'])
  })

  it('horizontal: pulls TAGS back AFTER the image module', () => {
    const items = [tags('tags'), imgFija('img')]
    expect(enforceHorizontalItemOrder(items, 'horizontal').map((i) => i.id)).toEqual(['img', 'tags'])
  })

  it('horizontal: TAGS dragged to the very front still ends up last, after both molecules and the image', () => {
    const items = [tags('tags'), promo('a'), textom('b'), imgFija('img')]
    expect(enforceHorizontalItemOrder(items, 'horizontal').map((i) => i.id)).toEqual(['a', 'b', 'img', 'tags'])
  })

  it('horizontal: relative order WITHIN a group (molecules among themselves) is preserved — only cross-group violations are fixed', () => {
    const items = [textom('b'), promo('a'), imgFija('img')]
    expect(enforceHorizontalItemOrder(items, 'horizontal').map((i) => i.id)).toEqual(['b', 'a', 'img'])
  })

  it('horizontal: works with IMG_AUTOMATICA_MODULO too, not just IMG_FIJA', () => {
    const items = [tags('tags'), imgAutoModulo('img'), promo('a')]
    expect(enforceHorizontalItemOrder(items, 'horizontal').map((i) => i.id)).toEqual(['a', 'img', 'tags'])
  })

  it('horizontal: an empty or single-item list is untouched (same reference)', () => {
    expect(enforceHorizontalItemOrder([], 'horizontal')).toEqual([])
    const single = [promo('a')]
    expect(enforceHorizontalItemOrder(single, 'horizontal')).toBe(single)
  })
})
