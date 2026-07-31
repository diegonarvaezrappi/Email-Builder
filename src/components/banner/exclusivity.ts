import type { BannerItem, BannerItemType } from './items/schemas'

/**
 * Los 2 tipos que ocupan el módulo de imagen del banner. El maestro es
 * explícito: "MODULO PARA IMG solo se puede usar FIJA O AUTOMATica, no ambas"
 * (comentario literal en big-banner-horizontal.html) — es la ÚNICA regla
 * posicional del maestro que se conserva en código: el resto (piezas en
 * posición fija, no duplicables) se relajó a propósito para que todas las
 * piezas del banner se puedan agregar/duplicar/mover/eliminar por igual (ver
 * components/banner/render.ts). Como el módulo de imagen es uno solo, esto
 * también evita 2 IMG_FIJA a la vez (que en horizontal serían 2 columnas de
 * 240px y desbordarían el banner de 480px).
 *
 * IMG_AUTOMATICA_MOLECULA (la pieza libre dentro de la tabla de moléculas) NO
 * entra en esta regla — es una pieza distinta, confirmada por diff contra
 * IMG_AUTOMATICA_MODULO, y coexiste con cualquier módulo de imagen.
 */
export type ImageModuleType = Extract<BannerItemType, 'IMG_FIJA' | 'IMG_AUTOMATICA_MODULO'>
export const IMAGE_MODULE_TYPES: readonly ImageModuleType[] = ['IMG_FIJA', 'IMG_AUTOMATICA_MODULO']

function isImageModuleType(type: BannerItemType): type is ImageModuleType {
  return (IMAGE_MODULE_TYPES as readonly BannerItemType[]).includes(type)
}

/**
 * Filtra de `items` cualquier pieza de módulo de imagen existente cuando
 * `incomingType` es también un módulo de imagen — para insertar/duplicar
 * ANTES de agregar la nueva pieza, así el índice de destino se interpreta
 * contra la lista ya filtrada.
 */
export function applyImageModuleExclusivity(items: BannerItem[], incomingType: BannerItemType): BannerItem[] {
  if (!isImageModuleType(incomingType)) return items
  return items.filter((item) => !isImageModuleType(item.type))
}

/** Índice del módulo de imagen actual (IMG_FIJA o IMG_AUTOMATICA_MODULO) dentro
 *  de `items`, -1 si el banner todavía no tiene ninguno. Usado por el selector
 *  de tipo de imagen (auto/alto fijo) del panel derecho para saber cuál de las
 *  2 cards resaltar y en qué posición reemplazar al cambiar de tipo. */
export function findImageModuleIndex(items: BannerItem[]): number {
  return items.findIndex((item) => isImageModuleType(item.type))
}
