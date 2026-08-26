// ============================================================================
// Claves de dataTransfer para los 3 gestos de drag-and-drop nativo (HTML5)
// que soporta el Viewport. Un módulo compartido en vez de constantes
// duplicadas en cada archivo: LibraryPanel.tsx pone los datos, Viewport.tsx
// los lee — que ambos importen de acá evita que se desincronicen.
// ============================================================================

/** Restaurar un slot singleton eliminado (hoy, Cierre y Banner). Payload = el SlotName. */
export const SLOT_DRAG_TYPE = 'application/x-email-slot'

/** Insertar un bloque de contenido NUEVO (hoy, CTA) desde LibraryPanel. Payload = el ContentBlockType (ej. 'CTA'). */
export const CONTENT_BLOCK_DRAG_TYPE = 'application/x-email-content-block'

/** Reordenar una instancia de bloque de contenido ya existente. Payload = el id de la instancia. */
export const CONTENT_BLOCK_REORDER_DRAG_TYPE = 'application/x-email-content-block-reorder'

/** Elegir el TIPO de banner (restaura el slot si estaba eliminado y fija su
 *  tipo en el mismo gesto). Payload = 'vertical' | 'horizontal'. */
export const BANNER_TYPE_DRAG_TYPE = 'application/x-email-banner-type'

/** Insertar una pieza de banner NUEVA desde LibraryPanel. Payload = el BannerItemType (ej. 'PROMO'). */
export const BANNER_ITEM_DRAG_TYPE = 'application/x-email-banner-item'

/** Reordenar una pieza de banner ya existente. Payload = el id de la instancia. */
export const BANNER_ITEM_REORDER_DRAG_TYPE = 'application/x-email-banner-item-reorder'

/** Reordenar una tarjeta de deal ya existente. Payload = el id de la tarjeta
 *  (único en todo el documento, ver store/store.ts). No hay tipo "insertar
 *  tarjeta nueva": las tarjetas de deal son todas de la misma forma, así que
 *  agregar es un botón del inspector, no un catálogo arrastrable. */
export const DEAL_CARD_REORDER_DRAG_TYPE = 'application/x-email-deal-card-reorder'

/**
 * Reordenar una PIEZA (una de las 7 moléculas fijas de abajo de la imagen)
 * dentro de una tarjeta de deal. Payload = `${cardId}:${pieceType}` — a
 * diferencia de una pieza de banner o una tarjeta de deal, una pieza de
 * tarjeta no tiene id propio (son 7 tipos fijos, uno de cada por tarjeta),
 * así que hace falta codificar AMBOS datos: qué tarjeta es la dueña (para
 * acotar el reorden a sus propias 7 piezas) y qué tipo es. Separar por ":"
 * es seguro: los ids de tarjeta salen de newId() (uuid, ver ids.ts), que
 * nunca contiene ":".
 */
export const DEAL_CARD_PIECE_REORDER_DRAG_TYPE = 'application/x-email-deal-card-piece-reorder'

/** Insertar una MOLÉCULA nueva en el área libre de un módulo de body (ej.
 *  Título) desde su catálogo — ver bodyMoleculeRegistry.ts. Payload = el
 *  ModuleItemType (ej. 'TITULO_TEXTO'). */
export const MODULE_ITEM_DRAG_TYPE = 'application/x-email-module-item'

/** Reordenar una molécula ya existente dentro del área libre de un módulo de
 *  body. Payload = el id de la instancia (único en todo el documento, mismo
 *  criterio que BANNER_ITEM_REORDER_DRAG_TYPE). */
export const MODULE_ITEM_REORDER_DRAG_TYPE = 'application/x-email-module-item-reorder'
