// ============================================================================
// Ubicar el bloque DEALS dueño de una tarjeta. Vive acá y no en deals/schema.ts
// porque necesita los tipos de model.ts, y model.ts importa deals/schema.ts —
// meterlo ahí cerraría un ciclo de imports (mismo motivo por el que el tipo de
// las piezas de banner vive en banner/items/schemas.ts, ver la nota de model.ts).
//
// Lo usan las 4 acciones de tarjeta que NO reciben el id del bloque
// (store/store.ts), el inspector (para el botón "volver a Deals") y el viewport
// (para acotar el reordenamiento a las tarjetas del bloque dueño).
// ============================================================================
import type { ContentBlock, DealsBlock } from '../../model'

export interface DealsBlockLocation {
  block: DealsBlock
  /** Índice del bloque en doc.contenidos. */
  index: number
}

/** El bloque DEALS que contiene esa tarjeta, o `null` si ninguna la tiene (id de
 *  una tarjeta ya eliminada, o de otro documento). Los ids de tarjeta son únicos
 *  en todo el documento (newId()), así que la primera coincidencia es la única. */
export function findDealsBlockByCard(contenidos: ContentBlock[], cardId: string): DealsBlockLocation | null {
  const index = contenidos.findIndex((block) => block.type === 'DEALS' && block.fields.items.some((card) => card.id === cardId))
  if (index === -1) return null
  return { block: contenidos[index] as DealsBlock, index }
}

/** `true` si el documento ya tiene un bloque DEALS. Sostiene el tope de "max 4
 *  deals por MAIL" (05-docs/USO-DE-CADA-PARTE.md §11): el cap de 4 tarjetas por
 *  bloque solo alcanza si además no se pueden acumular bloques. */
export function hasDealsBlock(contenidos: ContentBlock[]): boolean {
  return contenidos.some((block) => block.type === 'DEALS')
}
