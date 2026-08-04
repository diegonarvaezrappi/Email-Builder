// ============================================================================
// El maestro es explícito y ASIMÉTRICO entre orientaciones sobre qué tan
// libre es el orden de las piezas — ver big-banner-horizontal.html vs.
// big-banner-vertical.html:
//
// VERTICAL: "MODULO MOLECULAS: ... se puede mover arriba o abajo de la
// imagen o los tags, se puede duplicar"; "MODULO IMAGEN FIJA: ... se puede
// mover arriba o abajo del modulo de MOLECULAS"; "MODULO TAGS: ... se puede
// mover" — sin restricciones, cualquier orden es válido (mismo criterio ya
// implementado: todas las piezas se agregan/mueven/eliminan por igual).
//
// HORIZONTAL: "MODULO MOLECULAS: dentro de esta tabla se agrupan las
// MOLECULAS, en esta estructura es solo un modulo de moleculas y no se
// cambia la posición" (columna de 240px, SIEMPRE primera); "MODULO PARA IMG
// solo se puede usar FIJA O AUTOMATica, no ambas" (ver exclusivity.ts);
// "MODULO TAGS: ... no se puede mover" (siempre al final, debajo de la
// imagen). No es solo una preferencia del maestro: la tabla de moléculas es
// una columna física de 240px (ver components/banner/shell.ts) — si una
// pieza de zona MOLECULA quedara después de la imagen/tags, groupBannerItems
// (render.ts) abriría una SEGUNDA copia de esa tabla fuera de lugar y
// deformaría el banner de 480px.
//
// `enforceHorizontalItemOrder` es un stable sort — nunca reordena piezas
// dentro de su propio grupo, solo garantiza MOLECULA < resto-de-MODULO <
// TAGS. Se aplica en 2 lugares a propósito:
// 1. store/store.ts, al final de insertBannerItem/duplicateBannerItem/
//    reorderBannerItem/setBannerImageModule — así doc.banner.items (lo que
//    ve y puede volver a arrastrar el usuario en el panel) ya queda en el
//    orden válido, no solo lo que se renderiza.
// 2. components/banner/render.ts, dentro de groupBannerItems — red de
//    seguridad: cubre el caso en que el usuario cambia bannerType de
//    vertical a horizontal con un orden que era válido en vertical pero no
//    en horizontal (ese cambio no pasa por ninguna de las 4 acciones de
//    arriba, ver ui/LibraryPanel.tsx), y cualquier otro camino futuro que
//    toque doc.banner.items sin pasar por el store.
// ============================================================================
import { getBannerItemDef } from '../../bannerItemRegistry'
import type { BannerItem, BannerItemType } from './items/schemas'
import type { BannerType } from './schema'

function rank(type: BannerItemType): 0 | 1 | 2 {
  if (getBannerItemDef(type)?.zone !== 'MODULO') return 0
  return type === 'TAGS' ? 2 : 1
}

export function enforceHorizontalItemOrder(items: BannerItem[], bannerType: BannerType): BannerItem[] {
  if (bannerType !== 'horizontal') return items
  const withIndex = items.map((item, index) => ({ item, index }))
  const sorted = [...withIndex].sort((a, b) => rank(a.item.type) - rank(b.item.type) || a.index - b.index)
  const changed = sorted.some(({ item }, i) => item !== items[i])
  return changed ? sorted.map(({ item }) => item) : items
}
