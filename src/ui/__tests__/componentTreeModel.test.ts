import { describe, expect, it } from 'vitest'
import { defaultEmailDocument } from '../../registry'
import type { ContentBlock, DealsBlock, EmailDocument } from '../../model'
import type { DealCardFields } from '../../components/deals/schema'
import { contentBlockRegistry } from '../../contentBlockRegistry'
import { bodyMoleculeRegistry } from '../../bodyMoleculeRegistry'

/** Los defaults reales de la molécula, para no inventar un shape en el test. */
const bulletIconFields = bodyMoleculeRegistry.BULLET_ICONO_SIMPLE.defaultFields
import { buildTreeViewModel, focusForSelection, isSameSelection, type TreeRow } from '../componentTreeModel'
import {
  selectBannerItem,
  selectBlock,
  selectDealCard,
  selectDealCardPiece,
  selectGlobalBackground,
  selectModuleItem,
  selectSlot,
} from '../selection'

const nodeLabels = (rows: TreeRow[]): string[] => rows.filter((r) => r.kind === 'node').map((r) => r.label)
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

describe('buildTreeViewModel · vista general', () => {
  // Las 3 secciones del maestro (CLAUDE.md §1.1): HERO envuelve header+banner,
  // CONTENTS los bloques de body, y el footer va FUERA de las dos.
  it('nests the document under its real sections: Hero > Header/Banner, Contenidos > blocks, Footer apart', () => {
    const vm = buildTreeViewModel(defaultEmailDocument, null)
    expect(vm.title).toBeNull()
    expect(vm.back).toBeNull()
    expect(labels(vm.rows)).toEqual([
      'Hero',
      'Header',
      'Banner',
      'Contenidos',
      'CTA',
      'Deals 1',
      'Deals 2',
      'Deals 3',
      'Footer',
    ])
    const depthOf = (label: string) => vm.rows.find((r) => r.label === label)?.depth
    expect([depthOf('Hero'), depthOf('Contenidos'), depthOf('Footer')]).toEqual([0, 0, 0])
    expect([depthOf('Header'), depthOf('Banner'), depthOf('CTA'), depthOf('Deals 1')]).toEqual([1, 1, 1, 1])
  })

  it('makes the 2 sections selectable — their only editable thing is their background', () => {
    const vm = buildTreeViewModel(defaultEmailDocument, null)
    expect(vm.rows.find((r) => r.label === 'Hero')).toMatchObject({
      kind: 'node',
      selection: selectGlobalBackground('HERO_BG'),
    })
    expect(vm.rows.find((r) => r.label === 'Contenidos')).toMatchObject({
      kind: 'node',
      selection: selectGlobalBackground('CONTENTS_BG'),
    })
  })

  it('numbers repeated block types only when the type actually repeats', () => {
    const doc: EmailDocument = {
      ...defaultEmailDocument,
      contenidos: [defaultEmailDocument.contenidos[0], firstDealsBlock(defaultEmailDocument)],
    }
    // 1 CTA + 1 Deals ⇒ ninguno numerado.
    expect(nodeLabels(buildTreeViewModel(doc, null).rows)).toEqual([
      'Hero',
      'Header',
      'Banner',
      'Contenidos',
      'CTA',
      'Deals',
      'Footer',
    ])
  })

  it('marks the banner as a container (its piece count + drill target) and tags its type', () => {
    const vm = buildTreeViewModel(defaultEmailDocument, null)
    const banner = vm.rows.find((r) => r.kind === 'node' && r.label === 'Banner')
    expect(banner).toMatchObject({
      childCount: defaultEmailDocument.banner.items.length,
      drillTo: { kind: 'banner' },
      tag: 'vertical',
    })
  })

  it('offers no drill for a block that cannot contain anything (CTA)', () => {
    const vm = buildTreeViewModel(defaultEmailDocument, null)
    const cta = vm.rows.find((r) => r.kind === 'node' && r.label === 'CTA')
    expect(cta).toBeDefined()
    expect(cta && 'drillTo' in cta ? cta.drillTo : undefined).toBeUndefined()
  })

  it('shows a hint instead of an empty gap when CONTENIDOS has no blocks', () => {
    const vm = buildTreeViewModel({ ...defaultEmailDocument, contenidos: [] }, null)
    expect(vm.rows.some((r) => r.kind === 'hint' && r.label === '(sin bloques)')).toBe(true)
  })

})

describe('buildTreeViewModel · dentro de un contenedor', () => {
  it('shows the banner pieces, with a back row to the general view', () => {
    const vm = buildTreeViewModel(defaultEmailDocument, { kind: 'banner' })
    expect(vm.title).toBe('Banner')
    expect(vm.back).toEqual({ label: 'Volver a la vista general', to: null })
    expect(nodeLabels(vm.rows)).toEqual([
      'Promo',
      'Imagen automática (molécula)',
      'Texto complementario',
      'Imagen de alto fijo',
      'Tags',
    ])
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
    expect(buildTreeViewModel(doc, { kind: 'banner' }).rows[0]).toMatchObject({ tag: 'no aplica' })
  })

  it('shows the cards of a DEALS block, each drillable into its 7 lines', () => {
    const block = firstDealsBlock(defaultEmailDocument)
    const vm = buildTreeViewModel(defaultEmailDocument, { kind: 'block', blockId: block.id })
    expect(vm.title).toBe('Deals 1')
    expect(nodeLabels(vm.rows)).toEqual(['Deal 1 de 2', 'Deal 2 de 2'])
    expect(vm.rows[0]).toMatchObject({ childCount: 7, drillTo: { kind: 'dealCard', dealCardId: block.fields.items[0].id } })
  })

  it('shows a deal card\'s 7 lines in the order the user left them, and goes back to the owning block', () => {
    const block = firstDealsBlock(defaultEmailDocument)
    const card = block.fields.items[0]
    const vm = buildTreeViewModel(defaultEmailDocument, { kind: 'dealCard', dealCardId: card.id })
    expect(vm.title).toBe('Deal 1 de 2')
    expect(vm.back).toEqual({ label: 'Volver a Deals 1', to: { kind: 'block', blockId: block.id } })
    expect(nodeLabels(vm.rows)).toHaveLength(7)
    expect(vm.rows[0]).toMatchObject({ selection: selectDealCardPiece(card.id, 'copy1') })
  })

  it('respects a reordered pieceOrder', () => {
    const block = firstDealsBlock(defaultEmailDocument)
    const card = block.fields.items[0]
    const doc = withPatchedFirstCard(block, {
      ...card.fields,
      pieceOrder: ['cta', 'copy1', 'copy2', 'precio', 'rating', 'tag1', 'tag2'],
    })
    const vm = buildTreeViewModel(doc, { kind: 'dealCard', dealCardId: card.id })
    expect(nodeLabels(vm.rows)[0]).toBe('Llamado a la acción')
  })

  it('tags a hidden deal line (derived from its fields) instead of dropping it', () => {
    const block = firstDealsBlock(defaultEmailDocument)
    const card = block.fields.items[0]
    const doc = withPatchedFirstCard(block, { ...card.fields, copy1: '' })
    const vm = buildTreeViewModel(doc, { kind: 'dealCard', dealCardId: card.id })
    expect(vm.rows.find((r) => r.kind === 'node' && r.selection.dealCardPieceType === 'copy1')).toMatchObject({ tag: 'oculta' })
  })

  it('falls back to the general view when the focused container no longer exists', () => {
    const stale = buildTreeViewModel(defaultEmailDocument, { kind: 'block', blockId: 'ya-no-existe' })
    expect(stale).toEqual(buildTreeViewModel(defaultEmailDocument, null))
    const staleCard = buildTreeViewModel(defaultEmailDocument, { kind: 'dealCard', dealCardId: 'ya-no-existe' })
    expect(staleCard).toEqual(buildTreeViewModel(defaultEmailDocument, null))
  })
})

// Pedido explícito del usuario (2026-09-21): las moléculas también se
// reordenan desde el árbol. Cada fila arrastrable declara contra QUÉ lista se
// mueve (`group`) y en qué posición está (`index`) — lo que esperan las 5
// acciones de reorden del store.
describe('descriptores de reordenamiento', () => {
  it('lets the CONTENIDOS blocks be reordered, but not the fixed sections/slots', () => {
    const vm = buildTreeViewModel(defaultEmailDocument, null)
    const reorderOf = (label: string) => {
      const row = vm.rows.find((r) => r.label === label)
      return row?.kind === 'node' ? row.reorder : undefined
    }
    expect(reorderOf('CTA')).toEqual({ kind: 'block', group: 'contenidos', index: 0, id: defaultEmailDocument.contenidos[0].id })
    expect(reorderOf('Deals 1')).toMatchObject({ kind: 'block', group: 'contenidos', index: 1 })
    // La estructura del maestro no se reordena: Hero/Contenidos/Header/Banner/Footer son fijos.
    for (const label of ['Hero', 'Header', 'Banner', 'Contenidos', 'Footer']) {
      expect(reorderOf(label)).toBeUndefined()
    }
  })

  it('numbers banner pieces against the banner list', () => {
    const rows = buildTreeViewModel(defaultEmailDocument, { kind: 'banner' }).rows
    expect(rows[0]).toMatchObject({ reorder: { kind: 'bannerItem', group: 'banner', index: 0 } })
    expect(rows[2]).toMatchObject({ reorder: { kind: 'bannerItem', group: 'banner', index: 2 } })
  })

  it('scopes deal cards to their own block, so a card cannot land in another Deals row', () => {
    const [first, second] = dealsBlocks(defaultEmailDocument)
    const firstRows = buildTreeViewModel(defaultEmailDocument, { kind: 'block', blockId: first.id }).rows
    const secondRows = buildTreeViewModel(defaultEmailDocument, { kind: 'block', blockId: second.id }).rows
    expect(firstRows[0]).toMatchObject({ reorder: { kind: 'dealCard', group: first.id, index: 0 } })
    expect(secondRows[0]).toMatchObject({ reorder: { kind: 'dealCard', group: second.id, index: 0 } })
    expect(first.id).not.toBe(second.id)
  })

  it('carries both the owning card and the piece type for a deal line (a line has no id of its own)', () => {
    const card = firstDealsBlock(defaultEmailDocument).fields.items[0]
    const rows = buildTreeViewModel(defaultEmailDocument, { kind: 'dealCard', dealCardId: card.id }).rows
    expect(rows[0]).toMatchObject({
      reorder: { kind: 'dealCardPiece', group: card.id, index: 0, cardId: card.id, pieceType: 'copy1' },
    })
  })

  it('scopes module molecules to their AREA — reorderModuleItem reads toIndex against the area, not the block', () => {
    // COL3 declara 3 áreas (cell1/cell2/cell3) sobre una sola lista plana.
    const doc: EmailDocument = {
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
    const rows = buildTreeViewModel(doc, { kind: 'block', blockId: 'col3' }).rows
    const reorders = rows.filter((r) => r.kind === 'node').map((r) => r.reorder)
    // Cada área arranca su propia numeración, con su propio `group`.
    expect(reorders).toEqual([
      { kind: 'moduleItem', group: 'col3:cell1', index: 0, id: 'a' },
      { kind: 'moduleItem', group: 'col3:cell3', index: 0, id: 'b' },
      { kind: 'moduleItem', group: 'col3:cell3', index: 1, id: 'c' },
    ])
  })
})

describe('focusForSelection · la mitad "lienzo → árbol"', () => {
  it('reveals a banner piece by opening the banner', () => {
    const item = defaultEmailDocument.banner.items[0]
    expect(focusForSelection(defaultEmailDocument, selectBannerItem(item.id))).toEqual({ kind: 'banner' })
  })

  it('reveals a deal card by opening its BLOCK, not the card itself', () => {
    const block = firstDealsBlock(defaultEmailDocument)
    const card = block.fields.items[0]
    expect(focusForSelection(defaultEmailDocument, selectDealCard(card.id))).toEqual({ kind: 'block', blockId: block.id })
  })

  it('reveals a deal LINE by opening its card', () => {
    const card = firstDealsBlock(defaultEmailDocument).fields.items[0]
    expect(focusForSelection(defaultEmailDocument, selectDealCardPiece(card.id, 'precio'))).toEqual({
      kind: 'dealCard',
      dealCardId: card.id,
    })
  })

  it('stays on the general view for things already visible there', () => {
    expect(focusForSelection(defaultEmailDocument, null)).toBeNull()
    expect(focusForSelection(defaultEmailDocument, selectSlot('HEADER'))).toBeNull()
    expect(focusForSelection(defaultEmailDocument, selectSlot('BANNER'))).toBeNull()
    expect(focusForSelection(defaultEmailDocument, selectBlock(firstDealsBlock(defaultEmailDocument).id))).toBeNull()
    // Los fondos de sección no están en el árbol (no son estructura).
    expect(focusForSelection(defaultEmailDocument, selectGlobalBackground('HERO_BG'))).toBeNull()
  })

  it('returns null for an id that no longer resolves, instead of a focus nobody can render', () => {
    expect(focusForSelection(defaultEmailDocument, selectDealCard('fantasma'))).toBeNull()
    expect(focusForSelection(defaultEmailDocument, selectModuleItem('fantasma'))).toBeNull()
  })
})

describe('isSameSelection', () => {
  it('distinguishes a slot from something nested inside it', () => {
    expect(isSameSelection(selectSlot('BANNER'), selectSlot('BANNER'))).toBe(true)
    expect(isSameSelection(selectSlot('BANNER'), selectBannerItem('i1'))).toBe(false)
    expect(isSameSelection(selectBlock('b1'), selectBlock('b2'))).toBe(false)
  })

  it('distinguishes a deal card from one of its lines', () => {
    expect(isSameSelection(selectDealCard('c1'), selectDealCardPiece('c1', 'copy1'))).toBe(false)
    expect(isSameSelection(selectDealCardPiece('c1', 'copy1'), selectDealCardPiece('c1', 'copy2'))).toBe(false)
    expect(isSameSelection(selectDealCardPiece('c1', 'copy1'), selectDealCardPiece('c1', 'copy1'))).toBe(true)
  })

  it('handles null on either side', () => {
    expect(isSameSelection(null, null)).toBe(true)
    expect(isSameSelection(null, selectSlot('HEADER'))).toBe(false)
    expect(isSameSelection(selectSlot('HEADER'), null)).toBe(false)
  })
})
