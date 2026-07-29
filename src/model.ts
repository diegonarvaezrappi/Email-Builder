import { z } from 'zod'
import { footerSchema, type FooterFields } from './components/footer/schema'
import { headerSchema, type HeaderFields } from './components/header/schema'
import { globalSchema, type GlobalFields } from './global/schema'

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
 *
 * `global` no es un slot: son los ajustes que afectan al email entero (hoy solo
 * el tema). No se renderiza en un marcador `<!-- ... -->`, se aplica sobre el
 * maestro completo — ver template/assemble.ts.
 */
export interface EmailDocument {
  global: GlobalFields
  header: HeaderFields
  footer: FooterFields
}

/** Usado por store/persistence.ts para validar lo que viene de localStorage. */
export const emailDocumentSchema = z.object({
  global: globalSchema,
  header: headerSchema,
  footer: footerSchema,
})
