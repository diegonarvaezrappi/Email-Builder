import { z } from 'zod'
import { footerSchema, type FooterFields } from './components/footer/schema'
import { headerSchema, type HeaderFields } from './components/header/schema'
import { cierreSchema, type CierreFields } from './components/cierre/schema'
import { ctaFieldsSchema, type CtaFields } from './components/cta/schema'
import { dealsFieldsSchema, type DealsFields } from './components/deals/schema'
import { titleFieldsSchema, type TitleFields } from './components/title/schema'
import { bulletFieldsSchema, type BulletFields } from './components/bullet/schema'
import { beneficiosFieldsSchema, type BeneficiosFields } from './components/benefits/schema'
import { col1FieldsSchema, type Col1Fields } from './components/col1/schema'
import { col3FieldsSchema, type Col3Fields } from './components/col3/schema'
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
 * implementen los demás — hoy CTA, DEALS, TITLE, BULLET, BENEFICIOS (fases 2 y
 * 3), COL1 (fase 4) y COL3 (fase 5) del plan de nuevos módulos de contenido,
 * ver [[project_body_modules_plan_2026-08-26]].
 */
export type ContentBlockType = 'CTA' | 'DEALS' | 'TITLE' | 'BULLET' | 'BENEFICIOS' | 'COL1' | 'COL3'

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

/**
 * Fase 3: mismo motor de área libre que TITLE, pero el shell descarta ENTERO
 * su icono+h3+h4 de fábrica (no los extrae como items propios, a diferencia
 * de TITLE) — ver components/bullet/.
 */
export interface BulletBlock {
  id: string
  type: 'BULLET'
  fields: BulletFields
}

/**
 * Fase 3: a diferencia de TITLE/BULLET, tiene una celda FIJA (una imagen no
 * removible) además de su única área libre — ver components/benefits/.
 */
export interface BeneficiosBlock {
  id: string
  type: 'BENEFICIOS'
  fields: BeneficiosFields
}

/**
 * Fase 4: primer módulo con MÁS de un área libre (`fields.items` mezcla
 * `areaKey: 'above'|'below'` en el mismo array plano — mismo motor, solo un
 * segundo valor de areaKey, ya anticipado por moduleItemSchema). También el
 * primero con una imagen FIJA (como Beneficios) que además es REMOVIBLE
 * (URL en blanco = sin imagen), a diferencia de la de Beneficios. Ver
 * components/col1/.
 */
export interface Col1Block {
  id: string
  type: 'COL1'
  fields: Col1Fields
}

/**
 * Fase 5: primer módulo con celdas REPETIDAS (3, siempre las mismas, sin
 * agregar/quitar) en vez de una sola imagen/área — y el primero cuyo fondo/
 * click NO son una única variable de módulo, sino "celda por celda" (el
 * maestro lo dice explícito, dos veces) — ver components/col3/. `items`
 * sigue siendo un solo array plano a nivel de módulo, igual mecanismo que
 * COL1's 'above'/'below': cada item lleva su propio areaKey ('cell1'|'cell2'|
 * 'cell3'), un tercer valor tan válido como un segundo para el motor
 * compartido.
 */
export interface Col3Block {
  id: string
  type: 'COL3'
  fields: Col3Fields
}

/** Unión discriminada por `type` — se suman más acá cuando existan. */
export type ContentBlock = CtaBlock | DealsBlock | TitleBlock | BulletBlock | BeneficiosBlock | Col1Block | Col3Block

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

const bulletBlockSchema = z.object({
  id: z.string(),
  type: z.literal('BULLET'),
  fields: bulletFieldsSchema,
})

const beneficiosBlockSchema = z.object({
  id: z.string(),
  type: z.literal('BENEFICIOS'),
  fields: beneficiosFieldsSchema,
})

const col1BlockSchema = z.object({
  id: z.string(),
  type: z.literal('COL1'),
  fields: col1FieldsSchema,
})

const col3BlockSchema = z.object({
  id: z.string(),
  type: z.literal('COL3'),
  fields: col3FieldsSchema,
})

export const contentBlockSchema = z.discriminatedUnion('type', [
  ctaBlockSchema,
  dealsBlockSchema,
  titleBlockSchema,
  bulletBlockSchema,
  beneficiosBlockSchema,
  col1BlockSchema,
  col3BlockSchema,
])

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
