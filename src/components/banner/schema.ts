import { z } from 'zod'
import { bannerItemSchema, defaultTagsFields } from './items/schemas'

/**
 * 'vertical' primero: es el default documentado por el maestro
 * ("por defecto el template debe tener un banner vertical, con tags" —
 * ver el comentario `<!-- BANNER : ... -->` en estructura_general.html).
 * El tipo se elige por la COMPOSICIÓN del mail, no por la forma de la imagen
 * (05-docs/USO-DE-CADA-PARTE.md): vertical para mails simples (solo CTA +
 * cierre), horizontal para mails con módulos de contenido.
 */
export const BANNER_TYPE_VALUES = ['vertical', 'horizontal'] as const
export type BannerType = (typeof BANNER_TYPE_VALUES)[number]

export const BANNER_TYPE_LABELS: Record<BannerType, string> = {
  vertical: 'Vertical — mail simple (solo CTA + cierre)',
  horizontal: 'Horizontal — mail con módulos de contenido',
}

/** Título corto para las cards de tipo de banner del panel izquierdo
 *  (ui/LibraryPanel.tsx) — BANNER_TYPE_LABELS es la versión larga usada en la
 *  lista de "piezas ocultas" del panel derecho, acá va solo el nombre. */
export const BANNER_TYPE_TITLES: Record<BannerType, string> = {
  vertical: 'Vertical',
  horizontal: 'Horizontal',
}

/** Texto breve bajo cada card de tipo de banner, en lenguaje simple. */
export const BANNER_TYPE_CAPTIONS: Record<BannerType, string> = {
  vertical: 'Mail simple: solo CTA + cierre.',
  horizontal: 'Mail con módulos de contenido.',
}

/**
 * Lo que una pieza de banner necesita saber del banner que la contiene. Cada
 * pieza tiene archivo horizontal y vertical con placeholders DISTINTOS (el
 * vertical suele usar `{{..._fontsize_vertical}}`, el horizontal el mismo
 * nombre sin sufijo) — ver components/banner/items/render.ts. Vive acá (no en
 * bannerItemRegistry.ts) para que items/render.ts pueda importarlo sin crear
 * un ciclo con el registro, que a su vez importa los renders.
 */
export interface BannerItemRenderCtx {
  bannerType: BannerType
}

export const bannerSchema = z.object({
  bannerType: z.enum(BANNER_TYPE_VALUES).default('vertical'),
  /** Reemplaza las 2 apariciones del token de relleno manual
   *  AQUIELLINKDELBANNER (href + originalsrc). Vacío = <a> sin destino. */
  link: z.string().default(''),
  /** Borrado a mano desde el Viewport, se restaura arrastrando desde la
   *  librería de componentes — mismo patrón que Cierre. */
  removed: z.boolean().default(false),
  items: z.array(bannerItemSchema).default([]),
})
export type BannerFields = z.infer<typeof bannerSchema>

/**
 * El `items: []` del schema queda puro/determinista; la regla de negocio
 * "banner vertical CON TAGS por defecto" (instrucción explícita del maestro,
 * mismo peso que el auto-ocultado Pro/ProBlack de Cierre) vive acá, no en el
 * schema. Id fijo (no newId()) a propósito: mantiene defaultEmailDocument
 * determinista para tests — los ids solo necesitan ser únicos dentro de un
 * documento, y duplicateBannerItem siempre genera uno nuevo con newId().
 */
export const defaultBannerFields: BannerFields = {
  ...bannerSchema.parse({}),
  items: [{ id: 'banner-tags-default', type: 'TAGS', fields: defaultTagsFields }],
}
