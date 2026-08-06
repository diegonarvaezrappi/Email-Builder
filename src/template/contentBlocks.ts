// ============================================================================
// Comentarios que delimitan cada bloque de CONTENIDOS en el HTML ensamblado,
// para que ui/Viewport.tsx pueda ubicar en el DOM ya renderizado qué
// elemento(s) corresponden a qué instancia de doc.contenidos — sin depender
// de ningún atributo del contenido real (que viene de un content block
// sincronizado e intocable, ver components/cta/render.ts). Envuelven
// ÚNICAMENTE el snippet que la app misma genera (los `{% assign %}` +
// referencia al content block), nunca el contenido del content block en sí.
//
// Van también en el HTML exportado/copiado, no solo en el preview interno:
// son comentarios inertes (sin efecto en Braze/clientes de correo), y
// mantener un solo pipeline es más simple que bifurcar uno "limpio para
// exportar" y otro "con marcas para medir".
// ============================================================================

export function wrapWithBlockMarkers(type: string, id: string, innerHtml: string): string {
  return `<!-- BLOCK:${type}:${id} -->\n${innerHtml}\n<!-- /BLOCK:${type}:${id} -->`
}

export const BLOCK_OPEN_RE = /^\s*BLOCK:([^:]+):(.+?)\s*$/
export const BLOCK_CLOSE_RE = /^\s*\/BLOCK:([^:]+):(.+?)\s*$/

/**
 * Mismo mecanismo que wrapWithBlockMarkers, prefijo DISTINTO ("BITEM", no
 * "BLOCK") a propósito: una pieza de banner y un bloque de CONTENIDOS nunca
 * deben confundirse entre sí en ui/Viewport.tsx (selección/duplicado/reorden
 * de uno no debe disparar el del otro) — ver measureMarkedBlocks.
 */
export function wrapWithBannerItemMarkers(type: string, id: string, innerHtml: string): string {
  return `<!-- BITEM:${type}:${id} -->\n${innerHtml}\n<!-- /BITEM:${type}:${id} -->`
}

export const BANNER_ITEM_OPEN_RE = /^\s*BITEM:([^:]+):(.+?)\s*$/
export const BANNER_ITEM_CLOSE_RE = /^\s*\/BITEM:([^:]+):(.+?)\s*$/

/**
 * Mismo mecanismo, tercer prefijo DISTINTO ("DCARD") por la misma razón que
 * BITEM no es BLOCK: una tarjeta de deal, un bloque de CONTENIDOS y una pieza de
 * banner nunca deben confundirse entre sí en ui/Viewport.tsx.
 *
 * Dos diferencias con los otros dos, ambas a propósito:
 *  - El primer campo es el id del BLOQUE dueño, no un tipo: las tarjetas de deal
 *    son todas de la misma forma (no hay un `DealCardType` que distinguir), y en
 *    cambio sí hace falta saber a qué instancia de DEALS pertenece cada una para
 *    poder acotar el reordenamiento a su propio bloque.
 *  - Una MISMA tarjeta emite 2 o 3 pares de estos marcadores, no uno: su HTML
 *    vive repartido en las 3 filas del par (imágenes / textos / legales), que no
 *    son contiguas. Quien mida tiene que unir los rects que compartan cardId —
 *    ver mergeRectsById en ui/Viewport.tsx.
 */
export function wrapWithDealCardMarkers(blockId: string, cardId: string, innerHtml: string): string {
  return `<!-- DCARD:${blockId}:${cardId} -->\n${innerHtml}\n<!-- /DCARD:${blockId}:${cardId} -->`
}

export const DEAL_CARD_OPEN_RE = /^\s*DCARD:([^:]+):(.+?)\s*$/
export const DEAL_CARD_CLOSE_RE = /^\s*\/DCARD:([^:]+):(.+?)\s*$/
