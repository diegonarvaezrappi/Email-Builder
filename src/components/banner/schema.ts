import { z } from 'zod'
import { bannerItemSchema, defaultImgFijaFields, defaultPromoFields, defaultTagItem } from './items/schemas'
import { richTextFromPlain } from '../../richText/model'

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
 * Alineado de las piezas de zona MOLECULA dentro del banner VERTICAL —
 * decisión de producto pedida por el usuario, no del maestro (no hay ningún
 * `{{..._mail_general}}` ni comentario del maestro para esto, a diferencia de
 * `body_alineado_molecular` que sí existe para CONTENIDOS). Ver
 * `bannerSchema.moleculeAlign` más abajo para el detalle de qué piezas toca.
 */
export const BANNER_MOLECULE_ALIGN_VALUES = ['center', 'left'] as const
export type BannerMoleculeAlign = (typeof BANNER_MOLECULE_ALIGN_VALUES)[number]

export const BANNER_MOLECULE_ALIGN_LABELS: Record<BannerMoleculeAlign, string> = {
  center: 'Centrado',
  left: 'Izquierda',
}

/**
 * Mismo selector que `moleculeAlign`, para el banner HORIZONTAL — pero con la
 * polaridad invertida: ahí el maestro deja las piezas de zona MOLECULA
 * alineadas a la izquierda por defecto (ningún archivo _horizontal.html trae
 * `margin: 0 auto`, a diferencia de _vertical.html), así que 'left' es el
 * default y 'center' es lo que hay que construir (ver alignMoleculeCenter en
 * render.ts). CAMPO DISTINTO de `moleculeAlign` a propósito — no un solo
 * campo compartido con default condicional por bannerType — porque
 * bannerType puede cambiar sin tocar este campo (LibraryPanel.tsx) y un
 * default compartido "se filtraría" de una orientación a la otra al cambiar
 * de tipo de banner sin que el usuario lo haya pedido.
 */
export const BANNER_HORIZONTAL_MOLECULE_ALIGN_VALUES = ['left', 'center'] as const
export type BannerHorizontalMoleculeAlign = (typeof BANNER_HORIZONTAL_MOLECULE_ALIGN_VALUES)[number]

export const BANNER_HORIZONTAL_MOLECULE_ALIGN_LABELS: Record<BannerHorizontalMoleculeAlign, string> = {
  left: 'Izquierda',
  center: 'Centrado',
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
  /** Ver `bannerSchema.moleculeAlign`. Opcional: solo renderBannerSnippet
   *  (components/banner/render.ts) lo llena con el valor real del documento —
   *  el resto de call sites (sobre todo tests que invocan el render de UNA
   *  pieza suelta) puede omitirlo; renderCtaInternoSnippet lo trata como
   *  'center' (el default) cuando falta. */
  moleculeAlign?: BannerMoleculeAlign
  /** Ver `bannerSchema.horizontalMoleculeAlign`. Mismo criterio de opcionalidad
   *  que `moleculeAlign` — renderCtaInternoSnippet lo trata como 'left' (el
   *  default de esta orientación) cuando falta. */
  horizontalMoleculeAlign?: BannerHorizontalMoleculeAlign
}

export const bannerSchema = z.object({
  bannerType: z.enum(BANNER_TYPE_VALUES).default('vertical'),
  /** Reemplaza las 2 apariciones del token de relleno manual
   *  AQUIELLINKDELBANNER (href + originalsrc). Vacío = <a> sin destino. */
  link: z.string().default(''),
  items: z.array(bannerItemSchema).default([]),
  /** El contenedor de banner trae, por tema, un tono sólido
   *  (`bg_bannertono_mail_general`) y a veces una imagen (`bg_bannerimg_mail_general`)
   *  — activos por defecto en oscuros/Pro/ProBlack, apagados por defecto en
   *  pastel (ver components/banner/render.ts). `true` = respetar/activar el
   *  fondo del tema activo; `false` = forzar el "apagado" que el propio
   *  maestro documenta en un comentario dentro de big-banner-*.html. En
   *  pastel, activarlo pinta `bg_solid_mail_general` (no el tono del tema,
   *  que ahí es transparente) — mismo comentario del maestro. El default
   *  estático de este campo (true) es el de los temas NO pastel; el efecto
   *  de tema en App.tsx (themeDefaults.ts) lo corrige a `false` al entrar a
   *  un tema pastel, mismo patrón que header.brand/logoBackground. */
  backgroundEnabled: z.boolean().default(true),
  /**
   * Alineado de TODAS las piezas del banner VERTICAL — MOLECULA
   * (PROMO/CREDITOS/TEXTOXL/TEXTOM/TEXTO_COMPLEMENTARIO/IMG_AUTOMATICA_MOLECULA/
   * CTA_INTERNO) y MODULO (IMG_FIJA, TAGS) por igual. Cada pieza se centra
   * sola vía `margin: 0 auto` en su propio archivo _vertical.html; 'left' le
   * quita el "auto" a ese margin (ver alignMoleculeLeft en render.ts) —
   * CTA_INTERNO no tiene ese literal, así que su alineado se resuelve pasando
   * este mismo valor a través de ctx.moleculeAlign en items/render.ts en su
   * lugar; IMG_FIJA tampoco tiene efecto visual real (su logo ya viene
   * `text-align: left` del propio maestro), el replace ahí es un no-op.
   * Primera versión de este campo solo tocaba zona MOLECULA (interpretando
   * "moléculas" en el sentido estricto del código) — el usuario pidió
   * explícitamente que cubriera también los MODULOS ("todas las moleculas"
   * incluía imágenes/TAGS en su cabeza, no la taxonomía interna del código).
   * Sin efecto en horizontal: ahí las piezas van en una columna fija de
   * 240px (geometría distinta), y el selector de este campo ni se muestra
   * (ver components/banner/PropertiesPanel.tsx).
   */
  moleculeAlign: z.enum(BANNER_MOLECULE_ALIGN_VALUES).default('center'),
  /**
   * Alineado de las piezas de zona MOLECULA (PROMO/CREDITOS/TEXTOXL/TEXTOM/
   * TEXTO_COMPLEMENTARIO/IMG_AUTOMATICA_MOLECULA/CTA_INTERNO) dentro del
   * banner HORIZONTAL — la columna fija de 240px donde se apilan. A
   * diferencia de `moleculeAlign` (vertical), acá NO incluye los MODULOS
   * (IMG_FIJA, TAGS): en horizontal esos no comparten columna con las
   * moléculas — IMG_FIJA es una columna de 240px propia a la derecha, y TAGS
   * ya viene alineado a la DERECHA por diseño del maestro (`float: right`,
   * ver 02-components/README.md), un mecanismo distinto y deliberado que no
   * tiene relación con "izquierda vs centro". Cada pieza MOLECULA no trae
   * ningún `margin: 0 auto` en su _horizontal.html (a diferencia de
   * _vertical.html) — 'left' es entonces el estado natural del maestro, sin
   * transformación; 'center' construye la versión centrada (ver
   * alignMoleculeCenter en render.ts), agregando el mismo margin/text-align
   * que _vertical.html ya trae de fábrica.
   */
  horizontalMoleculeAlign: z.enum(BANNER_HORIZONTAL_MOLECULE_ALIGN_VALUES).default('left'),
})
export type BannerFields = z.infer<typeof bannerSchema>

/**
 * El `items: []` del schema queda puro/determinista; la regla de negocio de
 * qué trae el banner por defecto vive acá, no en el schema. Además del banner
 * vertical con TAGS que documenta el maestro ("por defecto el template debe
 * tener un banner vertical, con tags"), el banner por defecto viene pre-cargado
 * con PROMO, IMG_AUTOMATICA_MOLECULA, TEXTO_COMPLEMENTARIO e IMG_FIJA
 * (decisión de producto, no del maestro): así un usuario nuevo ve de entrada,
 * con datos de ejemplo, qué tipos de pieza puede combinar en vez de abrir la
 * app con un banner casi vacío. TAGS trae 3 tags (el máximo, en vez del único
 * por defecto de `defaultTagsFields`) para que quede claro que se pueden
 * agregar varios.
 *
 * Los valores de campo de acá son deliberadamente propios de ESTE banner de
 * ejemplo — no tocan defaultPromoFields/defaultImgFijaFields (los defaults
 * genéricos que sí usa bannerItemRegistry.ts al insertar una pieza NUEVA
 * desde el catálogo): pedido explícito del usuario 2026-08-25 de contenido
 * específico solo para el banner con el que arranca la app, sin cambiar qué
 * trae una pieza recién agregada. Reemplaza también TEXTOM por
 * IMG_AUTOMATICA_MOLECULA en la 2da posición (ya no forma parte del banner
 * por defecto).
 *
 * Ids fijos (no newId()) a propósito: mantienen defaultEmailDocument
 * determinista para tests — los ids solo necesitan ser únicos dentro de un
 * documento, y duplicateBannerItem siempre genera uno nuevo con newId().
 */
export const defaultBannerFields: BannerFields = {
  ...bannerSchema.parse({}),
  items: [
    {
      id: 'banner-promo-default',
      type: 'PROMO',
      fields: { ...defaultPromoFields, promoText: richTextFromPlain('50% OFF'), ahoraText: richTextFromPlain('Desde') },
    },
    {
      id: 'banner-img-automatica-molecula-default',
      type: 'IMG_AUTOMATICA_MOLECULA',
      fields: { imageUrl: 'https://lh3.googleusercontent.com/d/1uhZpndNKQ7C9tt1dXlFkpS0EHGXQhx-L', widthPercent: 100 },
    },
    {
      id: 'banner-texto-complementario-default',
      type: 'TEXTO_COMPLEMENTARIO',
      fields: { text: richTextFromPlain('Tus combos y hamburguesas favoritas con descuento solo esta semana.') },
    },
    {
      id: 'banner-img-fija-default',
      type: 'IMG_FIJA',
      fields: {
        ...defaultImgFijaFields,
        heroImageUrl: 'https://lh3.googleusercontent.com/d/14_FBy89QriBRhPFmE08rTUKcq0YOYl4e',
        logoImageUrl: 'https://lh3.googleusercontent.com/d/133AXVYx3soz7FSck1bjiF5vBLh-5mzml',
      },
    },
    {
      id: 'banner-tags-default',
      type: 'TAGS',
      fields: { tags: [defaultTagItem('tag 1'), defaultTagItem('tag 2'), defaultTagItem('tag 3')] },
    },
  ],
}
