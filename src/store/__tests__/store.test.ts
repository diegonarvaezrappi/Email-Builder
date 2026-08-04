import { beforeEach, describe, expect, it } from 'vitest'
import { useBuilder } from '../store'
import { defaultCtaFields } from '../../components/cta/schema'
import { defaultTagsFields } from '../../components/banner/items/schemas'
import type { BannerItem, CtaBlock } from '../../model'

const ctaBlock = (id: string, text = id): CtaBlock => ({
  id,
  type: 'CTA',
  fields: { text, deeplink: '#', align: 'center' },
})

function setContenidos(blocks: CtaBlock[]) {
  // Construye sobre el estado ACTUAL (no defaultEmailDocument): así no importa
  // en qué orden beforeEach llame a este helper y a setBannerItems, ninguno
  // pisa lo que el otro acaba de fijar (defaultEmailDocument.contenidos ya no
  // es [] — trae 1 CTA por defecto, ver registry.ts).
  useBuilder.setState((s) => ({ document: { ...s.document, contenidos: blocks } }))
}

function ids(): string[] {
  return useBuilder.getState().document.contenidos.map((b) => b.id)
}

const tagsItem = (id: string): BannerItem => ({ id, type: 'TAGS', fields: defaultTagsFields })
const imgFijaItem = (id: string): BannerItem => ({
  id,
  type: 'IMG_FIJA',
  fields: { heroImageUrl: '', logoImageUrl: '', logoLink: '' },
})
const imgAutomaticaModuloItem = (id: string): BannerItem => ({
  id,
  type: 'IMG_AUTOMATICA_MODULO',
  fields: { imageUrl: '', widthPercent: 80 },
})

function setBannerItems(items: BannerItem[]) {
  // Mismo motivo que setContenidos: construye sobre el estado actual, no sobre
  // defaultEmailDocument, para no pisar lo que setContenidos ya haya fijado.
  useBuilder.setState((s) => ({
    document: { ...s.document, banner: { ...s.document.banner, items } },
  }))
}

function bannerIds(): string[] {
  return useBuilder.getState().document.banner.items.map((it) => it.id)
}

function setBannerType(bannerType: 'vertical' | 'horizontal') {
  useBuilder.setState((s) => ({ document: { ...s.document, banner: { ...s.document.banner, bannerType } } }))
}

const promoItem = (id: string): BannerItem => ({ id, type: 'PROMO', fields: { promoText: '120' } })

beforeEach(() => {
  setContenidos([])
  setBannerItems([])
  setBannerType('vertical')
})

describe('insertContentBlock', () => {
  it('inserts a new CTA block with its default fields', () => {
    useBuilder.getState().insertContentBlock('CTA', 0)
    const contenidos = useBuilder.getState().document.contenidos
    expect(contenidos).toHaveLength(1)
    expect(contenidos[0].type).toBe('CTA')
    expect(contenidos[0].fields).toEqual(defaultCtaFields)
  })

  it('inserts at the start (index 0)', () => {
    setContenidos([ctaBlock('a'), ctaBlock('b')])
    useBuilder.getState().insertContentBlock('CTA', 0)
    expect(ids().slice(1)).toEqual(['a', 'b'])
    expect(ids()[0]).not.toBe('a')
  })

  it('inserts in the middle', () => {
    setContenidos([ctaBlock('a'), ctaBlock('b')])
    useBuilder.getState().insertContentBlock('CTA', 1)
    const [first, middle, last] = ids()
    expect(first).toBe('a')
    expect(last).toBe('b')
    expect(middle).not.toBe('a')
    expect(middle).not.toBe('b')
  })

  it('inserts at the end (index >= length)', () => {
    setContenidos([ctaBlock('a'), ctaBlock('b')])
    useBuilder.getState().insertContentBlock('CTA', 99)
    expect(ids().slice(0, 2)).toEqual(['a', 'b'])
    expect(ids()).toHaveLength(3)
  })

  it('does nothing for an unregistered block type', () => {
    // @ts-expect-error tipo inválido a propósito
    useBuilder.getState().insertContentBlock('NOPE', 0)
    expect(useBuilder.getState().document.contenidos).toHaveLength(0)
  })
})

describe('duplicateContentBlock', () => {
  it('inserts a copy immediately after the original, with a different id but the same fields', () => {
    setContenidos([ctaBlock('a', 'texto original'), ctaBlock('b')])
    useBuilder.getState().duplicateContentBlock('a')
    const contenidos = useBuilder.getState().document.contenidos
    expect(contenidos.map((b) => b.id)[0]).toBe('a')
    expect(contenidos[1].id).not.toBe('a')
    expect(contenidos[1].fields).toEqual(contenidos[0].fields)
    expect(contenidos[2].id).toBe('b')
  })

  it('does nothing for an id that does not exist', () => {
    setContenidos([ctaBlock('a')])
    useBuilder.getState().duplicateContentBlock('does-not-exist')
    expect(useBuilder.getState().document.contenidos).toHaveLength(1)
  })
})

describe('reorderContentBlock', () => {
  // [A,B,C,D] — los 4 casos: mover adelante, mover atrás, extremos.
  it('moves an item forward (A to the position of D)', () => {
    setContenidos([ctaBlock('A'), ctaBlock('B'), ctaBlock('C'), ctaBlock('D')])
    useBuilder.getState().reorderContentBlock('A', 3) // "insertar antes del índice 3 (D)", pre-remoción
    expect(ids()).toEqual(['B', 'C', 'A', 'D'])
  })

  it('moves an item backward (D to the position of A)', () => {
    setContenidos([ctaBlock('A'), ctaBlock('B'), ctaBlock('C'), ctaBlock('D')])
    useBuilder.getState().reorderContentBlock('D', 0)
    expect(ids()).toEqual(['D', 'A', 'B', 'C'])
  })

  it('moves an item to the very end', () => {
    setContenidos([ctaBlock('A'), ctaBlock('B'), ctaBlock('C'), ctaBlock('D')])
    useBuilder.getState().reorderContentBlock('A', 4)
    expect(ids()).toEqual(['B', 'C', 'D', 'A'])
  })

  it('moves a middle item backward past two others', () => {
    setContenidos([ctaBlock('A'), ctaBlock('B'), ctaBlock('C'), ctaBlock('D')])
    useBuilder.getState().reorderContentBlock('C', 0)
    expect(ids()).toEqual(['C', 'A', 'B', 'D'])
  })

  it('is a no-op when dropped back onto its own current position', () => {
    setContenidos([ctaBlock('A'), ctaBlock('B'), ctaBlock('C')])
    useBuilder.getState().reorderContentBlock('B', 1)
    expect(ids()).toEqual(['A', 'B', 'C'])
  })

  it('does nothing for an id that does not exist', () => {
    setContenidos([ctaBlock('A'), ctaBlock('B')])
    useBuilder.getState().reorderContentBlock('does-not-exist', 0)
    expect(ids()).toEqual(['A', 'B'])
  })
})

describe('removeContentBlock', () => {
  it('removes only the targeted block', () => {
    setContenidos([ctaBlock('a'), ctaBlock('b'), ctaBlock('c')])
    useBuilder.getState().removeContentBlock('b')
    expect(ids()).toEqual(['a', 'c'])
  })
})

describe('updateContentBlockFields', () => {
  it('updates only the targeted block, leaving the others untouched', () => {
    setContenidos([ctaBlock('a', 'uno'), ctaBlock('b', 'dos')])
    useBuilder.getState().updateContentBlockFields('a', { text: 'editado', deeplink: '#', align: 'left' })
    const contenidos = useBuilder.getState().document.contenidos
    expect(contenidos[0].fields).toEqual({ text: 'editado', deeplink: '#', align: 'left' })
    expect(contenidos[1].fields.text).toBe('dos')
  })
})

describe('insertBannerItem', () => {
  it('inserts a new TAGS item with its default fields', () => {
    useBuilder.getState().insertBannerItem('TAGS', 0)
    const items = useBuilder.getState().document.banner.items
    expect(items).toHaveLength(1)
    expect(items[0].type).toBe('TAGS')
    expect(items[0].fields).toEqual(defaultTagsFields)
  })

  it('inserts at the start (index 0)', () => {
    setBannerItems([tagsItem('a'), tagsItem('b')])
    useBuilder.getState().insertBannerItem('TAGS', 0)
    expect(bannerIds().slice(1)).toEqual(['a', 'b'])
    expect(bannerIds()[0]).not.toBe('a')
  })

  it('inserts at the end (index >= length)', () => {
    setBannerItems([tagsItem('a'), tagsItem('b')])
    useBuilder.getState().insertBannerItem('TAGS', 99)
    expect(bannerIds().slice(0, 2)).toEqual(['a', 'b'])
    expect(bannerIds()).toHaveLength(3)
  })

  it('does nothing for an unregistered item type', () => {
    // @ts-expect-error tipo inválido a propósito
    useBuilder.getState().insertBannerItem('NOPE', 0)
    expect(useBuilder.getState().document.banner.items).toHaveLength(0)
  })

  // Exclusividad de módulo de imagen (la única regla dura del maestro que se
  // conserva en código — ver components/banner/exclusivity.ts).
  it('inserting IMG_FIJA over an existing IMG_AUTOMATICA_MODULO removes the automática one', () => {
    setBannerItems([imgAutomaticaModuloItem('a')])
    useBuilder.getState().insertBannerItem('IMG_FIJA', 1)
    const items = useBuilder.getState().document.banner.items
    expect(items).toHaveLength(1)
    expect(items[0].type).toBe('IMG_FIJA')
  })

  it('inserting IMG_AUTOMATICA_MODULO over an existing IMG_FIJA removes the fija one', () => {
    setBannerItems([imgFijaItem('a')])
    useBuilder.getState().insertBannerItem('IMG_AUTOMATICA_MODULO', 1)
    const items = useBuilder.getState().document.banner.items
    expect(items).toHaveLength(1)
    expect(items[0].type).toBe('IMG_AUTOMATICA_MODULO')
  })

  it('inserting a non-image-module type (ej. PROMO) never touches an existing image module', () => {
    setBannerItems([imgFijaItem('a')])
    useBuilder.getState().insertBannerItem('PROMO', 1)
    const items = useBuilder.getState().document.banner.items
    expect(items).toHaveLength(2)
    expect(items.map((it) => it.type)).toEqual(['IMG_FIJA', 'PROMO'])
  })

  it('IMG_AUTOMATICA_MOLECULA (a distinct type) coexists with IMG_FIJA — the exclusivity rule does not apply to it', () => {
    setBannerItems([imgFijaItem('a')])
    useBuilder.getState().insertBannerItem('IMG_AUTOMATICA_MOLECULA', 1)
    const items = useBuilder.getState().document.banner.items
    expect(items).toHaveLength(2)
    expect(items.map((it) => it.type)).toEqual(['IMG_FIJA', 'IMG_AUTOMATICA_MOLECULA'])
  })
})

describe('duplicateBannerItem', () => {
  it('inserts a copy immediately after the original, with a different id but the same fields', () => {
    setBannerItems([tagsItem('a'), tagsItem('b')])
    useBuilder.getState().duplicateBannerItem('a')
    const items = useBuilder.getState().document.banner.items
    expect(items.map((it) => it.id)[0]).toBe('a')
    expect(items[1].id).not.toBe('a')
    expect(items[1].fields).toEqual(items[0].fields)
    expect(items[2].id).toBe('b')
  })

  it('does nothing for an id that does not exist', () => {
    setBannerItems([tagsItem('a')])
    useBuilder.getState().duplicateBannerItem('does-not-exist')
    expect(useBuilder.getState().document.banner.items).toHaveLength(1)
  })

  it('duplicating an image-module item (subject to exclusivity) still nets exactly 1 image module, replacing the original', () => {
    setBannerItems([tagsItem('before'), imgFijaItem('a'), tagsItem('after')])
    useBuilder.getState().duplicateBannerItem('a')
    const items = useBuilder.getState().document.banner.items
    expect(items).toHaveLength(3)
    expect(items.map((it) => it.type)).toEqual(['TAGS', 'IMG_FIJA', 'TAGS'])
    expect(items[1].id).not.toBe('a') // el original fue reemplazado por su copia
    expect(items[0].id).toBe('before')
    expect(items[2].id).toBe('after')
  })
})

describe('reorderBannerItem', () => {
  // [A,B,C,D] — los 4 casos: mover adelante, mover atrás, extremos.
  it('moves an item forward (A to the position of D)', () => {
    setBannerItems([tagsItem('A'), tagsItem('B'), tagsItem('C'), tagsItem('D')])
    useBuilder.getState().reorderBannerItem('A', 3)
    expect(bannerIds()).toEqual(['B', 'C', 'A', 'D'])
  })

  it('moves an item backward (D to the position of A)', () => {
    setBannerItems([tagsItem('A'), tagsItem('B'), tagsItem('C'), tagsItem('D')])
    useBuilder.getState().reorderBannerItem('D', 0)
    expect(bannerIds()).toEqual(['D', 'A', 'B', 'C'])
  })

  it('moves an item to the very end', () => {
    setBannerItems([tagsItem('A'), tagsItem('B'), tagsItem('C'), tagsItem('D')])
    useBuilder.getState().reorderBannerItem('A', 4)
    expect(bannerIds()).toEqual(['B', 'C', 'D', 'A'])
  })

  it('moves a middle item backward past two others', () => {
    setBannerItems([tagsItem('A'), tagsItem('B'), tagsItem('C'), tagsItem('D')])
    useBuilder.getState().reorderBannerItem('C', 0)
    expect(bannerIds()).toEqual(['C', 'A', 'B', 'D'])
  })

  it('is a no-op when dropped back onto its own current position', () => {
    setBannerItems([tagsItem('A'), tagsItem('B'), tagsItem('C')])
    useBuilder.getState().reorderBannerItem('B', 1)
    expect(bannerIds()).toEqual(['A', 'B', 'C'])
  })

  it('does nothing for an id that does not exist', () => {
    setBannerItems([tagsItem('A'), tagsItem('B')])
    useBuilder.getState().reorderBannerItem('does-not-exist', 0)
    expect(bannerIds()).toEqual(['A', 'B'])
  })
})

// El maestro fija el orden en horizontal (molecula -> imagen -> tags, ver
// components/banner/horizontalOrder.ts) — estas 4 acciones lo deben
// respetar siempre, sin importar el índice de destino pedido.
describe('horizontal banner item ordering (enforceHorizontalItemOrder)', () => {
  it('insertBannerItem: inserting a molecule-zone piece past the image module snaps it back before it', () => {
    setBannerType('horizontal')
    setBannerItems([imgFijaItem('img')])
    useBuilder.getState().insertBannerItem('PROMO', 5)
    expect(bannerIds().slice(-1)).toEqual(['img'])
    expect(useBuilder.getState().document.banner.items.map((it) => it.type)).toEqual(['PROMO', 'IMG_FIJA'])
  })

  it('insertBannerItem: inserting TAGS before the image module snaps it back after it', () => {
    setBannerType('horizontal')
    setBannerItems([imgFijaItem('img')])
    useBuilder.getState().insertBannerItem('TAGS', 0)
    expect(useBuilder.getState().document.banner.items.map((it) => it.type)).toEqual(['IMG_FIJA', 'TAGS'])
  })

  it('duplicateBannerItem: duplicating TAGS to sit right after itself, ahead of the image, still ends up after the image', () => {
    setBannerType('horizontal')
    setBannerItems([tagsItem('tags'), imgFijaItem('img')])
    useBuilder.getState().duplicateBannerItem('tags')
    const types = useBuilder.getState().document.banner.items.map((it) => it.type)
    expect(types).toEqual(['IMG_FIJA', 'TAGS', 'TAGS'])
  })

  it('reorderBannerItem: dragging TAGS to the front is a no-op in practice — it lands back after the image', () => {
    setBannerType('horizontal')
    setBannerItems([promoItem('a'), imgFijaItem('img'), tagsItem('tags')])
    useBuilder.getState().reorderBannerItem('tags', 0)
    expect(useBuilder.getState().document.banner.items.map((it) => it.id)).toEqual(['a', 'img', 'tags'])
  })

  it('reorderBannerItem: dragging a molecule item past the image module snaps it back before it', () => {
    setBannerType('horizontal')
    setBannerItems([promoItem('a'), imgFijaItem('img'), tagsItem('tags')])
    useBuilder.getState().reorderBannerItem('a', 3)
    expect(useBuilder.getState().document.banner.items.map((it) => it.id)).toEqual(['a', 'img', 'tags'])
  })

  it('reorderBannerItem: reordering 2 molecule items among themselves works normally (same rank, no snap-back)', () => {
    setBannerType('horizontal')
    setBannerItems([promoItem('a'), { id: 'b', type: 'TEXTOM', fields: { text: [] } }, imgFijaItem('img')])
    useBuilder.getState().reorderBannerItem('b', 0)
    expect(useBuilder.getState().document.banner.items.map((it) => it.id)).toEqual(['b', 'a', 'img'])
  })

  it('vertical banners are completely unaffected — any order is left as the user made it', () => {
    setBannerType('vertical')
    setBannerItems([tagsItem('tags'), imgFijaItem('img')])
    useBuilder.getState().reorderBannerItem('tags', 0)
    expect(bannerIds()).toEqual(['tags', 'img'])
  })
})

describe('removeBannerItem', () => {
  it('removes only the targeted item', () => {
    setBannerItems([tagsItem('a'), tagsItem('b'), tagsItem('c')])
    useBuilder.getState().removeBannerItem('b')
    expect(bannerIds()).toEqual(['a', 'c'])
  })
})

describe('updateBannerItemFields', () => {
  it('updates only the targeted item, leaving the others untouched', () => {
    setBannerItems([
      { id: 'a', type: 'PROMO', fields: { promoText: 'uno' } },
      { id: 'b', type: 'PROMO', fields: { promoText: 'dos' } },
    ])
    useBuilder.getState().updateBannerItemFields('a', { promoText: 'editado' })
    const items = useBuilder.getState().document.banner.items
    expect(items[0].fields).toEqual({ promoText: 'editado' })
    expect(items[1].fields).toEqual({ promoText: 'dos' })
  })
})
