// ============================================================================
// El modelo de vista de los árboles de componentes (ui/ComponentTree.tsx). Hay
// uno por pestaña del panel izquierdo (ui/LeftPanel.tsx): el de Sección Hero
// lista las piezas del banner; el de Sección Contents, los bloques de body como
// acordeón (cada contenedor se despliega en su sitio).
//
// Vive como módulo PURO (sin JSX) por el mismo motivo que themeDefaults.ts o
// ui/dropIndex.ts: la parte con reglas de verdad —qué filas salen, qué se
// puede desplegar, qué contenedores abrir cuando
// la selección viene del lienzo— se testea sin montar React.
//
// NO inventa un modelo de selección nuevo: cada fila carga la `Selection` que
// ya usan el Inspector y el Viewport (ui/selection.ts), así que el resaltado
// en el lienzo sale gratis en las 2 direcciones — el árbol y el lienzo leen el
// MISMO `selected`.
// ============================================================================
import type { EmailDocument } from '../model'
import { contentBlockRegistry, getModuleAreas } from '../contentBlockRegistry'
import { getBannerItemDef } from '../bannerItemRegistry'
import { getModuleItemDef } from '../bodyMoleculeRegistry'
import { findDealsBlockByCard } from '../components/deals/blocks'
import { findModuleBlockByItem } from '../components/contentModules/blocks'
import {
  DEAL_CARD_PIECE_LABELS,
  DEAL_CARD_PIECE_TYPES,
  DEALS_MAX_CARDS,
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
  selectModuleItem,
  type Selection,
} from './selection'

/** Qué árbol se arma: las piezas del banner o los bloques de body. */
export type TreeSection = 'hero' | 'contents'

/** Clave de un contenedor desplegable del árbol de Contents. */
export const blockExpandKey = (blockId: string): string => `block:${blockId}`
export const dealCardExpandKey = (dealCardId: string): string => `dealCard:${dealCardId}`

/**
 * Cómo se arrastra una fila para reordenarla — pedido explícito del usuario
 * (2026-09-21): las moléculas también se reordenan desde el árbol, no solo
 * desde el lienzo.
 *
 * `index` es la posición de la fila dentro de SU lista hermana, que es lo que
 * esperan las acciones del store (`toIndex` se interpreta ANTES de sacar la
 * fila arrastrada; el ajuste lo hace el store, ver reorderBannerItem).
 *
 * `group` acota el drop a la MISMA lista: con el acordeón, filas de listas
 * distintas (2 áreas de un módulo, las tarjetas de 2 bloques de Deals) se
 * dibujan seguidas, y cada acción del store interpreta su `toIndex` contra la
 * lista del elemento arrastrado.
 */
export type TreeReorder =
  | { kind: 'block'; group: string; index: number; id: string }
  | { kind: 'bannerItem'; group: string; index: number; id: string }
  | { kind: 'dealCard'; group: string; index: number; id: string }
  | { kind: 'dealCardPiece'; group: string; index: number; cardId: string; pieceType: DealCardPieceType }
  | { kind: 'moduleItem'; group: string; index: number; id: string }

/** Sobre qué elemento actúan los botones duplicar/eliminar de una fila. Las
 *  líneas de un deal no tienen: son slots fijos de la tarjeta. */
export type TreeActionTarget =
  | { kind: 'block'; id: string }
  | { kind: 'bannerItem'; id: string }
  | { kind: 'dealCard'; id: string }
  | { kind: 'moduleItem'; id: string }

export interface TreeNodeRow {
  kind: 'node'
  /** Qué queda seleccionado al clickear la fila — la misma `Selection` que
   *  entiende el Viewport, de ahí el resaltado bidireccional. */
  selection: Selection
  label: string
  /** Presente si la fila es un contenedor desplegable: su clave en `expanded`. */
  expandKey?: string
  /** Si el contenedor está desplegado (sus hijos van en las filas siguientes). */
  expanded?: boolean
  /** Cuántos hijos tiene el contenedor (para el contador de la fila). */
  childCount?: number
  /** Etiqueta chica a la derecha (ej. 'oculta', 'no aplica'). */
  tag?: string
  /** Presente si la fila se puede arrastrar para reordenarla. */
  reorder?: TreeReorder
  /** Presente si la fila ofrece duplicar/eliminar. */
  actionTarget?: TreeActionTarget
  /** Por qué duplicar no está disponible (ej. la fila de deals ya está llena). */
  duplicateBlockedReason?: string
  /** Sangría: 0 = raíz, 1 = hijo de un bloque, 2 = nieto (línea de un deal). */
  depth: number
}

/** Encabezado de grupo, no seleccionable (el label de un área de un módulo). */
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
 * El árbol de Contents: los bloques de body en su orden real, cada contenedor
 * seguido de sus hijos si está desplegado (acordeón — pedido del usuario,
 * 2026-09-25: varios abiertos a la vez, sin cambiar de vista).
 */
function contentsRows(doc: EmailDocument, expanded: ReadonlySet<string>): TreeRow[] {
  if (doc.contenidos.length === 0) return [{ kind: 'hint', label: '(sin módulos)', depth: 0 }]
  const labels = blockLabels(doc.contenidos)
  return doc.contenidos.flatMap((block, index): TreeRow[] => {
    const childCount = blockChildCount(block)
    const expandKey = blockExpandKey(block.id)
    const isOpen = childCount !== null && expanded.has(expandKey)
    const row: TreeNodeRow = {
      kind: 'node',
      selection: selectBlock(block.id),
      label: labels[index],
      depth: 0,
      reorder: { kind: 'block', group: 'contenidos', index, id: block.id },
      actionTarget: { kind: 'block', id: block.id },
      ...(childCount === null ? {} : { childCount, expandKey, expanded: isOpen }),
    }
    return isOpen ? [row, ...blockRows(block, expanded, 1)] : [row]
  })
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
      actionTarget: { kind: 'bannerItem', id: item.id },
      ...(applies ? {} : { tag: 'no aplica' }),
    }
  })
}

/** Las 7 líneas de una tarjeta de deal, en el orden que el usuario dejó
 *  (`fields.pieceOrder`). Las ocultas se muestran marcadas: son las que el
 *  panel de la tarjeta ofrece restaurar, y desde acá se pueden seleccionar
 *  para ver sus campos (el lienzo no las resalta porque no las dibuja). */
function dealCardRows(card: DealCard, depth: number): TreeRow[] {
  return normalizePieceOrder(card.fields.pieceOrder).map((pieceType: DealCardPieceType, index): TreeRow => {
    const hidden = isDealCardPieceHidden(card.fields, pieceType)
    return {
      kind: 'node',
      selection: selectDealCardPiece(card.id, pieceType),
      label: DEAL_CARD_PIECE_LABELS[pieceType],
      depth,
      reorder: { kind: 'dealCardPiece', group: card.id, index, cardId: card.id, pieceType },
      ...(hidden ? { tag: 'oculta' } : {}),
    }
  })
}

/** Los hijos de un bloque de CONTENIDOS: tarjetas si es DEALS (cada una a su
 *  vez desplegable), moléculas agrupadas por área si usa el motor de área libre. */
function blockRows(block: EmailDocument['contenidos'][number], expanded: ReadonlySet<string>, depth: number): TreeRow[] {
  if (block.type === 'DEALS') {
    const cards = block.fields.items
    if (cards.length === 0) return [{ kind: 'hint', label: '(sin deals)', depth }]
    return cards.flatMap((card, index): TreeRow[] => {
      const expandKey = dealCardExpandKey(card.id)
      const isOpen = expanded.has(expandKey)
      const row: TreeNodeRow = {
        kind: 'node',
        selection: selectDealCard(card.id),
        label: dealCardLabel(cards, card.id),
        depth,
        childCount: DEAL_CARD_PIECE_TYPES.length,
        expandKey,
        expanded: isOpen,
        reorder: { kind: 'dealCard', group: block.id, index, id: card.id },
        actionTarget: { kind: 'dealCard', id: card.id },
        ...(cards.length >= DEALS_MAX_CARDS ? { duplicateBlockedReason: `Esta fila ya tiene ${DEALS_MAX_CARDS} deals, el máximo` } : {}),
      }
      return isOpen ? [row, ...dealCardRows(card, depth + 1)] : [row]
    })
  }

  const def = contentBlockRegistry[block.type]
  if (!def?.usesModuleItems) return [{ kind: 'hint', label: '(sin piezas editables)', depth }]

  const items = (block.fields as { items: ModuleItem[] }).items
  const areas = getModuleAreas(def)
  const rows: TreeRow[] = []
  for (const area of areas) {
    // Un módulo de una sola área implícita ('main', sin label) no necesita
    // encabezado; COL1/COL3/CUPONES sí, o no se sabe en qué celda cae cada una.
    const itemDepth = area.label ? depth + 1 : depth
    if (area.label) rows.push({ kind: 'group', label: area.label, depth })
    const areaItems = items.filter((item) => item.areaKey === area.key)
    if (areaItems.length === 0) {
      rows.push({ kind: 'hint', label: '(vacío)', depth: itemDepth })
      continue
    }
    areaItems.forEach((item, index) => {
      rows.push({
        kind: 'node',
        selection: selectModuleItem(item.id),
        label: moduleItemLabel(item),
        depth: itemDepth,
        // El grupo lleva el área: reorderModuleItem interpreta su `toIndex`
        // contra los items de ESA área, no contra toda la lista del bloque.
        reorder: { kind: 'moduleItem', group: `${block.id}:${area.key}`, index, id: item.id },
        actionTarget: { kind: 'moduleItem', id: item.id },
      })
    })
  }
  return rows
}

/**
 * El árbol de una sección. `expanded` son las claves (blockExpandKey /
 * dealCardExpandKey) de los contenedores desplegados; una clave que ya no
 * corresponde a nada (el bloque se eliminó) simplemente se ignora. Sección
 * Hero no tiene contenedores: sus piezas son hojas.
 */
export function buildTreeViewModel(doc: EmailDocument, expanded: ReadonlySet<string>, section: TreeSection): TreeViewModel {
  return { rows: section === 'hero' ? bannerRows(doc) : contentsRows(doc, expanded) }
}

/**
 * Qué contenedores hay que desplegar para que `selected` sea VISIBLE en el
 * árbol — la mitad "lienzo → árbol": al clickear una pieza en el lienzo, el
 * árbol abre los acordeones donde vive. Se SUMAN a los ya abiertos (App.tsx),
 * no los reemplazan.
 *
 * Revela la selección, no abre más: una tarjeta seleccionada abre su BLOQUE
 * (donde la tarjeta es una fila), no la tarjeta. Una selección que ya se ve en
 * la raíz (un slot, un bloque, una pieza de banner) no abre nada.
 */
export function expandedKeysForSelection(doc: EmailDocument, selected: Selection | null): string[] {
  if (!selected || selected.slot !== 'CONTENIDOS') return []

  if (selected.dealCardId) {
    const found = findDealsBlockByCard(doc.contenidos, selected.dealCardId)
    if (!found) return []
    const keys = [blockExpandKey(found.block.id)]
    if (selected.dealCardPieceType) keys.push(dealCardExpandKey(selected.dealCardId))
    return keys
  }
  if (selected.moduleItemId) {
    const found = findModuleBlockByItem(doc.contenidos, selected.moduleItemId)
    return found ? [blockExpandKey(found.block.id)] : []
  }
  return []
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
