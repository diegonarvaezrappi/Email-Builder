// ============================================================================
// Clave de un objetivo tropicalizable: la proyección plana y guardable
// (`doc.tropicalizations` se keyea por esto) de una `Selection`
// (ui/selection.ts) — la misma relación que ya existe entre un `Selection` y
// un id de documento, un nivel más arriba.
//
// Formato `<kind>:<id>`, minúscula, espejando los 4 prefijos de marcador de
// template/contentBlocks.ts (BLOCK/BITEM/DCARD/MITEM) más `header`/`banner`
// para las piezas del Hero y `slot` para el footer (el único singleton que
// queda) — así "bitem:xyz" se lee de un vistazo junto a
// "<!-- BITEM:TAGS:xyz -->". Sin `dpiece:`: las 7 líneas de una tarjeta de
// deal no son objetivo de tropicalización (decisión explícita del usuario).
// ============================================================================
import type { EmailDocument, SlotName } from '../model'
import { registry } from '../registry'
import { findDealsBlockByCard } from '../components/deals/blocks'
import { findModuleBlockByItem } from '../components/contentModules/blocks'
import { allHeroPieces, findBannerByItem, findHeroPiece } from '../components/hero/schema'
import {
  selectBannerItem,
  selectHeroPiece,
  selectBlock,
  selectDealCard,
  selectModuleItem,
  selectSlot,
  type Selection,
} from '../ui/selection'

export const TROPICALIZE_KINDS = ['slot', 'header', 'banner', 'block', 'bitem', 'dcard', 'mitem'] as const
export type TropicalizeKind = (typeof TROPICALIZE_KINDS)[number]

/** Solo `FOOTER` — CONTENIDOS es el array de bloques (cada bloque tiene su
 *  propia clave `block:<id>`) y HEADER/BANNER son piezas repetibles del Hero
 *  desde 2026-10-28 (`header:<id>`/`banner:<id>`: el tipo va en el prefijo
 *  para que la clave se pueda volver a una `Selection` sin el documento). */
export type TropicalizableSlot = Exclude<SlotName, 'CONTENIDOS' | 'HEADER' | 'BANNER'>

export type TropicalizeKey = string

export const slotKey = (slot: TropicalizableSlot): TropicalizeKey => `slot:${slot}`
export const heroPieceKey = (type: 'HEADER' | 'BANNER', id: string): TropicalizeKey =>
  `${type === 'HEADER' ? 'header' : 'banner'}:${id}`
export const blockKey = (id: string): TropicalizeKey => `block:${id}`
export const bannerItemKey = (id: string): TropicalizeKey => `bitem:${id}`
export const dealCardKey = (id: string): TropicalizeKey => `dcard:${id}`
export const moduleItemKey = (id: string): TropicalizeKey => `mitem:${id}`

const SLOT_IDS: readonly string[] = ['FOOTER']

/**
 * `indexOf(':')`, NUNCA `split(':')`: `newId()` (ids.ts) genera un UUID sin
 * dos puntos hoy, pero el id es opaco — todo lo que sigue al primer `:` es
 * el id, entero, sin importar qué caracteres traiga.
 */
export function parseTargetKey(key: string): { kind: TropicalizeKind; id: string } | null {
  const sep = key.indexOf(':')
  if (sep === -1) return null
  const kind = key.slice(0, sep)
  const id = key.slice(sep + 1)
  if (!id) return null
  if (!(TROPICALIZE_KINDS as readonly string[]).includes(kind)) return null
  if (kind === 'slot' && !SLOT_IDS.includes(id)) return null
  return { kind: kind as TropicalizeKind, id }
}

export const isTropicalizeKey = (key: string): boolean => parseTargetKey(key) !== null

/**
 * `Selection` → clave. Resuelve en el MISMO orden que
 * ui/InspectorPanel.tsx (moduleItemId → dealCardId(+pieza) → blockId →
 * bannerItemId → slot) — si se desincroniza, el panel de Tropicalizar y la
 * clave que guarda el store dejan de coincidir. Una línea de deal
 * (`dealCardPieceType` presente) y un `CONTENIDOS` "a secas" (sin
 * `blockId`/`dealCardId`/`moduleItemId`) no son tropicalizables ⇒ `null`.
 */
export function targetKeyFromSelection(selected: Selection | null): TropicalizeKey | null {
  if (!selected) return null
  // Un fondo de sección (HERO_BG/CONTENTS_BG, ver
  // ui/selection.ts#GlobalBackgroundTarget) tampoco es tropicalizable.
  if (selected.slot === 'HERO_BG' || selected.slot === 'CONTENTS_BG') return null
  if (selected.slot === 'CONTENIDOS') {
    if (selected.moduleItemId) return moduleItemKey(selected.moduleItemId)
    if (selected.dealCardId) return selected.dealCardPieceType ? null : dealCardKey(selected.dealCardId)
    if (selected.blockId) return blockKey(selected.blockId)
    return null
  }
  if (selected.slot === 'BANNER' && selected.bannerItemId) return bannerItemKey(selected.bannerItemId)
  if (selected.slot === 'HEADER' || selected.slot === 'BANNER') {
    return selected.heroId ? heroPieceKey(selected.slot, selected.heroId) : null
  }
  return slotKey(selected.slot)
}

/** Inversa de `targetKeyFromSelection` — para saltar de una fila del índice
 *  de tropicalizaciones (ui/tropicalize/TropicalizationIndexPanel.tsx) al
 *  lienzo. Reusa los constructores de ui/selection.ts tal cual. */
export function selectionFromTargetKey(key: TropicalizeKey): Selection | null {
  const parsed = parseTargetKey(key)
  if (!parsed) return null
  switch (parsed.kind) {
    case 'slot':
      return selectSlot(parsed.id as TropicalizableSlot)
    case 'header':
      return selectHeroPiece('HEADER', parsed.id)
    case 'banner':
      return selectHeroPiece('BANNER', parsed.id)
    case 'block':
      return selectBlock(parsed.id)
    case 'bitem':
      return selectBannerItem(parsed.id)
    case 'dcard':
      return selectDealCard(parsed.id)
    case 'mitem':
      return selectModuleItem(parsed.id)
  }
}

/**
 * Los `fields` BASE del target, buscando al dueño (mismo criterio que
 * `findDealsBlockByCard`/`findModuleBlockByItem`: los ids son únicos en todo
 * el documento, el dueño se BUSCA, nunca viaja en la clave). `null` si la
 * clave ya no resuelve contra el documento (el elemento fue eliminado) — lo
 * usa `pruneTropicalizations` (tropicalize/doc.ts) para decidir qué claves
 * son huérfanas, y el índice de tropicalizaciones para saltearlas.
 */
export function baseFieldsForKey(doc: EmailDocument, key: TropicalizeKey): unknown | null {
  const parsed = parseTargetKey(key)
  if (!parsed) return null
  switch (parsed.kind) {
    case 'slot': {
      const def = registry[parsed.id as TropicalizableSlot]
      return def?.docKey ? doc[def.docKey] : null
    }
    case 'header':
    case 'banner': {
      const piece = findHeroPiece(allHeroPieces(doc.heroes), parsed.id)
      return piece && piece.type === (parsed.kind === 'header' ? 'HEADER' : 'BANNER') ? piece.fields : null
    }
    case 'block': {
      const block = doc.contenidos.find((b) => b.id === parsed.id)
      return block ? block.fields : null
    }
    case 'bitem': {
      const found = findBannerByItem(allHeroPieces(doc.heroes), parsed.id)
      const item = found?.piece.fields.items.find((it) => it.id === parsed.id)
      return item ? item.fields : null
    }
    case 'dcard': {
      const found = findDealsBlockByCard(doc.contenidos, parsed.id)
      const card = found?.block.fields.items.find((c) => c.id === parsed.id)
      return card ? card.fields : null
    }
    case 'mitem': {
      const found = findModuleBlockByItem(doc.contenidos, parsed.id)
      const item = found?.items.find((it) => it.id === parsed.id)
      return item ? item.fields : null
    }
  }
}
