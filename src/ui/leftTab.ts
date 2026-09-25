// ============================================================================
// Las 3 pestañas del panel izquierdo (ui/LeftPanel.tsx) y a cuál pertenece
// cada selección — así un click en el lienzo lleva el panel a la pestaña donde
// vive lo clickeado, igual que ya bajaba el árbol a su contenedor.
// ============================================================================
import type { Selection } from './selection'

export type LeftTab = 'general' | 'hero' | 'contents'

export const LEFT_TAB_ORDER: readonly LeftTab[] = ['general', 'hero', 'contents']

export const LEFT_TAB_LABELS: Record<LeftTab, string> = {
  general: 'Contenido general',
  hero: 'Sección Hero',
  contents: 'Sección Contents',
}

/** `null` para "no cambiar de pestaña" (nada seleccionado). */
export function leftTabForSelection(selected: Selection | null): LeftTab | null {
  if (!selected) return null
  switch (selected.slot) {
    case 'HEADER':
    case 'BANNER':
    case 'HERO_BG':
      return 'hero'
    case 'CONTENIDOS':
    case 'CONTENTS_BG':
    case 'FOOTER':
      return 'contents'
  }
}
