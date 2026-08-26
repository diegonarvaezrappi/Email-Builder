// ============================================================================
// Los tipos de MOLÉCULA que puede alojar el área libre de un módulo de body —
// el catálogo ÚNICO y COMPARTIDO entre todos los módulos (Título, y los que
// sigan) que el usuario pidió explícito en la transcripción (01:16:41–01:17:58,
// ver [[project_body_modules_plan_2026-08-26]]): "cualquier molécula de body
// puede ir dentro de cualquier módulo del body". Mismo espíritu que
// components/banner/items/schemas.ts (BannerItemType), un catálogo un nivel
// más arriba (no las 10 piezas de UN banner, sino las moléculas de TODOS los
// módulos de body).
//
// 3 de los 6 tipos de hoy SON las piezas de banner SEPARADOR/FRANJA_LOGOS/
// TEXTO_PASTILLA que se implementaron en la fase 1 (banner_moleculas/content_moleculas
// compartidas) — se REUSAN acá literalmente (mismo schema, mismo default,
// mismo render, mismo panel), no se duplican: son la misma molécula, solo que
// ahora también instanciable dentro de un módulo de body, no solo del banner.
// Los otros 3 (TITULO_TEXTO/SUBTITULO_TEXTO/SEPARADOR_LINEA) son moléculas de
// BODY que no existen en el banner — nacen acá, fase 2, primer consumidor:
// components/title/render.ts.
// ============================================================================
import { z } from 'zod'
import { franjaLogosFieldsSchema, separadorFieldsSchema, textoPastillaFieldsSchema } from '../components/banner/items/schemas'

export const MODULE_ITEM_TYPE_VALUES = [
  'TITULO_TEXTO',
  'SUBTITULO_TEXTO',
  'SEPARADOR_LINEA',
  'SEPARADOR',
  'FRANJA_LOGOS',
  'TEXTO_PASTILLA',
] as const
export type ModuleItemType = (typeof MODULE_ITEM_TYPE_VALUES)[number]

/** `<h2 role="molecula-texto">` — el título en sí, tag FIJO (el maestro no
 *  ofrece cambiarle el tamaño, a diferencia de TEXTOXL/TEXTOM del banner) —
 *  ver components/title/modulo-titulo.html: "Algunos módulos bloquean el
 *  cambio de tamaño (la etiqueta viene fija)". Texto plano, no RichText: el
 *  maestro no pide modificadores para esta molécula puntual (simplificación
 *  deliberada de esta fase — se puede sumar RichText después si hace falta,
 *  mismo criterio que ya tienen TEXTOXL/TEXTOM del banner). */
export const tituloTextoFieldsSchema = z.object({ text: z.string().default('Titulo') })
export type TituloTextoFields = z.infer<typeof tituloTextoFieldsSchema>
export const defaultTituloTextoFields: TituloTextoFields = tituloTextoFieldsSchema.parse({})

/** `<h3 role="molecula-texto">` — mismo criterio que TITULO_TEXTO (tag fijo, texto plano). */
export const subtituloTextoFieldsSchema = z.object({
  text: z.string().default('bloque de texto bloque de texto bloque de texto'),
})
export type SubtituloTextoFields = z.infer<typeof subtituloTextoFieldsSchema>
export const defaultSubtituloTextoFields: SubtituloTextoFields = subtituloTextoFieldsSchema.parse({})

/** content_moleculas/molecula_separador_s.html — una línea decorativa fija
 *  (borde de color, sin texto ni tamaño que editar), NO CONFUNDIR con la
 *  pieza SEPARADOR (molecula_separadores.html, el espaciador invisible S/M/general
 *  de fase 1): son 2 archivos maestro distintos con el mismo propósito
 *  general ("separar visualmente") pero apariencia y campos distintos — ver
 *  la nota de scripts/sync-master.mjs sobre por qué no se copian bajo el
 *  mismo nombre. Sin campos: nada que el usuario pueda tocar en este archivo. */
export const separadorLineaFieldsSchema = z.object({})
export type SeparadorLineaFields = z.infer<typeof separadorLineaFieldsSchema>
export const defaultSeparadorLineaFields: SeparadorLineaFields = separadorLineaFieldsSchema.parse({})

/** Unión discriminada derivada de zod — mismo criterio que bannerItemSchema.
 *  `areaKey` distingue en qué área libre del módulo vive el item (Título solo
 *  tiene 'main'; un futuro módulo con más de un área libre — ej. 1 columna,
 *  arriba/abajo de la imagen — reusa el mismo campo). */
export const moduleItemSchema = z.discriminatedUnion('type', [
  z.object({ id: z.string(), areaKey: z.string(), type: z.literal('TITULO_TEXTO'), fields: tituloTextoFieldsSchema }),
  z.object({ id: z.string(), areaKey: z.string(), type: z.literal('SUBTITULO_TEXTO'), fields: subtituloTextoFieldsSchema }),
  z.object({ id: z.string(), areaKey: z.string(), type: z.literal('SEPARADOR_LINEA'), fields: separadorLineaFieldsSchema }),
  z.object({ id: z.string(), areaKey: z.string(), type: z.literal('SEPARADOR'), fields: separadorFieldsSchema }),
  z.object({ id: z.string(), areaKey: z.string(), type: z.literal('FRANJA_LOGOS'), fields: franjaLogosFieldsSchema }),
  z.object({ id: z.string(), areaKey: z.string(), type: z.literal('TEXTO_PASTILLA'), fields: textoPastillaFieldsSchema }),
])
export type ModuleItem = z.infer<typeof moduleItemSchema>
