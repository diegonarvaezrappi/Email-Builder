// ============================================================================
// Claves de dataTransfer para los 3 gestos de drag-and-drop nativo (HTML5)
// que soporta el Viewport. Un módulo compartido en vez de constantes
// duplicadas en cada archivo: LibraryPanel.tsx pone los datos, Viewport.tsx
// los lee — que ambos importen de acá evita que se desincronicen.
// ============================================================================

/** Restaurar un slot singleton eliminado (hoy, Cierre). Payload = el SlotName. */
export const SLOT_DRAG_TYPE = 'application/x-email-slot'

/** Insertar un bloque de contenido NUEVO (hoy, CTA) desde LibraryPanel. Payload = el ContentBlockType (ej. 'CTA'). */
export const CONTENT_BLOCK_DRAG_TYPE = 'application/x-email-content-block'

/** Reordenar una instancia de bloque de contenido ya existente. Payload = el id de la instancia. */
export const CONTENT_BLOCK_REORDER_DRAG_TYPE = 'application/x-email-content-block-reorder'
