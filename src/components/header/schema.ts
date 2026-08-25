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

/** 'xl' agregado en el pull 2026-08-21 (bd9f4a5) — los 40 maestros ya traen
 *  esa 4ta <img> de cobranding, ver render.ts (COBRANDING_IMG_RE ya la
 *  matcheaba para poder descartarla; ahora queda seleccionable). */
export const COBRANDING_SIZE_VALUES = ['s', 'm', 'l', 'xl'] as const
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
  /** Default 'columnas' — pedido explícito del usuario 2026-08-25 (antes era
   *  'centrado'). */
  layout: z.enum(HEADER_LAYOUT_VALUES).default('columnas'),
  logoBackground: z.enum(HEADER_LOGO_BACKGROUND_VALUES).default('claro'),
  /**
   * "Personalizado" en el select de Marca — pedido explícito del usuario: el
   * cambio de tamaño/URL de logo NO debe estar disponible para las 10 marcas
   * reales, solo cuando el usuario elige explícitamente personalizar el logo.
   * NO se agrega 'personalizado' a HEADER_BRAND_VALUES (esa lista debe seguir
   * 1:1 con las carpetas reales de 02-components/01_headers/ que
   * sync-master.mjs sincroniza — un valor inventado ahí rompería esa
   * sincronización) — en su lugar, `brand` sigue siendo siempre una marca real
   * (la que sirve de base estructural: layout, cobranding, etc.) y este flag,
   * puramente de UI/render, decide si logoUrl/logoSize tienen efecto. Ver
   * PropertiesPanel.tsx (el <select> combina ambos en una sola opción visible)
   * y applyLogoOverrides en render.ts.
   */
  customLogo: z.boolean().default(false),
  /** URL propia para reemplazar el logo de marca. Solo tiene efecto cuando
   *  customLogo es true — vacío = se conserva el asset del maestro para la
   *  marca/logoBackground elegidos. */
  logoUrl: z.string().default(''),
  /** Tamaño del logo de marca — ver HEADER_LOGO_SIZE_VALUES arriba. Solo tiene
   *  efecto cuando customLogo es true (una marca real siempre usa el tamaño
   *  original del maestro, sin overrides). */
  logoSize: z.enum(HEADER_LOGO_SIZE_VALUES).default('m'),
  /** Default `true` — pedido explícito del usuario 2026-08-25 (antes era
   *  `false`), junto con `cobrandingImageUrl` de abajo. */
  cobranding: z.boolean().default(true),
  cobrandingSize: z.enum(COBRANDING_SIZE_VALUES).default('m'),
  /** Default: imagen de cobranding pedida explícitamente por el usuario
   *  2026-08-25 para que aparezca activada desde que se carga la app. Ya NO
   *  coincide con COBRANDING_IMG_SRC_PLACEHOLDER en header/render.ts (el
   *  placeholder que traen los 40 archivos de header) — no hace falta que
   *  coincida: ese placeholder es del maestro, independiente de este default,
   *  y `applyCobranding` siempre sustituye el placeholder por el valor actual
   *  de este campo sea cual sea. */
  cobrandingImageUrl: z.string().default('https://lh3.googleusercontent.com/d/1JYYWeVebW_G73Y2f-Enj6gwV--MN3Y_u'),
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
  xl: 'Extra grande',
}

export const HEADER_LOGO_SIZE_LABELS: Record<HeaderLogoSize, string> = {
  s: 'Pequeño',
  m: 'Mediano (original)',
  l: 'Grande',
}
