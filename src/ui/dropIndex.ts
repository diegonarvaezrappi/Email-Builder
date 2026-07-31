// ============================================================================
// Resuelve en qué índice cae un drop dentro de una lista de rects medidos en
// el iframe del Viewport. Extraído de Viewport.tsx para poder testearlo sin
// jsdom (no hace falta DOM real: solo recibe números).
// ============================================================================

/** Lo mínimo que hace falta de un rect medido para resolver un índice de drop. */
export interface DropRect {
  top: number
  left: number
  width: number
  height: number
}

/** Y del drop, en el mismo espacio de coordenadas que los rects medidos (el interno del iframe, no el del documento padre). */
export function dropYInFrameSpace(e: { clientY: number }, frameEl: HTMLElement): number {
  return e.clientY - frameEl.getBoundingClientRect().top
}

/** Igual que dropYInFrameSpace, para X — hace falta para resolveDropIndexReadingOrder. */
export function dropXInFrameSpace(e: { clientX: number }, frameEl: HTMLElement): number {
  return e.clientX - frameEl.getBoundingClientRect().left
}

/**
 * Resuelve el índice de destino comparando la Y del drop contra el punto
 * medio vertical de cada item medido (en su orden ACTUAL, antes de sacar
 * nada) — el primero cuyo punto medio quede debajo del cursor es donde se
 * inserta; si ninguno, va al final. Sirve tanto para insertar un item nuevo
 * como para reordenar uno existente: el ajuste por el propio item arrastrado
 * (que corre el índice si se mueve hacia adelante) vive en store/store.ts
 * (reorderContentBlock/reorderBannerItem), no acá.
 */
export function resolveDropIndex(order: string[], rectsById: Map<string, DropRect>, dropY: number): number {
  for (let i = 0; i < order.length; i++) {
    const rect = rectsById.get(order[i])
    if (!rect) continue
    const midY = rect.top + rect.height / 2
    if (dropY < midY) return i
  }
  return order.length
}

/**
 * Como resolveDropIndex, pero tolerante a items lado a lado — necesario para
 * el banner horizontal, donde la columna de moléculas y la de imagen
 * comparten la misma banda vertical (2 columnas de 240px dentro de los
 * 480px del banner). Si el cursor cae DENTRO de la banda vertical de un
 * item, decide por X (mitad izquierda = antes de ese item); si no, por la
 * mitad vertical, igual que resolveDropIndex. Para una pila de items a todo
 * el ancho (banner vertical, CONTENIDOS) el resultado es equivalente.
 */
export function resolveDropIndexReadingOrder(
  order: string[],
  rectsById: Map<string, DropRect>,
  dropX: number,
  dropY: number,
): number {
  for (let i = 0; i < order.length; i++) {
    const rect = rectsById.get(order[i])
    if (!rect) continue
    const sameRow = dropY >= rect.top && dropY <= rect.top + rect.height
    const before = sameRow ? dropX < rect.left + rect.width / 2 : dropY < rect.top + rect.height / 2
    if (before) return i
  }
  return order.length
}
