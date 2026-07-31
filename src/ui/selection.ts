import type { SlotName } from '../model'

/**
 * Qué está seleccionado en el Inspector/Viewport. `blockId` solo tiene
 * sentido cuando `slot === 'CONTENIDOS'` — identifica qué instancia dentro de
 * doc.contenidos está seleccionada. `bannerItemId` solo tiene sentido cuando
 * `slot === 'BANNER'` — identifica qué pieza dentro de doc.banner.items está
 * seleccionada. Los demás slots son singletons, no necesitan un id de
 * instancia.
 */
export interface Selection {
  slot: SlotName
  blockId?: string
  bannerItemId?: string
}

export const selectSlot = (slot: SlotName): Selection => ({ slot })
export const selectBlock = (blockId: string): Selection => ({ slot: 'CONTENIDOS', blockId })
export const selectBannerItem = (bannerItemId: string): Selection => ({ slot: 'BANNER', bannerItemId })

export function isSlotSelected(selected: Selection | null, slot: SlotName): boolean {
  return selected?.slot === slot && selected.blockId === undefined && selected.bannerItemId === undefined
}

export function isBlockSelected(selected: Selection | null, blockId: string): boolean {
  return selected?.slot === 'CONTENIDOS' && selected.blockId === blockId
}

export function isBannerItemSelected(selected: Selection | null, bannerItemId: string): boolean {
  return selected?.slot === 'BANNER' && selected.bannerItemId === bannerItemId
}
