import type { SlotName } from '../model'

/**
 * Qué está seleccionado en el Inspector/Viewport. `blockId` solo tiene
 * sentido cuando `slot === 'CONTENIDOS'` — identifica qué instancia dentro de
 * doc.contenidos está seleccionada (los demás slots son singletons, no
 * necesitan un id de instancia).
 */
export interface Selection {
  slot: SlotName
  blockId?: string
}

export const selectSlot = (slot: SlotName): Selection => ({ slot })
export const selectBlock = (blockId: string): Selection => ({ slot: 'CONTENIDOS', blockId })

export function isSlotSelected(selected: Selection | null, slot: SlotName): boolean {
  return selected?.slot === slot && selected.blockId === undefined
}

export function isBlockSelected(selected: Selection | null, blockId: string): boolean {
  return selected?.slot === 'CONTENIDOS' && selected.blockId === blockId
}
