import { z } from 'zod'

/**
 * Las 10 marcas de 02-components/headers/ (una subcarpeta por marca). Lista
 * fija a propósito, igual que FOOTER_FILES en scripts/sync-master.mjs — con
 * la que este arreglo debe quedar sincronizado si el repo agrega una marca.
 */
export const HEADER_BRAND_VALUES = [
  'rappi',
  'rappi-travel',
  'soyrappi',
  'rappi-turbo',
  'rappi-turbo-rest',
  'rappi-pro',
  'rappi-pro-black',
  'rappi-defensoria',
  'rappi-entregador',
  'contenido-aliado',
] as const

export type HeaderBrand = (typeof HEADER_BRAND_VALUES)[number]

export const HEADER_LAYOUT_VALUES = ['centrado', 'columnas'] as const
export type HeaderLayout = (typeof HEADER_LAYOUT_VALUES)[number]

/**
 * Versión del logo — forzada por el usuario, INDEPENDIENTE del tema general
 * del mail (ver 02-components/README.md: "cualquiera de los 10 headers puede
 * combinarse con cualquiera de los 11 temas"). 'claro' = logo para fondo
 * claro, 'oscuro' = logo blanco para fondo oscuro.
 */
export const HEADER_LOGO_BACKGROUND_VALUES = ['claro', 'oscuro'] as const
export type HeaderLogoBackground = (typeof HEADER_LOGO_BACKGROUND_VALUES)[number]

export const COBRANDING_SIZE_VALUES = ['s', 'm', 'l'] as const
export type CobrandingSize = (typeof COBRANDING_SIZE_VALUES)[number]

/**
 * Tamaño del logo de MARCA (no el de cobranding, que tiene su propio
 * selector). A diferencia de cobranding, los 40 maestros no traen 3 variantes
 * horneadas para este logo — 's'/'l' se calculan en render.ts como un
 * porcentaje del alto original que traiga el maestro para esa marca. 'm' es
 * el tamaño original, sin cambios (default, no-op).
 */
export const HEADER_LOGO_SIZE_VALUES = ['s', 'm', 'l'] as const
export type HeaderLogoSize = (typeof HEADER_LOGO_SIZE_VALUES)[number]

export const headerSchema = z.object({
  brand: z.enum(HEADER_BRAND_VALUES).default('rappi'),
  layout: z.enum(HEADER_LAYOUT_VALUES).default('centrado'),
  logoBackground: z.enum(HEADER_LOGO_BACKGROUND_VALUES).default('claro'),
  /** URL propia para reemplazar el logo de marca. Vacío (default) = se
   *  conserva el asset del maestro para la marca/logoBackground elegidos. */
  logoUrl: z.string().default(''),
  /** Tamaño del logo de marca — ver HEADER_LOGO_SIZE_VALUES arriba. Se aplica
   *  también cuando logoUrl está vacío (afecta el logo original, no solo un
   *  reemplazo custom). */
  logoSize: z.enum(HEADER_LOGO_SIZE_VALUES).default('m'),
  cobranding: z.boolean().default(false),
  cobrandingSize: z.enum(COBRANDING_SIZE_VALUES).default('m'),
  /** Default = la URL placeholder que traen los 40 archivos de header
   *  (idéntica en los 3 tamaños de cada uno) — debe coincidir con
   *  COBRANDING_IMG_SRC_PLACEHOLDER en header/render.ts, que la usa como
   *  ancla para sustituir por esta URL. */
  cobrandingImageUrl: z.string().default('https://lh3.googleusercontent.com/d/1jrRUyQvYuQ8gsVP1Sk0jvM3BdFO0ZaJA'),
  /** Los 40 archivos traen `border-radius: 5px` en las 3 <img> de cobranding.
   *  Default `true` = se respeta el maestro tal cual; en `false`, render.ts se
   *  lo quita a la <img> que queda (algunos logos de partner no deben salir
   *  con esquinas redondeadas). */
  cobrandingRounded: z.boolean().default(true),
})

export type HeaderFields = z.infer<typeof headerSchema>

export const defaultHeaderFields: HeaderFields = headerSchema.parse({})

export const HEADER_BRAND_LABELS: Record<HeaderBrand, string> = {
  rappi: 'Rappi',
  'rappi-travel': 'Rappi Travel',
  soyrappi: 'Soy Rappi',
  'rappi-turbo': 'Rappi Turbo',
  'rappi-turbo-rest': 'Rappi Turbo Restaurantes',
  'rappi-pro': 'Rappi Pro',
  'rappi-pro-black': 'Rappi Pro Black',
  'rappi-defensoria': 'Defensoría',
  'rappi-entregador': 'Rappi Entregador',
  'contenido-aliado': 'Contenido aliado',
}

export const HEADER_LAYOUT_LABELS: Record<HeaderLayout, string> = {
  centrado: 'Centrado',
  columnas: 'Columnas',
}

export const HEADER_LOGO_BACKGROUND_LABELS: Record<HeaderLogoBackground, string> = {
  claro: 'Fondo claro',
  oscuro: 'Fondo oscuro',
}

export const COBRANDING_SIZE_LABELS: Record<CobrandingSize, string> = {
  s: 'Pequeño',
  m: 'Mediano',
  l: 'Grande',
}

export const HEADER_LOGO_SIZE_LABELS: Record<HeaderLogoSize, string> = {
  s: 'Pequeño',
  m: 'Mediano (original)',
  l: 'Grande',
}
