import { beforeEach, describe, expect, it } from 'vitest'
import { useBuilder } from '../store'
import { defaultCtaFields } from '../../components/cta/schema'
import { defaultTagsFields } from '../../components/banner/items/schemas'
import { defaultDealCardFields, type DealCardFields } from '../../components/deals/schema'
import { defaultGeneralModuleFields } from '../../components/contentModules/generalFields'
import { richTextFromPlain } from '../../richText/model'
import type { ModuleItem } from '../../moduleItems/schemas'
import type { BannerItem, ContentBlock, CtaBlock, DealCard, DealsBlock, TitleBlock } from '../../model'

const ctaBlock = (id: string, text = id): CtaBlock => ({
  id,
  type: 'CTA',
  fields: { text, deeplink: '#', align: 'center', size: 'big' },
})

function setContenidos(blocks: ContentBlock[]) {
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
  fields: { imageUrl: '', widthPercent: 80, borderRadiusEnabled: false },
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

const promoItem = (id: string): BannerItem => ({
  id,
  type: 'PROMO',
  fields: { promoText: richTextFromPlain('120'), ahoraEnabled: true, ahoraText: richTextFromPlain('Ahora') },
})

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

  it('DEALS: cada fila nueva trae ids de tarjeta frescos, nunca colisiona con una fila insertada antes', () => {
    // Regresión real: el pedido de poder arrastrar "Deals" varias veces exige
    // que 2 filas no compartan ids de tarjeta — si compartieran,
    // findDealsBlockByCard (store.ts) encontraría siempre la 1ª fila y
    // cualquier edición/eliminación de una tarjeta de la 2ª fila aplicaría por
    // error sobre la 1ª. Ver createDefaultDealsFields en components/deals/schema.ts.
    useBuilder.getState().insertContentBlock('DEALS', 0)
    useBuilder.getState().insertContentBlock('DEALS', 1)
    const contenidos = useBuilder.getState().document.contenidos as DealsBlock[]
    expect(contenidos).toHaveLength(2)
    const idsRow1 = contenidos[0].fields.items.map((c) => c.id)
    const idsRow2 = contenidos[1].fields.items.map((c) => c.id)
    expect(idsRow1).toHaveLength(2)
    expect(idsRow2).toHaveLength(2)
    for (const id of idsRow2) expect(idsRow1).not.toContain(id)
    // Y cada fila sigue siendo una fila completa con sus valores por defecto.
    expect(contenidos[1].fields).toEqual({ items: expect.any(Array) })
    expect(contenidos[1].fields.items[0].fields).toEqual(defaultDealCardFields)
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

  it('DEALS: la fila duplicada preserva los valores de las tarjetas pero con ids nuevos', () => {
    useBuilder.setState((s) => ({
      document: {
        ...s.document,
        contenidos: [{ id: 'row-1', type: 'DEALS', fields: { items: [dealCard('a', { copy1: 'Original' }), dealCard('b')] } }],
      },
    }))
    useBuilder.getState().duplicateContentBlock('row-1')
    const contenidos = useBuilder.getState().document.contenidos as DealsBlock[]
    expect(contenidos).toHaveLength(2)
    const originalIds = contenidos[0].fields.items.map((c) => c.id)
    const copyIds = contenidos[1].fields.items.map((c) => c.id)
    expect(originalIds).toEqual(['a', 'b'])
    for (const id of copyIds) expect(originalIds).not.toContain(id)
    // Los VALORES sí se preservan — es una copia, no una fila en blanco.
    expect(contenidos[1].fields.items[0].fields.copy1).toBe('Original')
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
    // El bloque entero, no solo su texto: ahora que ContentBlock es una unión
    // (CTA | DEALS) hay que angostar para leer `fields.text`, y comparar el
    // bloque completo dice lo mismo y más fuerte ("quedó intacto").
    expect(contenidos[1]).toEqual(ctaBlock('b', 'dos'))
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
      { id: 'a', type: 'PROMO', fields: { promoText: richTextFromPlain('uno'), ahoraEnabled: true, ahoraText: richTextFromPlain('Ahora') } },
      { id: 'b', type: 'PROMO', fields: { promoText: richTextFromPlain('dos'), ahoraEnabled: true, ahoraText: richTextFromPlain('Ahora') } },
    ])
    useBuilder.getState().updateBannerItemFields('a', { promoText: 'editado' })
    const items = useBuilder.getState().document.banner.items
    expect(items[0].fields).toEqual({ promoText: 'editado' })
    expect(items[1].fields).toEqual({ promoText: richTextFromPlain('dos'), ahoraEnabled: true, ahoraText: richTextFromPlain('Ahora') })
  })
})

// --- Tarjetas de un bloque DEALS -------------------------------------------
// A diferencia de las piezas de banner (doc.banner.items, un singleton), estas
// viven 2 niveles adentro: doc.contenidos → el bloque DEALS → fields.items. Solo
// insertDealCard recibe el id del bloque; el resto lo deduce del id de tarjeta.

const dealCard = (id: string, over: Partial<DealCardFields> = {}): DealCard => ({
  id,
  fields: { ...defaultDealCardFields, ...over },
})

const dealsBlock = (id: string, cards: DealCard[]): DealsBlock => ({ id, type: 'DEALS', fields: { items: cards } })

function setDealsBlock(cards: DealCard[], blockId = 'deals-1') {
  useBuilder.setState((s) => ({ document: { ...s.document, contenidos: [dealsBlock(blockId, cards)] } }))
}

function dealCardIds(blockIndex = 0): string[] {
  const block = useBuilder.getState().document.contenidos[blockIndex]
  return block.type === 'DEALS' ? block.fields.items.map((c) => c.id) : []
}

const moduleItem = (id: string, areaKey = 'main', text = id): ModuleItem => ({
  id,
  areaKey,
  type: 'TITULO_TEXTO',
  fields: { text },
})

const titleBlock = (id: string, items: ModuleItem[]): TitleBlock => ({
  id,
  type: 'TITLE',
  fields: { ...defaultGeneralModuleFields, items },
})

function setTitleBlock(items: ModuleItem[], blockId = 'title-1') {
  useBuilder.setState((s) => ({ document: { ...s.document, contenidos: [titleBlock(blockId, items)] } }))
}

function moduleItemIds(blockIndex = 0): string[] {
  const block = useBuilder.getState().document.contenidos[blockIndex]
  return block.type === 'TITLE' ? block.fields.items.map((it) => it.id) : []
}

describe('insertDealCard', () => {
  it('inserta una tarjeta con sus campos por defecto en el índice pedido', () => {
    // Un bloque DEALS es una fila de hasta 2 (DEALS_MAX_CARDS) — se arranca
    // con 1 sola tarjeta para poder insertar la 2ª sin chocar con el tope.
    setDealsBlock([dealCard('a')])
    useBuilder.getState().insertDealCard('deals-1', 0)
    const ids = dealCardIds()
    expect(ids).toHaveLength(2)
    expect(ids[1]).toBe('a')
    const inserted = (useBuilder.getState().document.contenidos[0] as DealsBlock).fields.items[0]
    expect(inserted.fields).toEqual(defaultDealCardFields)
  })

  it('no hace nada si el bloque ya llegó al tope de 2 (una fila completa)', () => {
    setDealsBlock([dealCard('a'), dealCard('b')])
    useBuilder.getState().insertDealCard('deals-1', 2)
    expect(dealCardIds()).toEqual(['a', 'b'])
  })

  it('no hace nada si el bloque no existe o no es DEALS', () => {
    setContenidos([ctaBlock('cta-1')])
    useBuilder.getState().insertDealCard('cta-1', 0)
    expect(useBuilder.getState().document.contenidos).toEqual([ctaBlock('cta-1')])
  })
})

describe('duplicateDealCard', () => {
  it('copia la tarjeta justo después, con un id nuevo y los mismos campos', () => {
    // Mismo motivo que arriba: arranca con 1 sola tarjeta para que la copia
    // (la 2ª) no choque con el tope de la fila.
    setDealsBlock([dealCard('a', { copy1: 'Mi promo' })])
    useBuilder.getState().duplicateDealCard('a')
    const ids = dealCardIds()
    expect(ids).toHaveLength(2)
    expect(ids[0]).toBe('a')
    expect(ids[1]).not.toBe('a')
    const copy = (useBuilder.getState().document.contenidos[0] as DealsBlock).fields.items[1]
    expect(copy.fields.copy1).toBe('Mi promo')
  })

  it('no hace nada si el bloque ya llegó al tope de 2 (una fila completa)', () => {
    setDealsBlock([dealCard('a'), dealCard('b')])
    useBuilder.getState().duplicateDealCard('a')
    expect(dealCardIds()).toEqual(['a', 'b'])
  })
})

describe('reorderDealCard', () => {
  it('mueve una tarjeta hacia adelante (toIndex contra el array ANTES de sacarla)', () => {
    setDealsBlock([dealCard('a'), dealCard('b'), dealCard('c')])
    useBuilder.getState().reorderDealCard('a', 2)
    expect(dealCardIds()).toEqual(['b', 'a', 'c'])
  })

  it('mueve una tarjeta hacia atrás', () => {
    setDealsBlock([dealCard('a'), dealCard('b'), dealCard('c')])
    useBuilder.getState().reorderDealCard('c', 0)
    expect(dealCardIds()).toEqual(['c', 'a', 'b'])
  })

  it('ignora un id que no existe', () => {
    setDealsBlock([dealCard('a'), dealCard('b')])
    useBuilder.getState().reorderDealCard('zzz', 0)
    expect(dealCardIds()).toEqual(['a', 'b'])
  })
})

function pieceOrderOf(cardId: string, blockIndex = 0): string[] {
  const block = useBuilder.getState().document.contenidos[blockIndex]
  if (block.type !== 'DEALS') return []
  return block.fields.items.find((c) => c.id === cardId)?.fields.pieceOrder ?? []
}

describe('reorderDealCardPiece', () => {
  it('mueve una pieza hacia adelante dentro de pieceOrder (toIndex contra el array ANTES de sacarla)', () => {
    setDealsBlock([dealCard('a'), dealCard('b')])
    useBuilder.getState().reorderDealCardPiece('a', 'copy1', 2)
    expect(pieceOrderOf('a')).toEqual(['copy2', 'copy1', 'precio', 'rating', 'tag1', 'tag2', 'cta'])
    // La tarjeta 'b' (y el resto del documento) queda intacta.
    expect(pieceOrderOf('b')).toEqual(['copy1', 'copy2', 'precio', 'rating', 'tag1', 'tag2', 'cta'])
  })

  it('mueve una pieza hacia atrás', () => {
    setDealsBlock([dealCard('a')])
    useBuilder.getState().reorderDealCardPiece('a', 'cta', 0)
    expect(pieceOrderOf('a')).toEqual(['cta', 'copy1', 'copy2', 'precio', 'rating', 'tag1', 'tag2'])
  })

  it('ignora un cardId que no existe', () => {
    setDealsBlock([dealCard('a')])
    const before = pieceOrderOf('a')
    useBuilder.getState().reorderDealCardPiece('zzz', 'cta', 0)
    expect(pieceOrderOf('a')).toEqual(before)
  })

  it('ignora un pieceType que no está en el pieceOrder actual de la tarjeta', () => {
    setDealsBlock([dealCard('a', { pieceOrder: ['copy1', 'copy2', 'precio', 'rating', 'tag1', 'tag2', 'cta'] })])
    const before = pieceOrderOf('a')
    // @ts-expect-error -- probando defensivamente un tipo que no existe en el array actual
    useBuilder.getState().reorderDealCardPiece('a', 'inexistente', 0)
    expect(pieceOrderOf('a')).toEqual(before)
  })
})

describe('removeDealCard', () => {
  it('elimina solo la tarjeta apuntada', () => {
    setDealsBlock([dealCard('a'), dealCard('b'), dealCard('c')])
    useBuilder.getState().removeDealCard('b')
    expect(dealCardIds()).toEqual(['a', 'c'])
  })

  it('puede dejar el bloque sin tarjetas (el bloque no se borra solo)', () => {
    setDealsBlock([dealCard('a')])
    useBuilder.getState().removeDealCard('a')
    expect(dealCardIds()).toEqual([])
    expect(useBuilder.getState().document.contenidos).toHaveLength(1)
  })
})

describe('updateDealCardFields', () => {
  it('actualiza solo la tarjeta apuntada, dejando las otras intactas', () => {
    setDealsBlock([dealCard('a'), dealCard('b', { copy1: 'B original' })])
    useBuilder.getState().updateDealCardFields('a', { ...defaultDealCardFields, copy1: 'A editada' })
    const items = (useBuilder.getState().document.contenidos[0] as DealsBlock).fields.items
    expect(items[0].fields.copy1).toBe('A editada')
    expect(items[1].fields.copy1).toBe('B original')
  })

  it('encuentra la tarjeta aunque el bloque DEALS no sea el primero de contenidos', () => {
    useBuilder.setState((s) => ({
      document: { ...s.document, contenidos: [ctaBlock('cta-1'), dealsBlock('deals-2', [dealCard('x')])] },
    }))
    useBuilder.getState().updateDealCardFields('x', { ...defaultDealCardFields, copy1: 'Editada' })
    const block = useBuilder.getState().document.contenidos[1] as DealsBlock
    expect(block.fields.items[0].fields.copy1).toBe('Editada')
    expect(useBuilder.getState().document.contenidos[0]).toEqual(ctaBlock('cta-1'))
  })
})

describe('insertModuleItem', () => {
  it('inserta una molécula con sus campos por defecto en el índice pedido, dentro del área indicada', () => {
    setTitleBlock([moduleItem('a')])
    useBuilder.getState().insertModuleItem('title-1', 'main', 'SUBTITULO_TEXTO', 0)
    const ids = moduleItemIds()
    expect(ids).toHaveLength(2)
    expect(ids[1]).toBe('a')
    const block = useBuilder.getState().document.contenidos[0] as TitleBlock
    expect(block.fields.items[0].type).toBe('SUBTITULO_TEXTO')
  })

  it('acota atIndex a los items de la MISMA área, sin tocar los de otra', () => {
    setTitleBlock([moduleItem('above-1', 'above'), moduleItem('main-1', 'main')])
    useBuilder.getState().insertModuleItem('title-1', 'main', 'SEPARADOR_LINEA', 0)
    const block = useBuilder.getState().document.contenidos[0] as TitleBlock
    // 'above-1' sigue siendo el 1ro del array entero (no lo desplazó la
    // inserción en 'main'); dentro de 'main', el nuevo item queda primero.
    expect(block.fields.items.map((it) => it.id)).toEqual(['above-1', expect.any(String), 'main-1'])
    expect(block.fields.items[1].areaKey).toBe('main')
  })

  it('no hace nada si el bloque no existe o no usa el motor de módulos', () => {
    setContenidos([ctaBlock('cta-1')])
    useBuilder.getState().insertModuleItem('cta-1', 'main', 'SUBTITULO_TEXTO', 0)
    expect(useBuilder.getState().document.contenidos).toEqual([ctaBlock('cta-1')])
  })
})

describe('duplicateModuleItem', () => {
  it('copia la molécula justo después, con un id nuevo y los mismos campos', () => {
    setTitleBlock([moduleItem('a', 'main', 'Mi título')])
    useBuilder.getState().duplicateModuleItem('a')
    const ids = moduleItemIds()
    expect(ids).toHaveLength(2)
    expect(ids[0]).toBe('a')
    expect(ids[1]).not.toBe('a')
    const block = useBuilder.getState().document.contenidos[0] as TitleBlock
    expect(block.fields.items[1].fields).toEqual({ text: 'Mi título' })
  })

  it('ignora un itemId que no existe', () => {
    setTitleBlock([moduleItem('a')])
    useBuilder.getState().duplicateModuleItem('zzz')
    expect(moduleItemIds()).toEqual(['a'])
  })
})

describe('reorderModuleItem', () => {
  it('mueve una molécula hacia adelante (toIndex contra el array ANTES de sacarla)', () => {
    setTitleBlock([moduleItem('a'), moduleItem('b'), moduleItem('c')])
    useBuilder.getState().reorderModuleItem('a', 2)
    expect(moduleItemIds()).toEqual(['b', 'a', 'c'])
  })

  it('mueve una molécula hacia atrás', () => {
    setTitleBlock([moduleItem('a'), moduleItem('b'), moduleItem('c')])
    useBuilder.getState().reorderModuleItem('c', 0)
    expect(moduleItemIds()).toEqual(['c', 'a', 'b'])
  })

  it('acota el reordenamiento a los items de la MISMA área que el arrastrado', () => {
    setTitleBlock([moduleItem('above-1', 'above'), moduleItem('main-1', 'main'), moduleItem('main-2', 'main')])
    useBuilder.getState().reorderModuleItem('main-2', 0)
    expect(moduleItemIds()).toEqual(['above-1', 'main-2', 'main-1'])
  })

  it('ignora un id que no existe', () => {
    setTitleBlock([moduleItem('a'), moduleItem('b')])
    useBuilder.getState().reorderModuleItem('zzz', 0)
    expect(moduleItemIds()).toEqual(['a', 'b'])
  })
})

describe('removeModuleItem', () => {
  it('elimina solo la molécula apuntada', () => {
    setTitleBlock([moduleItem('a'), moduleItem('b'), moduleItem('c')])
    useBuilder.getState().removeModuleItem('b')
    expect(moduleItemIds()).toEqual(['a', 'c'])
  })

  it('puede dejar el área/bloque sin moléculas (el bloque no se borra solo) — "solo título" es un caso real', () => {
    setTitleBlock([moduleItem('a')])
    useBuilder.getState().removeModuleItem('a')
    expect(moduleItemIds()).toEqual([])
    expect(useBuilder.getState().document.contenidos).toHaveLength(1)
  })
})

describe('updateModuleItemFields', () => {
  it('actualiza solo la molécula apuntada, dejando las otras intactas', () => {
    setTitleBlock([moduleItem('a', 'main', 'A original'), moduleItem('b', 'main', 'B original')])
    useBuilder.getState().updateModuleItemFields('a', { text: 'A editada' })
    const block = useBuilder.getState().document.contenidos[0] as TitleBlock
    expect(block.fields.items[0].fields).toEqual({ text: 'A editada' })
    expect(block.fields.items[1].fields).toEqual({ text: 'B original' })
  })

  it('encuentra el item aunque el bloque TITLE no sea el primero de contenidos', () => {
    useBuilder.setState((s) => ({
      document: { ...s.document, contenidos: [ctaBlock('cta-1'), titleBlock('title-2', [moduleItem('x')])] },
    }))
    useBuilder.getState().updateModuleItemFields('x', { text: 'Editada' })
    const block = useBuilder.getState().document.contenidos[1] as TitleBlock
    expect(block.fields.items[0].fields).toEqual({ text: 'Editada' })
    expect(useBuilder.getState().document.contenidos[0]).toEqual(ctaBlock('cta-1'))
  })
})

describe('setDocument', () => {
  it('reemplaza el documento entero (usado por la pestaña Importar) — no un merge parcial', () => {
    setContenidos([ctaBlock('viejo')])
    useBuilder.setState((s) => ({ document: { ...s.document, global: { ...s.document.global, tema: 'pro' } } }))

    const imported = { ...useBuilder.getState().document, contenidos: [ctaBlock('nuevo')], global: { ...useBuilder.getState().document.global, tema: 'beige100' as const } }
    useBuilder.getState().setDocument(imported)

    expect(ids()).toEqual(['nuevo'])
    expect(useBuilder.getState().document.global.tema).toBe('beige100')
  })
})
