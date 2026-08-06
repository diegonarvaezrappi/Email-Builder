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
