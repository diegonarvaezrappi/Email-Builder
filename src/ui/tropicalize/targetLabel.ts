// ============================================================================
// Nombre legible de un objetivo tropicalizable — compartido entre
// TropicalizationPanel (encabezado) y TropicalizationIndexPanel (cada fila).
// Mismo criterio de resolución que ui/InspectorPanel.tsx, solo para el
// nombre a mostrar, no repite ninguna lógica de edición.
// ============================================================================
import type { EmailDocument } from '../../model'
import { SLOT_LABELS } from '../../registry'
import { GLOBAL_BACKGROUND_LABELS } from '../selection'
import { contentBlockRegistry } from '../../contentBlockRegistry'
import { getBannerItemDef } from '../../bannerItemRegistry'
import { getModuleItemDef } from '../../bodyMoleculeRegistry'
import { findDealsBlockByCard } from '../../components/deals/blocks'
import { findModuleBlockByItem } from '../../components/contentModules/blocks'
import type { Selection } from '../selection'
import { selectionFromTargetKey, type TropicalizeKey } from '../../tropicalize/keys'

export function targetLabel(doc: EmailDocument, selected: Selection): string {
  // No debería llegar hasta acá (normalizeTropicalizationTarget los limpia al
  // entrar a Tropicalizar) — rama defensiva solo para que SLOT_LABELS[...]
  // de más abajo tipe correcto.
  if (selected.slot === 'HERO_BG' || selected.slot === 'CONTENTS_BG') {
    return GLOBAL_BACKGROUND_LABELS[selected.slot]
  }
  if (selected.slot === 'CONTENIDOS' && selected.moduleItemId) {
    const found = findModuleBlockByItem(doc.contenidos, selected.moduleItemId)
    const item = found?.items.find((it) => it.id === selected.moduleItemId)
    return item ? (getModuleItemDef(item.type)?.label ?? item.type) : 'Molécula'
  }
  if (selected.slot === 'CONTENIDOS' && selected.dealCardId) {
    const found = findDealsBlockByCard(doc.contenidos, selected.dealCardId)
    if (!found) return 'Deal'
    const position = found.block.fields.items.findIndex((c) => c.id === selected.dealCardId) + 1
    return `Deal ${position} de ${found.block.fields.items.length}`
  }
  if (selected.slot === 'CONTENIDOS' && selected.blockId) {
    const block = doc.contenidos.find((b) => b.id === selected.blockId)
    return block ? (contentBlockRegistry[block.type]?.label ?? block.type) : 'Bloque'
  }
  if (selected.slot === 'BANNER' && selected.bannerItemId) {
    const item = doc.banner.items.find((it) => it.id === selected.bannerItemId)
    return item ? (getBannerItemDef(item.type)?.label ?? item.type) : 'Pieza de banner'
  }
  return SLOT_LABELS[selected.slot]
}

/** Variante por clave — para el índice, que no tiene una `Selection` a mano
 *  (cada fila viene de recorrer `doc.tropicalizations`, no del lienzo). */
export function targetLabelForKey(doc: EmailDocument, key: TropicalizeKey): string | null {
  const selected = selectionFromTargetKey(key)
  return selected ? targetLabel(doc, selected) : null
}
