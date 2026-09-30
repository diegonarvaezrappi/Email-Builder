import { describe, expect, it } from 'vitest'
import { richTextFromPlain } from '../../richText/model'
import { defaultEmailDocument } from '../../registry'
import type { ContentBlock, DealsBlock, EmailDocument } from '../../model'
import type { DealCardFields } from '../../components/deals/schema'
import { contentBlockRegistry } from '../../contentBlockRegistry'
import { bodyMoleculeRegistry } from '../../bodyMoleculeRegistry'
import {
  blockExpandKey,
  buildTreeViewModel,
  dealCardExpandKey,
  expandedKeysForSelection,
  isSameSelection,
  type TreeNodeRow,
  type TreeRow,
} from '../componentTreeModel'
import {
  selectBannerItem,
  selectBlock,
  selectDealCard,
  selectDealCardPiece,
  selectGlobalBackground,
  selectModuleItem,
  selectSlot,
} from '../selection'

/** Los defaults reales de la molécula, para no inventar un shape en el test. */
const bulletIconFields = bodyMoleculeRegistry.BULLET_ICONO_SIMPLE.defaultFields

const NONE: ReadonlySet<string> = new Set()
const open = (...keys: string[]): ReadonlySet<string> => new Set(keys)
const nodes = (rows: TreeRow[]): TreeNodeRow[] => rows.filter((r): r is TreeNodeRow => r.kind === 'node')
const nodeLabels = (rows: TreeRow[]): string[] => nodes(rows).map((r) => r.label)
const labels = (rows: TreeRow[]): string[] => rows.map((r) => r.label)
const dealsBlocks = (doc: EmailDocument): DealsBlock[] =>
  doc.contenidos.filter((b): b is DealsBlock => b.type === 'DEALS')

/** El documento por defecto trae 1 CTA + 3 filas de DEALS (registry.ts). */
const firstDealsBlock = (doc: EmailDocument): DealsBlock => {
  const block = dealsBlocks(doc)[0]
  if (!block) throw new Error('el documento por defecto debería traer bloques DEALS')
  return block
}

/** El documento por defecto con ese bloque DEALS reducido a UNA tarjeta, con
 *  los `fields` dados — el bloque se arma tipado antes del `map` porque un
 *  literal dentro del map no es asignable a la unión ContentBlock. */
function withPatchedFirstCard(block: DealsBlock, fields: DealCardFields): EmailDocument {
  const patched: DealsBlock = {
    ...block,
    fields: { ...block.fields, items: [{ ...block.fields.items[0], fields }] },
  }
  return {
    ...defaultEmailDocument,
    contenidos: defaultEmailDocument.contenidos.map((b): ContentBlock => (b.id === block.id ? patched : b)),
  }
}

/** Un documento con un único bloque COL3 (3 áreas) y 3 moléculas. */
const col3Doc: EmailDocument = {
  ...defaultEmailDocument,
  contenidos: [
    {
      id: 'col3',
      type: 'COL3',
      fields: {
        ...(contentBlockRegistry.COL3!.defaultFields as object),
        items: [
          { id: 'a', areaKey: 'cell1', type: 'BULLET_ICONO_SIMPLE', fields: bulletIconFields },
          { id: 'b', areaKey: 'cell3', type: 'BULLET_ICONO_SIMPLE', fields: bulletIconFields },
          { id: 'c', areaKey: 'cell3', type: 'BULLET_ICONO_SIMPLE', fields: bulletIconFields },
        ],
      },
    } as ContentBlock,
  ],
}

describe('buildTreeViewModel · Sección Hero', () => {
  it('lists the banner pieces, flat', () => {
    const vm = buildTreeViewModel(defaultEmailDocument, NONE, 'hero')
    expect(nodeLabels(vm.rows)).toEqual([
      'Promo',
      'Imagen automática (molécula)',
      'Texto complementario',
      'Imagen de alto fijo',
      'Tags',
    ])
    expect(nodes(vm.rows).every((r) => r.expandKey === undefined && r.depth === 0)).toBe(true)
  })

  it('tags a banner piece the current orientation does not render, instead of hiding it', () => {
    // IMG_AUTOMATICA_MODULO es solo horizontal (bannerItemRegistry.ts) — en un
    // banner vertical sigue viva en el documento pero no se renderiza.
    const doc: EmailDocument = {
      ...defaultEmailDocument,
      banner: {
        ...defaultEmailDocument.banner,
        bannerType: 'vertical',
        items: [{ id: 'x', type: 'IMG_AUTOMATICA_MODULO', fields: { imageUrl: '', imageAlt: '', widthPercent: 80, borderRadiusEnabled: false } }],
      },
    }
    expect(buildTreeViewModel(doc, NONE, 'hero').rows[0]).toMatchObject({ tag: 'no aplica' })
  })

  it('shows a hint when the banner has no pieces', () => {
    const doc: EmailDocument = { ...defaultEmailDocument, banner: { ...defaultEmailDocument.banner, items: [] } }
    expect(buildTreeViewModel(doc, NONE, 'hero').rows).toEqual([{ kind: 'hint', label: '(sin piezas)', depth: 0 }])
  })
})

describe('buildTreeViewModel · Sección Contents, todo plegado', () => {
  it('lists the body modules at the root, in document order', () => {
    expect(labels(buildTreeViewModel(defaultEmailDocument, NONE, 'contents').rows)).toEqual(['CTA', 'Deals 1', 'Deals 2', 'Deals 3'])
  })

  it('numbers repeated block types only when the type actually repeats', () => {
    const doc: EmailDocument = {
      ...defaultEmailDocument,
      contenidos: [defaultEmailDocument.contenidos[0], firstDealsBlock(defaultEmailDocument)],
    }
    expect(nodeLabels(buildTreeViewModel(doc, NONE, 'contents').rows)).toEqual(['CTA', 'Deals'])
  })

  it('marks a container as collapsible (key + count) and a leaf block (CTA) as not', () => {
    const block = firstDealsBlock(defaultEmailDocument)
    const rows = nodes(buildTreeViewModel(defaultEmailDocument, NONE, 'contents').rows)
    expect(rows.find((r) => r.label === 'Deals 1')).toMatchObject({ expandKey: blockExpandKey(block.id), expanded: false, childCount: 2 })
    expect(rows.find((r) => r.label === 'CTA')?.expandKey).toBeUndefined()
  })

  it('shows a hint instead of an empty gap when CONTENIDOS has no blocks', () => {
    expect(buildTreeViewModel({ ...defaultEmailDocument, contenidos: [] }, NONE, 'contents').rows).toEqual([
      { kind: 'hint', label: '(sin módulos)', depth: 0 },
    ])
  })
})

describe('buildTreeViewModel · acordeón', () => {
  it('inserts an open block\'s deal cards right below it, one level deeper', () => {
    const block = firstDealsBlock(defaultEmailDocument)
    const vm = buildTreeViewModel(defaultEmailDocument, open(blockExpandKey(block.id)), 'contents')
    expect(labels(vm.rows)).toEqual(['CTA', 'Deals 1', 'Deal 1 de 2', 'Deal 2 de 2', 'Deals 2', 'Deals 3'])
    expect(vm.rows[1]).toMatchObject({ expanded: true })
    expect(vm.rows[2]).toMatchObject({ depth: 1, childCount: 7, expandKey: dealCardExpandKey(block.fields.items[0].id), expanded: false })
  })

  it('opens a card\'s 7 lines as a third level, in the order the user left them', () => {
    const block = firstDealsBlock(defaultEmailDocument)
    const card = block.fields.items[0]
    const rows = buildTreeViewModel(defaultEmailDocument, open(blockExpandKey(block.id), dealCardExpandKey(card.id)), 'contents').rows
    const lines = nodes(rows).filter((r) => r.depth === 2)
    expect(lines).toHaveLength(7)
    expect(lines[0]).toMatchObject({ selection: selectDealCardPiece(card.id, 'copy1') })
    // Las líneas van entre su tarjeta y la tarjeta siguiente.
    expect(labels(rows).indexOf('Deal 2 de 2')).toBe(labels(rows).indexOf('Deal 1 de 2') + 8)
  })

  it('hides a card\'s lines while its BLOCK is folded, even if the card itself is marked open', () => {
    const block = firstDealsBlock(defaultEmailDocument)
    const rows = buildTreeViewModel(defaultEmailDocument, open(dealCardExpandKey(block.fields.items[0].id)), 'contents').rows
    expect(labels(rows)).toEqual(['CTA', 'Deals 1', 'Deals 2', 'Deals 3'])
  })

  it('keeps several containers open at once', () => {
    const [first, second] = dealsBlocks(defaultEmailDocument)
    const rows = buildTreeViewModel(defaultEmailDocument, open(blockExpandKey(first.id), blockExpandKey(second.id)), 'contents').rows
    expect(labels(rows)).toEqual(['CTA', 'Deals 1', 'Deal 1 de 2', 'Deal 2 de 2', 'Deals 2', 'Deal 1 de 2', 'Deal 2 de 2', 'Deals 3'])
  })

  it('opens a molecule module by areas: labelled areas become groups, molecules sit one level below', () => {
    const rows = buildTreeViewModel(col3Doc, open(blockExpandKey('col3')), 'contents').rows
    expect(rows.slice(1).map((r) => [r.kind, r.depth])).toEqual([
      ['group', 1],
      ['node', 2],
      ['group', 1],
      ['hint', 2],
      ['group', 1],
      ['node', 2],
      ['node', 2],
    ])
  })

  it('respects a reordered pieceOrder', () => {
    const block = firstDealsBlock(defaultEmailDocument)
    const card = block.fields.items[0]
    const doc = withPatchedFirstCard(block, {
      ...card.fields,
      pieceOrder: ['cta', 'copy1', 'copy2', 'precio', 'rating', 'tag1', 'tag2'],
    })
    const rows = nodes(buildTreeViewModel(doc, open(blockExpandKey(block.id), dealCardExpandKey(card.id)), 'contents').rows)
    expect(rows.find((r) => r.depth === 2)?.label).toBe('Llamado a la acción')
  })

  it('tags a hidden deal line (derived from its fields) instead of dropping it', () => {
    const block = firstDealsBlock(defaultEmailDocument)
    const card = block.fields.items[0]
    const doc = withPatchedFirstCard(block, { ...card.fields, copy1: richTextFromPlain('') })
    const rows = nodes(buildTreeViewModel(doc, open(blockExpandKey(block.id), dealCardExpandKey(card.id)), 'contents').rows)
    expect(rows.find((r) => r.selection.dealCardPieceType === 'copy1')).toMatchObject({ tag: 'oculta' })
  })

  it('ignores open keys that no longer match anything (a deleted block)', () => {
    expect(buildTreeViewModel(defaultEmailDocument, open('block:ya-no-existe', 'dealCard:tampoco'), 'contents')).toEqual(
      buildTreeViewModel(defaultEmailDocument, NONE, 'contents'),
    )
  })
})

// Pedido explícito del usuario (2026-09-21): las moléculas también se
// reordenan desde el árbol. Cada fila arrastrable declara contra QUÉ lista se
// mueve (`group`) y en qué posición está (`index`) — lo que esperan las 5
// acciones de reorden del store. Con el acordeón, filas de listas distintas
// quedan pegadas, así que el `group` es lo único que evita un drop cruzado.
describe('descriptores de reordenamiento', () => {
  it('lets the CONTENIDOS blocks be reordered against the contenidos list', () => {
    const rows = nodes(buildTreeViewModel(defaultEmailDocument, NONE, 'contents').rows)
    expect(rows[0].reorder).toEqual({ kind: 'block', group: 'contenidos', index: 0, id: defaultEmailDocument.contenidos[0].id })
    expect(rows[1].reorder).toMatchObject({ kind: 'block', group: 'contenidos', index: 1 })
  })

  it('numbers banner pieces against the banner list', () => {
    const rows = buildTreeViewModel(defaultEmailDocument, NONE, 'hero').rows
    expect(rows[0]).toMatchObject({ reorder: { kind: 'bannerItem', group: 'banner', index: 0 } })
    expect(rows[2]).toMatchObject({ reorder: { kind: 'bannerItem', group: 'banner', index: 2 } })
  })

  it('scopes deal cards to their own block, so a card cannot land in another Deals row', () => {
    const [first, second] = dealsBlocks(defaultEmailDocument)
    const rows = nodes(buildTreeViewModel(defaultEmailDocument, open(blockExpandKey(first.id), blockExpandKey(second.id)), 'contents').rows)
    const cards = rows.filter((r) => r.reorder?.kind === 'dealCard')
    expect(cards.map((r) => r.reorder?.group)).toEqual([first.id, first.id, second.id, second.id])
    expect(cards.map((r) => r.reorder?.index)).toEqual([0, 1, 0, 1])
  })

  it('carries both the owning card and the piece type for a deal line (a line has no id of its own)', () => {
    const block = firstDealsBlock(defaultEmailDocument)
    const card = block.fields.items[0]
    const rows = nodes(buildTreeViewModel(defaultEmailDocument, open(blockExpandKey(block.id), dealCardExpandKey(card.id)), 'contents').rows)
    expect(rows.find((r) => r.depth === 2)).toMatchObject({
      reorder: { kind: 'dealCardPiece', group: card.id, index: 0, cardId: card.id, pieceType: 'copy1' },
    })
  })

  it('scopes module molecules to their AREA — reorderModuleItem reads toIndex against the area, not the block', () => {
    const rows = nodes(buildTreeViewModel(col3Doc, open(blockExpandKey('col3')), 'contents').rows)
    expect(rows.slice(1).map((r) => r.reorder)).toEqual([
      { kind: 'moduleItem', group: 'col3:cell1', index: 0, id: 'a' },
      { kind: 'moduleItem', group: 'col3:cell3', index: 0, id: 'b' },
      { kind: 'moduleItem', group: 'col3:cell3', index: 1, id: 'c' },
    ])
  })
})

// Duplicar/eliminar desde el árbol: cada fila declara sobre qué elemento actúa.
describe('destinos de duplicar/eliminar', () => {
  it('targets banner pieces, blocks, deal cards and molecules by their own id', () => {
    const item = defaultEmailDocument.banner.items[0]
    expect(buildTreeViewModel(defaultEmailDocument, NONE, 'hero').rows[0]).toMatchObject({ actionTarget: { kind: 'bannerItem', id: item.id } })
    const block = firstDealsBlock(defaultEmailDocument)
    const rows = nodes(buildTreeViewModel(defaultEmailDocument, open(blockExpandKey(block.id)), 'contents').rows)
    expect(rows.find((r) => r.label === 'Deals 1')).toMatchObject({ actionTarget: { kind: 'block', id: block.id } })
    expect(rows.find((r) => r.label === 'Deal 1 de 2')).toMatchObject({ actionTarget: { kind: 'dealCard', id: block.fields.items[0].id } })
    const col3 = nodes(buildTreeViewModel(col3Doc, open(blockExpandKey('col3')), 'contents').rows)
    expect(col3[1]).toMatchObject({ actionTarget: { kind: 'moduleItem', id: 'a' } })
  })

  it('blocks duplicating a deal card when its row is already full, and says why', () => {
    const block = firstDealsBlock(defaultEmailDocument)
    const full = nodes(buildTreeViewModel(defaultEmailDocument, open(blockExpandKey(block.id)), 'contents').rows).find((r) => r.label === 'Deal 1 de 2')
    expect(full?.duplicateBlockedReason).toMatch(/máximo/)
    const single = withPatchedFirstCard(block, block.fields.items[0].fields)
    const oneCard = nodes(buildTreeViewModel(single, open(blockExpandKey(block.id)), 'contents').rows).find((r) => r.label === 'Deal 1 de 1')
    expect(oneCard?.duplicateBlockedReason).toBeUndefined()
  })

  it('offers none for a deal line — the 7 lines are fixed slots of the card', () => {
    const block = firstDealsBlock(defaultEmailDocument)
    const card = block.fields.items[0]
    const rows = nodes(buildTreeViewModel(defaultEmailDocument, open(blockExpandKey(block.id), dealCardExpandKey(card.id)), 'contents').rows)
    expect(rows.filter((r) => r.depth === 2).every((r) => r.actionTarget === undefined)).toBe(true)
  })
})

describe('expandedKeysForSelection · la mitad "lienzo → árbol"', () => {
  it('opens a deal card\'s BLOCK, not the card itself', () => {
    const block = firstDealsBlock(defaultEmailDocument)
    const card = block.fields.items[0]
    expect(expandedKeysForSelection(defaultEmailDocument, selectDealCard(card.id))).toEqual([blockExpandKey(block.id)])
  })

  it('opens both the block and the card for a deal LINE', () => {
    const block = firstDealsBlock(defaultEmailDocument)
    const card = block.fields.items[0]
    expect(expandedKeysForSelection(defaultEmailDocument, selectDealCardPiece(card.id, 'precio'))).toEqual([
      blockExpandKey(block.id),
      dealCardExpandKey(card.id),
    ])
  })

  it('opens the owning module for a molecule', () => {
    expect(expandedKeysForSelection(col3Doc, selectModuleItem('b'))).toEqual([blockExpandKey('col3')])
  })

  it('opens nothing for things already visible at the root', () => {
    const item = defaultEmailDocument.banner.items[0]
    expect(expandedKeysForSelection(defaultEmailDocument, null)).toEqual([])
    expect(expandedKeysForSelection(defaultEmailDocument, selectSlot('HEADER'))).toEqual([])
    expect(expandedKeysForSelection(defaultEmailDocument, selectBannerItem(item.id))).toEqual([])
    expect(expandedKeysForSelection(defaultEmailDocument, selectBlock(firstDealsBlock(defaultEmailDocument).id))).toEqual([])
    expect(expandedKeysForSelection(defaultEmailDocument, selectGlobalBackground('HERO_BG'))).toEqual([])
  })

  it('opens nothing for an id that no longer resolves', () => {
    expect(expandedKeysForSelection(defaultEmailDocument, selectDealCard('fantasma'))).toEqual([])
    expect(expandedKeysForSelection(defaultEmailDocument, selectModuleItem('fantasma'))).toEqual([])
  })
})

describe('isSameSelection', () => {
  it('distinguishes a slot from something nested inside it', () => {
    const item = defaultEmailDocument.banner.items[0]
    expect(isSameSelection(selectSlot('BANNER'), selectSlot('BANNER'))).toBe(true)
    expect(isSameSelection(selectSlot('BANNER'), selectBannerItem(item.id))).toBe(false)
  })

  it('distinguishes a deal card from one of its lines', () => {
    const card = firstDealsBlock(defaultEmailDocument).fields.items[0]
    expect(isSameSelection(selectDealCard(card.id), selectDealCardPiece(card.id, 'precio'))).toBe(false)
    expect(isSameSelection(selectDealCardPiece(card.id, 'precio'), selectDealCardPiece(card.id, 'precio'))).toBe(true)
  })

  it('handles null on either side', () => {
    expect(isSameSelection(null, null)).toBe(true)
    expect(isSameSelection(null, selectSlot('HEADER'))).toBe(false)
  })
})
