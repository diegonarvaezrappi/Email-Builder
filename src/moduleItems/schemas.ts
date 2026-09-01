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
// 3 de los 12 tipos de hoy SON las piezas de banner SEPARADOR/FRANJA_LOGOS/
// TEXTO_PASTILLA que se implementaron en la fase 1 (banner_moleculas/content_moleculas
// compartidas) — se REUSAN acá literalmente (mismo schema, mismo default,
// mismo render, mismo panel), no se duplican: son la misma molécula, solo que
// ahora también instanciable dentro de un módulo de body, no solo del banner.
// TITULO_TEXTO/SUBTITULO_TEXTO/SEPARADOR_LINEA (fase 2), BULLET_ICONO/
// BULLET_NUMERADO/ICONO/BENEFICIOS_TITULO/BENEFICIOS_TEXTO (fase 3) y
// COLUMNA_TEXTO (fase 5) son moléculas de BODY que no existen en el banner —
// cada una nace anclada a SU propio archivo maestro de origen
// (modulo-titulo.html, molecula_bullet_*.html, molecula_icono.html,
// modulo-beneficios.html, modulo-3-columnas.html), aunque quedan disponibles
// para CUALQUIER módulo una vez registradas acá (mismo criterio "universal" de
// arriba) — igual que TITULO_TEXTO/SUBTITULO_TEXTO no se limitan a Título.
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
  'BULLET_ICONO',
  'BULLET_NUMERADO',
  'ICONO',
  'BENEFICIOS_TITULO',
  'BENEFICIOS_TEXTO',
  'COLUMNA_TEXTO',
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

/**
 * BULLET_ICONO — content_moleculas/molecula_bullet_icono_{s,m,l}.html: "unifica"
 * los 3 archivos separados del maestro en UNA sola molécula con selector de
 * tamaño (pedido explícito del plan, sección D.2) — icono + título (`<h3>`) +
 * texto (`<h4>`), los 3 juntos en una sola `<table>`, mismo criterio que
 * FRANJA_LOGOS (`size` aplica a la pieza entera, no hay control de tamaño por
 * separado). OJO — el archivo NOMBRADO "l" trae internamente
 * `role="molecula-iconoXL"` (no "...iconoL"): typo/inconsistencia real del
 * maestro (ver moduleItems/render.ts) — `size: 'L'` mapea al archivo por
 * NOMBRE, no por su role interno.
 */
export const BULLET_ICONO_SIZE_VALUES = ['S', 'M', 'L'] as const
export type BulletIconoSize = (typeof BULLET_ICONO_SIZE_VALUES)[number]
export const BULLET_ICONO_SIZE_LABELS: Record<BulletIconoSize, string> = { S: 'Chico', M: 'Mediano', L: 'Grande' }
export const bulletIconoFieldsSchema = z.object({
  size: z.enum(BULLET_ICONO_SIZE_VALUES).default('L'),
  titulo: z.string().default('Subtitulo'),
  texto: z.string().default('bloque de texto bloque de texto bloque de texto'),
})
export type BulletIconoFields = z.infer<typeof bulletIconoFieldsSchema>
export const defaultBulletIconoFields: BulletIconoFields = bulletIconoFieldsSchema.parse({})

/** BULLET_NUMERADO — content_moleculas/molecula_bullet_numerado.html: mismo
 *  título+texto que BULLET_ICONO pero SIN control de tamaño (el maestro dice
 *  "typographic", el número es un `<h4>` con borde, no un ícono) — el número
 *  en sí (`numero`) es texto libre, no se auto-incrementa entre instancias
 *  (mismo criterio "sin magia" que el resto de los campos de texto plano). */
export const bulletNumeradoFieldsSchema = z.object({
  numero: z.string().default('1'),
  titulo: z.string().default('Subtitulo'),
  texto: z.string().default('bloque de texto bloque de texto bloque de texto'),
})
export type BulletNumeradoFields = z.infer<typeof bulletNumeradoFieldsSchema>
export const defaultBulletNumeradoFields: BulletNumeradoFields = bulletNumeradoFieldsSchema.parse({})

/**
 * ICONO — content_moleculas/molecula_icono.html: molécula GENÉRICA (solo el
 * ícono, sin texto — a diferencia de BULLET_ICONO), un archivo con 4 `<img>`
 * alternativos documentados (S/M/L/XL); el maestro dice "S/M por defecto SIN
 * border-radius, se puede agregar uno de 7px" y "L/XL por defecto CON
 * border-radius: 7px, se puede quitar" — un default por tamaño, no uno solo
 * para los 4. Simplificación deliberada (mismo criterio que el resto de la
 * app: ningún campo cambia el valor de OTRO campo automáticamente): el
 * default de fábrica de acá es el de 'M' (size='M' + sin radius), y cambiar
 * `size` no reescribe `borderRadiusEnabled` — el usuario lo prende si lo
 * necesita. Primer consumidor real: el área libre de Beneficios (su ícono de
 * fábrica es justamente un M). */
export const ICONO_SIZE_VALUES = ['S', 'M', 'L', 'XL'] as const
export type IconoSize = (typeof ICONO_SIZE_VALUES)[number]
export const ICONO_SIZE_LABELS: Record<IconoSize, string> = { S: 'Chico', M: 'Mediano', L: 'Grande', XL: 'Extra grande' }
export const ICONO_DEFAULT_URL = 'https://lh3.googleusercontent.com/d/1vdunOvDi3k-LLdfUwk2Qpotyl9u7ionz'
export const iconoFieldsSchema = z.object({
  imageUrl: z.string().default(ICONO_DEFAULT_URL),
  size: z.enum(ICONO_SIZE_VALUES).default('M'),
  borderRadiusEnabled: z.boolean().default(false),
})
export type IconoFields = z.infer<typeof iconoFieldsSchema>
export const defaultIconoFields: IconoFields = iconoFieldsSchema.parse({})

/** BENEFICIOS_TITULO/BENEFICIOS_TEXTO — extraídas de modulo-beneficios.html
 *  por ancla literal, mismo criterio que TITULO_TEXTO/SUBTITULO_TEXTO con
 *  modulo-titulo.html: tag FIJO, texto plano (sin RichText, mismo criterio de
 *  simplificación deliberada). El `<h3>`/`<h4>` de acá NO llevan
 *  `role="molecula-texto"` en el maestro (a diferencia de Título/Bullet) —
 *  se preserva tal cual, no se "corrige" la falta del atributo. */
export const beneficiosTituloFieldsSchema = z.object({ text: z.string().default('Descuentos de hasta xxx') })
export type BeneficiosTituloFields = z.infer<typeof beneficiosTituloFieldsSchema>
export const defaultBeneficiosTituloFields: BeneficiosTituloFields = beneficiosTituloFieldsSchema.parse({})

export const beneficiosTextoFieldsSchema = z.object({
  text: z.string().default('En todos tus pedidos en la app, pidiendo desde $XXXXXX'),
})
export type BeneficiosTextoFields = z.infer<typeof beneficiosTextoFieldsSchema>
export const defaultBeneficiosTextoFields: BeneficiosTextoFields = beneficiosTextoFieldsSchema.parse({})

/**
 * COLUMNA_TEXTO — extraída de modulo-3-columnas.html (fase 5 del plan de
 * nuevos módulos de contenido, ver [[project_body_modules_plan_2026-08-26]]),
 * mismo criterio que TITULO_TEXTO/BENEFICIOS_TITULO: tag FIJO (`<h4>`), texto
 * plano (sin RichText, misma simplificación deliberada). A diferencia de
 * BENEFICIOS_TEXTO (también un `<h4>`), este SÍ lleva `role="molecula-texto"`
 * en el maestro — se preserva tal cual, no se unifica con Beneficios (son 2
 * archivos de origen distintos, aunque el texto de fábrica sea corto en
 * ambos). El texto "Texto corto" aparece 3 veces en el archivo (una por
 * celda, todas byte-idénticas) — el render toma la 1ra ocurrencia como
 * plantilla de referencia, mismo criterio que BENEFICIOS_TITULO/TEXTO con
 * modulo-beneficios.html (ninguno de los 2 depende de que el texto sea único
 * en el archivo, solo de que la 1ra copia sea una plantilla válida).
 */
export const columnaTextoFieldsSchema = z.object({ text: z.string().default('Texto corto') })
export type ColumnaTextoFields = z.infer<typeof columnaTextoFieldsSchema>
export const defaultColumnaTextoFields: ColumnaTextoFields = columnaTextoFieldsSchema.parse({})

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
  z.object({ id: z.string(), areaKey: z.string(), type: z.literal('BULLET_ICONO'), fields: bulletIconoFieldsSchema }),
  z.object({ id: z.string(), areaKey: z.string(), type: z.literal('BULLET_NUMERADO'), fields: bulletNumeradoFieldsSchema }),
  z.object({ id: z.string(), areaKey: z.string(), type: z.literal('ICONO'), fields: iconoFieldsSchema }),
  z.object({ id: z.string(), areaKey: z.string(), type: z.literal('BENEFICIOS_TITULO'), fields: beneficiosTituloFieldsSchema }),
  z.object({ id: z.string(), areaKey: z.string(), type: z.literal('BENEFICIOS_TEXTO'), fields: beneficiosTextoFieldsSchema }),
  z.object({ id: z.string(), areaKey: z.string(), type: z.literal('COLUMNA_TEXTO'), fields: columnaTextoFieldsSchema }),
])
export type ModuleItem = z.infer<typeof moduleItemSchema>
