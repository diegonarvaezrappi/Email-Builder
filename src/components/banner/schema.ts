import { z } from 'zod'
import {
  bannerItemSchema,
  defaultImgFijaFields,
  defaultPromoFields,
  defaultTextoComplementarioFields,
  defaultTextoMFields,
} from './items/schemas'

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
  items: z.array(bannerItemSchema).default([]),
  /** El contenedor de banner trae, por tema, un tono sólido
   *  (`bg_bannertono_mail_general`) y a veces una imagen (`bg_bannerimg_mail_general`)
   *  — activos por defecto en oscuros/Pro/ProBlack, transparentes en pastel
   *  (ver components/banner/render.ts). `true` = respetar lo que traiga el
   *  tema activo (default); `false` = forzar el "apagado" que el propio
   *  maestro documenta en un comentario dentro de big-banner-*.html, sin
   *  importar el tema. */
  backgroundEnabled: z.boolean().default(true),
})
export type BannerFields = z.infer<typeof bannerSchema>

/**
 * El `items: []` del schema queda puro/determinista; la regla de negocio de
 * qué trae el banner por defecto vive acá, no en el schema. Además del banner
 * vertical con TAGS que documenta el maestro ("por defecto el template debe
 * tener un banner vertical, con tags"), el banner por defecto viene pre-cargado
 * con PROMO, TEXTOM, TEXTO_COMPLEMENTARIO e IMG_FIJA (decisión de producto, no
 * del maestro): así un usuario nuevo ve de entrada, con datos de ejemplo, qué
 * tipos de pieza puede combinar en vez de abrir la app con un banner casi
 * vacío. TAGS trae 3 tags (el máximo, en vez del único por defecto de
 * `defaultTagsFields`) para que quede claro que se pueden agregar varios.
 * Ids fijos (no newId()) a propósito: mantienen defaultEmailDocument
 * determinista para tests — los ids solo necesitan ser únicos dentro de un
 * documento, y duplicateBannerItem siempre genera uno nuevo con newId().
 */
export const defaultBannerFields: BannerFields = {
  ...bannerSchema.parse({}),
  items: [
    { id: 'banner-promo-default', type: 'PROMO', fields: defaultPromoFields },
    { id: 'banner-textom-default', type: 'TEXTOM', fields: defaultTextoMFields },
    { id: 'banner-texto-complementario-default', type: 'TEXTO_COMPLEMENTARIO', fields: defaultTextoComplementarioFields },
    { id: 'banner-img-fija-default', type: 'IMG_FIJA', fields: defaultImgFijaFields },
    { id: 'banner-tags-default', type: 'TAGS', fields: { tags: ['tag 1', 'tag 2', 'tag 3'] } },
  ],
}
