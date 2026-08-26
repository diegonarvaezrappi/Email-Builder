import { z } from 'zod'
import { footerSchema, type FooterFields } from './components/footer/schema'
import { headerSchema, type HeaderFields } from './components/header/schema'
import { cierreSchema, type CierreFields } from './components/cierre/schema'
import { ctaFieldsSchema, type CtaFields } from './components/cta/schema'
import { dealsFieldsSchema, type DealsFields } from './components/deals/schema'
import { titleFieldsSchema, type TitleFields } from './components/title/schema'
import { bannerSchema, defaultBannerFields, type BannerFields } from './components/banner/schema'
import { globalSchema, type GlobalFields } from './global/schema'

/** Re-exportados para que el resto de la app siga importando desde model.ts,
 *  igual que ContentBlock — ver la nota en components/banner/items/schemas.ts
 *  sobre por qué el tipo en sí vive ahí y no acá (evita un ciclo de imports). */
export type { BannerItem, BannerItemType } from './components/banner/items/schemas'

/** Re-exportados por el mismo motivo, un nivel más adentro: una tarjeta de deal
 *  es a un bloque DEALS lo que una pieza de banner es al banner. */
export type { DealCard, DealCardFields } from './components/deals/schema'

/** Nombres de los marcadores de slot presentes en template_base.html. */
export type SlotName = 'HEADER' | 'BANNER' | 'CONTENIDOS' | 'CIERRE' | 'FOOTER'

/** Orden en el que aparecen los marcadores dentro del template maestro. */
export const SLOT_ORDER: SlotName[] = ['HEADER', 'BANNER', 'CONTENIDOS', 'CIERRE', 'FOOTER']

/**
 * Tipos de bloque de contenido que puede alojar CONTENIDOS (ver el comentario
 * "WRAPPER DE CONTENIDOS" del maestro: TITLE, CTA, DEALS, LOGOS, CUPONES,
 * BENEFICIOS y 3 layouts de columnas). Ampliar esta unión cuando se
 * implementen los demás — hoy CTA, DEALS y TITLE (fase 2 del plan de nuevos
 * módulos de contenido, ver [[project_body_modules_plan_2026-08-26]]).
 */
export type ContentBlockType = 'CTA' | 'DEALS' | 'TITLE'

export interface CtaBlock {
  id: string
  type: 'CTA'
  fields: CtaFields
}

/**
 * A diferencia de CTA (contenido opaco resuelto por Braze), DEALS es HTML real
 * horneado por la app y, sobre todo, es el primer bloque de CONTENIDOS con
 * piezas repetibles adentro: `fields.items` es una lista de hasta 4 tarjetas,
 * cada una seleccionable/reordenable por su cuenta en el lienzo — el mismo
 * patrón de doc.banner.items, un nivel más adentro. Ver components/deals/.
 */
export interface DealsBlock {
  id: string
  type: 'DEALS'
  fields: DealsFields
}

/**
 * El primer módulo de body real (fase 2 del plan de nuevos módulos de
 * contenido): a diferencia de DEALS (2 tarjetas de forma FIJA), `fields.items`
 * es una lista LIBRE de cualquier molécula del catálogo compartido
 * (bodyMoleculeRegistry.ts) — el motor que valida ese diseño para los 7
 * módulos que le siguen. Ver components/title/.
 */
export interface TitleBlock {
  id: string
  type: 'TITLE'
  fields: TitleFields
}

/** Unión discriminada por `type` — se suman más acá cuando existan. */
export type ContentBlock = CtaBlock | DealsBlock | TitleBlock

const ctaBlockSchema = z.object({
  id: z.string(),
  type: z.literal('CTA'),
  fields: ctaFieldsSchema,
})

const dealsBlockSchema = z.object({
  id: z.string(),
  type: z.literal('DEALS'),
  fields: dealsFieldsSchema,
})

const titleBlockSchema = z.object({
  id: z.string(),
  type: z.literal('TITLE'),
  fields: titleFieldsSchema,
})

export const contentBlockSchema = z.discriminatedUnion('type', [ctaBlockSchema, dealsBlockSchema, titleBlockSchema])

/**
 * Estado completo de un email en construcción. A diferencia de inapps-builder
 * (donde un diseño ES un solo tipo discriminado), acá un email tiene TODOS los
 * slots a la vez — por eso este es un mapa, no una unión discriminada.
 *
 * `banner` y `contenidos` no son singletons puros como header/footer/cierre:
 * `banner.items` y `contenidos` son listas libres y repetibles de piezas/bloques
 * (banner: 10 tipos posibles, ver components/banner/; contenidos: hoy solo
 * CTA) — ver components/banner/render.ts y components/contenidos/render.ts.
 *
 * `global` no es un slot: son los ajustes que afectan al email entero (hoy el
 * tema, el fondo y el estilo de CTA — este último global a propósito: cambiar
 * el color del botón afecta a TODOS los CTA del mail a la vez, incluido el
 * CTA interno de un banner, no es un campo por instancia). No se renderiza en
 * un marcador `<!-- ... -->`, se aplica sobre el maestro completo — ver
 * template/assemble.ts.
 */
export interface EmailDocument {
  global: GlobalFields
  header: HeaderFields
  banner: BannerFields
  footer: FooterFields
  cierre: CierreFields
  contenidos: ContentBlock[]
}

/** Usado por store/persistence.ts para validar lo que viene de localStorage.
 *  `banner` usa `.default(defaultBannerFields)` (no solo `bannerSchema`, que ya
 *  trae sus propios defaults por campo) para que un documento viejo en
 *  localStorage sin la key `banner` en absoluto cargue con el banner vertical
 *  + tags documentado, no con `items: []` vacío. */
export const emailDocumentSchema = z.object({
  global: globalSchema,
  header: headerSchema,
  banner: bannerSchema.default(defaultBannerFields),
  footer: footerSchema,
  cierre: cierreSchema,
  contenidos: z.array(contentBlockSchema).default([]),
})
