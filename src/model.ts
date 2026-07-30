import { z } from 'zod'
import { footerSchema, type FooterFields } from './components/footer/schema'
import { headerSchema, type HeaderFields } from './components/header/schema'
import { cierreSchema, type CierreFields } from './components/cierre/schema'
import { ctaFieldsSchema, type CtaFields } from './components/cta/schema'
import { globalSchema, type GlobalFields } from './global/schema'

/** Nombres de los marcadores de slot presentes en template_base.html. */
export type SlotName = 'HEADER' | 'BANNER' | 'CONTENIDOS' | 'CIERRE' | 'FOOTER'

/** Orden en el que aparecen los marcadores dentro del template maestro. */
export const SLOT_ORDER: SlotName[] = ['HEADER', 'BANNER', 'CONTENIDOS', 'CIERRE', 'FOOTER']

/**
 * Tipos de bloque de contenido que puede alojar CONTENIDOS (ver el comentario
 * "WRAPPER DE CONTENIDOS" del maestro: TITLE, CTA, DEALS, LOGOS, CUPONES,
 * BENEFICIOS y 3 layouts de columnas). Ampliar esta unión cuando se
 * implementen los demás — hoy solo CTA.
 */
export type ContentBlockType = 'CTA'

export interface CtaBlock {
  id: string
  type: 'CTA'
  fields: CtaFields
}

/** Unión discriminada por `type` — un solo miembro hoy, se suman más acá cuando existan. */
export type ContentBlock = CtaBlock

const ctaBlockSchema = z.object({
  id: z.string(),
  type: z.literal('CTA'),
  fields: ctaFieldsSchema,
})

export const contentBlockSchema = z.discriminatedUnion('type', [ctaBlockSchema])

/**
 * Estado completo de un email en construcción. A diferencia de inapps-builder
 * (donde un diseño ES un solo tipo discriminado), acá un email tiene TODOS los
 * slots a la vez — por eso este es un mapa, no una unión discriminada.
 * El slot aún no implementado (banner) se agrega aquí como campo opcional
 * cuando se construya, sin tocar lo existente.
 *
 * `contenidos` es el único slot que NO es un singleton: es una lista libre y
 * repetible de bloques (hoy solo CTA) — ver components/contenidos/render.ts.
 *
 * `global` no es un slot: son los ajustes que afectan al email entero (hoy el
 * tema, el fondo y el estilo de CTA — este último global a propósito: cambiar
 * el color del botón afecta a TODOS los CTA del mail a la vez, no es un campo
 * por instancia). No se renderiza en un marcador `<!-- ... -->`, se aplica
 * sobre el maestro completo — ver template/assemble.ts.
 */
export interface EmailDocument {
  global: GlobalFields
  header: HeaderFields
  footer: FooterFields
  cierre: CierreFields
  contenidos: ContentBlock[]
}

/** Usado por store/persistence.ts para validar lo que viene de localStorage. */
export const emailDocumentSchema = z.object({
  global: globalSchema,
  header: headerSchema,
  footer: footerSchema,
  cierre: cierreSchema,
  contenidos: z.array(contentBlockSchema).default([]),
})
