// ============================================================================
// El modelo de vista del árbol de componentes (ui/ComponentTree.tsx) — pedido
// explícito del usuario (2026-09-21): una vista general de la estructura del
// mail que, al entrar a un contenedor (el banner, un bloque con moléculas, una
// tarjeta de deal), muestra SOLO los hijos de ese contenedor, con forma de
// volver a la vista general.
//
// Vive como módulo PURO (sin JSX) por el mismo motivo que themeDefaults.ts o
// ui/dropIndex.ts: la parte con reglas de verdad —qué filas salen, qué se
// puede abrir, a dónde vuelve el botón de atrás, qué contenedor revelar cuando
// la selección viene del lienzo— se testea sin montar React.
//
// NO inventa un modelo de selección nuevo: cada fila carga la `Selection` que
// ya usan el Inspector y el Viewport (ui/selection.ts), así que el resaltado
// en el lienzo sale gratis en las 2 direcciones — el árbol y el lienzo leen el
// MISMO `selected`.
// ============================================================================
import type { EmailDocument } from '../model'
import { SLOT_LABELS } from '../registry'
import { contentBlockRegistry, getModuleAreas } from '../contentBlockRegistry'
import { getBannerItemDef } from '../bannerItemRegistry'
import { getModuleItemDef } from '../bodyMoleculeRegistry'
import { findDealsBlockByCard } from '../components/deals/blocks'
import { findModuleBlockByItem } from '../components/contentModules/blocks'
import {
  DEAL_CARD_PIECE_LABELS,
  DEAL_CARD_PIECE_TYPES,
  isDealCardPieceHidden,
  normalizePieceOrder,
  type DealCardPieceType,
} from '../components/deals/schema'
import type { ModuleItem } from '../moduleItems/schemas'
import type { DealCard } from '../components/deals/schema'
import {
  selectBannerItem,
  selectBlock,
  selectDealCard,
  selectDealCardPiece,
  selectGlobalBackground,
  selectModuleItem,
  selectSlot,
  SECTION_LABELS,
  type Selection,
} from './selection'

/**
 * Qué contenedor está abierto en el árbol. `null` = la vista general. No es
 * una `Selection`: el usuario puede estar VIENDO los hijos del banner con una
 * pieza de otro lado seleccionada (o nada seleccionado).
 */
export type TreeFocus =
  | { kind: 'banner' }
  | { kind: 'block'; blockId: string }
  | { kind: 'dealCard'; dealCardId: string }

/**
 * Cómo se arrastra una fila para reordenarla — pedido explícito del usuario
 * (2026-09-21): las moléculas también se reordenan desde el árbol, no solo
 * desde el lienzo.
 *
 * `index` es la posición de la fila dentro de SU lista hermana, que es lo que
 * esperan las acciones del store (`toIndex` se interpreta ANTES de sacar la
 * fila arrastrada; el ajuste lo hace el store, ver reorderBannerItem).
 *
 * `group` acota el drop a la MISMA lista: 2 áreas de un mismo módulo (COL1,
 * COL3, Cupones) se dibujan seguidas en el árbol, pero reorderModuleItem
 * interpreta su `toIndex` contra el área del item arrastrado — sin esto,
 * arrastrar de un área a otra movería la molécula a un índice de otra lista.
 */
export type TreeReorder =
  | { kind: 'block'; group: string; index: number; id: string }
  | { kind: 'bannerItem'; group: string; index: number; id: string }
  | { kind: 'dealCard'; group: string; index: number; id: string }
  | { kind: 'dealCardPiece'; group: string; index: number; cardId: string; pieceType: DealCardPieceType }
  | { kind: 'moduleItem'; group: string; index: number; id: string }

export interface TreeNodeRow {
  kind: 'node'
  /** Qué queda seleccionado al clickear la fila — la misma `Selection` que
   *  entiende el Viewport, de ahí el resaltado bidireccional. */
  selection: Selection
  label: string
  /** Presente si la fila es un contenedor: a dónde baja el árbol al abrirla. */
  drillTo?: TreeFocus
  /** Cuántos hijos tiene el contenedor (para el contador de la fila). */
  childCount?: number
  /** Etiqueta chica a la derecha (ej. 'oculta', 'no aplica'). */
  tag?: string
  /** Presente si la fila se puede arrastrar para reordenarla. */
  reorder?: TreeReorder
  /** Indentación: 0 = raíz, 1 = un nivel adentro (ej. Header dentro de Hero). */
  depth: number
}

/** Encabezado de grupo, no seleccionable (ej. "Contenidos", o el label de un área). */
export interface TreeGroupRow {
  kind: 'group'
  label: string
  depth: number
}

/** Fila muerta para un contenedor vacío — el árbol miente menos mostrando
 *  "(vacío)" que omitiendo el grupo entero. */
export interface TreeHintRow {
  kind: 'hint'
  label: string
  depth: number
}

export type TreeRow = TreeNodeRow | TreeGroupRow | TreeHintRow

export interface TreeViewModel {
  /** Qué contenedor se está viendo; `null` en la vista general. */
  title: string | null
  /** Botón de atrás: a dónde vuelve y con qué texto. `null` en la vista general. */
  back: { label: string; to: TreeFocus | null } | null
  rows: TreeRow[]
}

/** Los hijos de un bloque de CONTENIDOS, si es un contenedor. */
function blockChildCount(block: EmailDocument['contenidos'][number]): number | null {
  if (block.type === 'DEALS') return block.fields.items.length
  if (contentBlockRegistry[block.type]?.usesModuleItems) {
    return (block.fields as { items: ModuleItem[] }).items.length
  }
  return null
}

const moduleItemLabel = (item: ModuleItem): string => getModuleItemDef(item.type)?.label ?? item.type

/**
 * El label de un bloque, numerado cuando su tipo se repite — un mail con 3
 * filas de Deals mostraba 3 filas "Deals" idénticas, imposibles de distinguir.
 * Con una sola instancia del tipo no se numera, para no ensuciar el caso común.
 */
function blockLabels(contenidos: EmailDocument['contenidos']): string[] {
  const totalByType = new Map<string, number>()
  for (const block of contenidos) {
    totalByType.set(block.type, (totalByType.get(block.type) ?? 0) + 1)
  }
  const seenByType = new Map<string, number>()
  return contenidos.map((block) => {
    const base = contentBlockRegistry[block.type]?.label ?? block.type
    if ((totalByType.get(block.type) ?? 0) < 2) return base
    const position = (seenByType.get(block.type) ?? 0) + 1
    seenByType.set(block.type, position)
    return `${base} ${position}`
  })
}

/** "Deal 1 de 2" — mismo formato que ui/InspectorPanel.tsx y targetLabel.ts. */
const dealCardLabel = (cards: DealCard[], cardId: string): string => {
  const position = cards.findIndex((c) => c.id === cardId) + 1
  return `Deal ${position} de ${cards.length}`
}

/**
 * La vista general, con la forma REAL del mail (pedido explícito del usuario,
 * 2026-09-21): las 3 secciones del maestro — HERO, CONTENTS y FOOTER, ver
 * CLAUDE.md del repo raíz §1.1 — y adentro lo que cada una envuelve.
 *
 *   Hero            ← header + banner
 *   Contenidos      ← los bloques de body
 *   Footer
 *
 * Hero y Contenidos son filas SELECCIONABLES: lo único editable de una
 * sección es su fondo (`HERO_BG`/`CONTENTS_BG`, ver ui/selection.ts), así que
 * clickearlas abre ese panel. Por eso los 2 salieron del catálogo de arriba —
 * su lugar natural es acá, donde se ve qué envuelve cada una.
 */
function generalRows(doc: EmailDocument): TreeRow[] {
  const rows: TreeRow[] = [
    { kind: 'node', selection: selectGlobalBackground('HERO_BG'), label: SECTION_LABELS.HERO_BG, depth: 0 },
    { kind: 'node', selection: selectSlot('HEADER'), label: SLOT_LABELS.HEADER, depth: 1 },
    {
      kind: 'node',
      selection: selectSlot('BANNER'),
      label: SLOT_LABELS.BANNER,
      tag: doc.banner.bannerType,
      depth: 1,
      childCount: doc.banner.items.length,
      drillTo: { kind: 'banner' },
    },
    { kind: 'node', selection: selectGlobalBackground('CONTENTS_BG'), label: SECTION_LABELS.CONTENTS_BG, depth: 0 },
  ]

  if (doc.contenidos.length === 0) {
    rows.push({ kind: 'hint', label: '(sin bloques)', depth: 1 })
  } else {
    const labels = blockLabels(doc.contenidos)
    doc.contenidos.forEach((block, index) => {
      const childCount = blockChildCount(block)
      rows.push({
        kind: 'node',
        selection: selectBlock(block.id),
        label: labels[index],
        depth: 1,
        reorder: { kind: 'block', group: 'contenidos', index, id: block.id },
        ...(childCount === null ? {} : { childCount, drillTo: { kind: 'block', blockId: block.id } as TreeFocus }),
      })
    })
  }

  // El footer va FUERA de las 2 secciones anteriores — no es un detalle
  // cosmético del árbol, es dónde vive en el maestro (CLAUDE.md §1.1).
  rows.push({ kind: 'node', selection: selectSlot('FOOTER'), label: SLOT_LABELS.FOOTER, depth: 0 })
  return rows
}

/** Las piezas del banner. Una pieza que el maestro no renderiza en la
 *  orientación actual (`def.orientations`) se muestra marcada en vez de
 *  ocultarse: sigue viva en el documento, ver components/banner/render.ts. */
function bannerRows(doc: EmailDocument): TreeRow[] {
  if (doc.banner.items.length === 0) return [{ kind: 'hint', label: '(sin piezas)', depth: 0 }]
  return doc.banner.items.map((item, index): TreeRow => {
    const def = getBannerItemDef(item.type)
    const applies = def === undefined || def.orientations.includes(doc.banner.bannerType)
    return {
      kind: 'node',
      selection: selectBannerItem(item.id),
      label: def?.label ?? item.type,
      depth: 0,
      reorder: { kind: 'bannerItem', group: 'banner', index, id: item.id },
      ...(applies ? {} : { tag: 'no aplica' }),
    }
  })
}

/** Las 7 líneas de una tarjeta de deal, en el orden que el usuario dejó
 *  (`fields.pieceOrder`). Las ocultas se muestran marcadas: son las que el
 *  panel de la tarjeta ofrece restaurar, y desde acá se pueden seleccionar
 *  para ver sus campos (el lienzo no las resalta porque no las dibuja). */
function dealCardRows(card: DealCard): TreeRow[] {
  return normalizePieceOrder(card.fields.pieceOrder).map((pieceType: DealCardPieceType, index): TreeRow => {
    const hidden = isDealCardPieceHidden(card.fields, pieceType)
    return {
      kind: 'node',
      selection: selectDealCardPiece(card.id, pieceType),
      label: DEAL_CARD_PIECE_LABELS[pieceType],
      depth: 0,
      reorder: { kind: 'dealCardPiece', group: card.id, index, cardId: card.id, pieceType },
      ...(hidden ? { tag: 'oculta' } : {}),
    }
  })
}

/** Los hijos de un bloque de CONTENIDOS: tarjetas si es DEALS, moléculas
 *  agrupadas por área si usa el motor de área libre. */
function blockRows(block: EmailDocument['contenidos'][number]): TreeRow[] {
  if (block.type === 'DEALS') {
    const cards = block.fields.items
    if (cards.length === 0) return [{ kind: 'hint', label: '(sin deals)', depth: 0 }]
    return cards.map((card, index): TreeRow => ({
      kind: 'node',
      selection: selectDealCard(card.id),
      label: dealCardLabel(cards, card.id),
      depth: 0,
      childCount: DEAL_CARD_PIECE_TYPES.length,
      drillTo: { kind: 'dealCard', dealCardId: card.id },
      reorder: { kind: 'dealCard', group: block.id, index, id: card.id },
    }))
  }

  const def = contentBlockRegistry[block.type]
  if (!def?.usesModuleItems) return [{ kind: 'hint', label: '(sin piezas editables)', depth: 0 }]

  const items = (block.fields as { items: ModuleItem[] }).items
  const areas = getModuleAreas(def)
  const rows: TreeRow[] = []
  for (const area of areas) {
    // Un módulo de una sola área implícita ('main', sin label) no necesita
    // encabezado; COL1/COL3/CUPONES sí, o no se sabe en qué celda cae cada una.
    const depth = area.label ? 1 : 0
    if (area.label) rows.push({ kind: 'group', label: area.label, depth: 0 })
    const areaItems = items.filter((item) => item.areaKey === area.key)
    if (areaItems.length === 0) {
      rows.push({ kind: 'hint', label: '(vacío)', depth })
      continue
    }
    areaItems.forEach((item, index) => {
      rows.push({
        kind: 'node',
        selection: selectModuleItem(item.id),
        label: moduleItemLabel(item),
        depth,
        // El grupo lleva el área: reorderModuleItem interpreta su `toIndex`
        // contra los items de ESA área, no contra toda la lista del bloque.
        reorder: { kind: 'moduleItem', group: `${block.id}:${area.key}`, index, id: item.id },
      })
    })
  }
  return rows
}

/**
 * El árbol para un `focus` dado. Un `focus` que ya no resuelve contra el
 * documento (el bloque/tarjeta se eliminó desde el lienzo) cae a la vista
 * general en vez de mostrar una lista vacía sin explicación.
 */
export function buildTreeViewModel(doc: EmailDocument, focus: TreeFocus | null): TreeViewModel {
  const general = (): TreeViewModel => ({ title: null, back: null, rows: generalRows(doc) })
  if (!focus) return general()

  if (focus.kind === 'banner') {
    return {
      title: SLOT_LABELS.BANNER,
      back: { label: 'Volver a la vista general', to: null },
      rows: bannerRows(doc),
    }
  }

  // El label numerado (blockLabels) y no el del registry: si hay 3 filas de
  // Deals, el título y el botón de atrás tienen que decir CUÁL.
  if (focus.kind === 'block') {
    const index = doc.contenidos.findIndex((b) => b.id === focus.blockId)
    if (index === -1) return general()
    return {
      title: blockLabels(doc.contenidos)[index],
      back: { label: 'Volver a la vista general', to: null },
      rows: blockRows(doc.contenidos[index]),
    }
  }

  const found = findDealsBlockByCard(doc.contenidos, focus.dealCardId)
  const card = found?.block.fields.items.find((c) => c.id === focus.dealCardId)
  if (!found || !card) return general()
  return {
    title: dealCardLabel(found.block.fields.items, card.id),
    back: {
      label: `Volver a ${blockLabels(doc.contenidos)[found.index]}`,
      to: { kind: 'block', blockId: found.block.id },
    },
    rows: dealCardRows(card),
  }
}

/**
 * Qué contenedor hay que abrir para que `selected` sea VISIBLE en el árbol —
 * la mitad "lienzo → árbol" del pedido del usuario: al clickear una pieza en
 * el lienzo, el árbol baja solo a donde esa pieza vive.
 *
 * Revela la selección, no baja más: una tarjeta de deal seleccionada abre su
 * BLOQUE (donde la tarjeta es una fila), no la tarjeta. Una selección que ya
 * se ve en la vista general (un slot, un bloque) devuelve `null`.
 */
export function focusForSelection(doc: EmailDocument, selected: Selection | null): TreeFocus | null {
  if (!selected) return null

  if (selected.slot === 'BANNER' && selected.bannerItemId) return { kind: 'banner' }

  if (selected.slot === 'CONTENIDOS') {
    if (selected.dealCardId && selected.dealCardPieceType) {
      return { kind: 'dealCard', dealCardId: selected.dealCardId }
    }
    if (selected.dealCardId) {
      const found = findDealsBlockByCard(doc.contenidos, selected.dealCardId)
      return found ? { kind: 'block', blockId: found.block.id } : null
    }
    if (selected.moduleItemId) {
      const found = findModuleBlockByItem(doc.contenidos, selected.moduleItemId)
      return found ? { kind: 'block', blockId: found.block.id } : null
    }
  }

  return null
}

/**
 * Igualdad de `Selection` — para saber qué fila del árbol está activa. Se
 * compara la selección COMPLETA en vez de reusar los 6 `isXSelected` de
 * ui/selection.ts porque cada fila ya carga su propia `Selection` exacta: un
 * solo chequeo en vez de un switch por forma.
 */
export function isSameSelection(a: Selection | null, b: Selection | null): boolean {
  if (!a || !b) return a === b
  return (
    a.slot === b.slot &&
    a.blockId === b.blockId &&
    a.bannerItemId === b.bannerItemId &&
    a.dealCardId === b.dealCardId &&
    a.dealCardPieceType === b.dealCardPieceType &&
    a.moduleItemId === b.moduleItemId
  )
}
