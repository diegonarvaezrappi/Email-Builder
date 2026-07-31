import { z } from 'zod'
import { footerSchema, type FooterFields } from './components/footer/schema'
import { headerSchema, type HeaderFields } from './components/header/schema'
import { cierreSchema, type CierreFields } from './components/cierre/schema'
import { ctaFieldsSchema, type CtaFields } from './components/cta/schema'
import { bannerSchema, defaultBannerFields, type BannerFields } from './components/banner/schema'
import { globalSchema, type GlobalFields } from './global/schema'

/** Re-exportados para que el resto de la app siga importando desde model.ts,
 *  igual que ContentBlock — ver la nota en components/banner/items/schemas.ts
 *  sobre por qué el tipo en sí vive ahí y no acá (evita un ciclo de imports). */
export type { BannerItem, BannerItemType } from './components/banner/items/schemas'

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
