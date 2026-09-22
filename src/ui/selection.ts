import type { SlotName } from '../model'
import type { DealCardPieceType } from '../components/deals/schema'

/**
 * Los 2 fondos de sección (HERO/CONTENTS, ver global/schema.ts) — pedido
 * explícito del usuario (2026-09-21) para que se seleccionen desde el panel
 * izquierdo igual que Header/Banner/Footer, en vez de vivir como popovers del
 * toolbar (ver ui/ToolbarGlobals.tsx, que se quedó solo con el de General).
 * A PROPÓSITO no son `SlotName`: no son slots reales (no tienen `registry`
 * entry, no producen HTML propio — solo tocan tamaño/posición/repeat/alt de
 * un `<td>` que YA existe, ver template/assemble.ts) y no son tropicalizables
 * (ver el guard en tropicalize/keys.ts#targetKeyFromSelection). Viven en
 * `doc.global`, no en un slot propio del documento.
 */
export type GlobalBackgroundTarget = 'HERO_BG' | 'CONTENTS_BG'

/** Cómo se llama el PANEL de cada uno (lo que se edita: su fondo). */
export const GLOBAL_BACKGROUND_LABELS: Record<GlobalBackgroundTarget, string> = {
  HERO_BG: 'Fondo Hero',
  CONTENTS_BG: 'Fondo Contenidos',
}

/** Cómo se llama la SECCIÓN (lo que envuelve) — en el árbol de estructura y en
 *  el overlay del lienzo, donde lo que se nombra es el área, no su fondo. */
export const SECTION_LABELS: Record<GlobalBackgroundTarget, string> = {
  HERO_BG: 'Hero',
  CONTENTS_BG: 'Contenidos',
}

/**
 * Qué está seleccionado en el Inspector/Viewport. `blockId` solo tiene
 * sentido cuando `slot === 'CONTENIDOS'` — identifica qué instancia dentro de
 * doc.contenidos está seleccionada. `bannerItemId` solo tiene sentido cuando
 * `slot === 'BANNER'` — identifica qué pieza dentro de doc.banner.items está
 * seleccionada. Los demás slots son singletons, no necesitan un id de
 * instancia. `slot` también puede ser un `GlobalBackgroundTarget` — ese caso
 * nunca lleva ninguno de los campos de abajo (son singletons "de un solo
 * nivel", igual que Header/Footer).
 */
export interface Selection {
  slot: SlotName | GlobalBackgroundTarget
  blockId?: string
  bannerItemId?: string
  /** Solo tiene sentido con `slot === 'CONTENIDOS'` — identifica una tarjeta
   *  dentro de un bloque DEALS. No lleva `blockId`: el id de tarjeta es único en
   *  todo el documento, así que el bloque dueño se deduce de doc.contenidos
   *  (mismo criterio que las acciones de tarjeta en store/store.ts). */
  dealCardId?: string
  /** Solo tiene sentido junto a `dealCardId` — identifica cuál de las 7 líneas
   *  movibles de esa tarjeta está seleccionada (un nivel más adentro, mismo
   *  patrón que `bannerItemId` respecto de `slot === 'BANNER'`): selecciona la
   *  LÍNEA, no toda la tarjeta (isDealCardSelected exige que esto sea
   *  undefined, igual que isSlotSelected exige bannerItemId undefined). */
  dealCardPieceType?: DealCardPieceType
  /** Solo tiene sentido con `slot === 'CONTENIDOS'` — identifica una molécula
   *  dentro del área libre de un módulo de body (ej. TITLE). Mismo criterio
   *  que `dealCardId`: sin `blockId` propio, el id de item es único en todo el
   *  documento (ver findModuleBlockByItem en components/contentModules/blocks.ts). */
  moduleItemId?: string
}

export const selectSlot = (slot: SlotName): Selection => ({ slot })
export const selectBlock = (blockId: string): Selection => ({ slot: 'CONTENIDOS', blockId })
export const selectBannerItem = (bannerItemId: string): Selection => ({ slot: 'BANNER', bannerItemId })
export const selectDealCard = (dealCardId: string): Selection => ({ slot: 'CONTENIDOS', dealCardId })
export const selectDealCardPiece = (dealCardId: string, dealCardPieceType: DealCardPieceType): Selection => ({
  slot: 'CONTENIDOS',
  dealCardId,
  dealCardPieceType,
})
export const selectModuleItem = (moduleItemId: string): Selection => ({ slot: 'CONTENIDOS', moduleItemId })

/** Los 2 fondos de sección — ver GlobalBackgroundTarget arriba. */
export const selectGlobalBackground = (target: GlobalBackgroundTarget): Selection => ({ slot: target })

export function isSlotSelected(selected: Selection | null, slot: SlotName | GlobalBackgroundTarget): boolean {
  return (
    selected?.slot === slot &&
    selected.blockId === undefined &&
    selected.bannerItemId === undefined &&
    selected.dealCardId === undefined
  )
}

export function isBlockSelected(selected: Selection | null, blockId: string): boolean {
  return selected?.slot === 'CONTENIDOS' && selected.blockId === blockId
}

export function isDealCardSelected(selected: Selection | null, dealCardId: string): boolean {
  return selected?.slot === 'CONTENIDOS' && selected.dealCardId === dealCardId && selected.dealCardPieceType === undefined
}

export function isDealCardPieceSelected(
  selected: Selection | null,
  dealCardId: string,
  pieceType: DealCardPieceType,
): boolean {
  return selected?.slot === 'CONTENIDOS' && selected.dealCardId === dealCardId && selected.dealCardPieceType === pieceType
}

export function isBannerItemSelected(selected: Selection | null, bannerItemId: string): boolean {
  return selected?.slot === 'BANNER' && selected.bannerItemId === bannerItemId
}

export function isModuleItemSelected(selected: Selection | null, moduleItemId: string): boolean {
  return selected?.slot === 'CONTENIDOS' && selected.moduleItemId === moduleItemId
}

/**
 * Al entrar a la pestaña Tropicalizar, una línea de deal seleccionada
 * (`dealCardPieceType` presente) no es un objetivo tropicalizable (decisión
 * explícita del usuario) — se sube la selección a la tarjeta dueña, para que
 * el lienzo/panel de Tropicalizar tengan algo coherente que resaltar en vez
 * de mostrar la tarjeta mientras nada en el lienzo aparece seleccionado
 * (`isDealCardSelected` exige `dealCardPieceType === undefined`).
 *
 * Un fondo de sección (HERO_BG/CONTENTS_BG) tampoco es tropicalizable (ver
 * targetKeyFromSelection) — LibraryPanel solo los ofrece en la pestaña
 * Preview, así que la única forma de llegar a Tropicalizar con uno
 * seleccionado es cambiar de pestaña, que es justo lo que se resuelve acá: se
 * limpia a `null` (a diferencia del deal, no hay un "dueño" al cual subir la
 * selección). El resto de las formas de `Selection` pasan sin cambios.
 */
export function normalizeTropicalizationTarget(selected: Selection | null): Selection | null {
  if (selected?.slot === 'CONTENIDOS' && selected.dealCardId && selected.dealCardPieceType) {
    return selectDealCard(selected.dealCardId)
  }
  if (selected?.slot === 'HERO_BG' || selected?.slot === 'CONTENTS_BG') {
    return null
  }
  return selected
}
