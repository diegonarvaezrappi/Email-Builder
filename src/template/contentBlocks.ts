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
