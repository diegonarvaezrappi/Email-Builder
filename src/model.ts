import { z } from 'zod'
import { footerSchema, type FooterFields } from './components/footer/schema'

/** Nombres de los marcadores de slot presentes en template_base.html. */
export type SlotName = 'HEADER' | 'BANNER' | 'CONTENIDOS' | 'CIERRE' | 'FOOTER'

/** Orden en el que aparecen los marcadores dentro del template maestro. */
export const SLOT_ORDER: SlotName[] = ['HEADER', 'BANNER', 'CONTENIDOS', 'CIERRE', 'FOOTER']

/**
 * Estado completo de un email en construcción. A diferencia de inapps-builder
 * (donde un diseño ES un solo tipo discriminado), acá un email tiene TODOS los
 * slots a la vez — por eso este es un mapa, no una unión discriminada.
 * Los slots aún no implementados (header/banner/contenidos/cierre) se agregan
 * aquí como campos opcionales cuando se construyan, sin tocar lo existente.
 */
export interface EmailDocument {
  footer: FooterFields
}

/** Usado por store/persistence.ts para validar lo que viene de localStorage. */
export const emailDocumentSchema = z.object({
  footer: footerSchema,
})
