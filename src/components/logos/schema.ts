// ============================================================================
// Campos del bloque LOGOS ("franja de logos", grilla de 3/4/6) — fase 7 del
// plan de nuevos módulos de contenido (ver [[project_body_modules_plan_2026-08-26]]).
//
// Mismo shape general que COL2 (fase 6): dual-table escritorio/mobile, fondo/
// click/alineado como una única variable de módulo (`hasGeneralModuleFields:
// true` — verificado por conteo de anclas: LINKMODULLOGOS/bg_contenedor1_mail_general
// aparecen 1 sola vez, el resto de las piezas variables 2 veces, una por
// tabla) + área libre reutilizando TITULO_TEXTO/SEPARADOR_LINEA/SUBTITULO_TEXTO
// (el maestro trae el MISMO literal h2+separador+h3 que modulo-titulo.html) +
// orden de celdas intercambiable.
//
// Lo genuinamente nuevo: la grilla de logos en sí. El maestro dice "En el
// campo de logos se puede tener grilla con 3, 4 o 6 logos" — 3 archivos
// maestro alternativos (grilla3/4/6logos.html), UNO se inserta entero según
// `gridSize`. `logos` es un tuple FIJO de 6 (no 3, no un array dinámico según
// gridSize): así cambiar `gridSize` de ida y vuelta nunca pierde lo que el
// usuario ya cargó en un logo — el render usa solo los primeros N según el
// tamaño elegido, el panel solo MUESTRA los primeros N (ver PropertiesPanel.tsx).
// ============================================================================
import { z } from 'zod'
import { newId } from '../../ids'
import { generalModuleFieldsSchema } from '../contentModules/generalFields'
import { moduleItemSchema, type ModuleItem } from '../../moduleItems/schemas'
import { defaultSeparadorLineaFields, defaultSubtituloTextoFields, defaultTituloTextoFields } from '../../moduleItems/schemas'

/** Única área libre del módulo — mismo criterio que COL2_MAIN_AREA. */
export const LOGOS_MAIN_AREA = 'main'

export const LOGOS_GRID_SIZE_VALUES = ['3', '4', '6'] as const
export type LogosGridSize = (typeof LOGOS_GRID_SIZE_VALUES)[number]
export const LOGOS_GRID_SIZE_LABELS: Record<LogosGridSize, string> = { '3': '3 logos', '4': '4 logos', '6': '6 logos' }

export const LOGOS_CELL_ORDER_VALUES = ['textoPrimero', 'logosPrimero'] as const
export type LogosCellOrder = (typeof LOGOS_CELL_ORDER_VALUES)[number]
export const LOGOS_CELL_ORDER_LABELS: Record<LogosCellOrder, string> = {
  textoPrimero: 'Texto primero',
  logosPrimero: 'Logos primero',
}

/** URL de fábrica — IDÉNTICA en los 3 archivos maestro y en las 6 celdas
 *  posibles (verificado, ninguna grilla trae una URL de ejemplo distinta por
 *  logo). */
const LOGO_DEFAULT_URL = 'https://lh3.googleusercontent.com/d/1B4hOqqkpKSu2cQHale6dE-hfLX6yfO7O'

/**
 * "Viene por defecto con la etiqueta `<a>` de cada logo activa, si se
 * desactiva se quita la etiqueta `<a>`" (comentario literal del maestro) —
 * pero acá el default de la APP es `linkEnabled: false` igual que el resto de
 * la app ("por defecto vienen desactivados", `_contenidos_wrapper.html`):
 * el maestro describe el estado de FÁBRICA del archivo (el `<a>` viene
 * puesto), no una preferencia de producto — mismo criterio que
 * `resolveModuleLink`/`generalModuleFieldsSchema.linkEnabled` en TODO el
 * resto de la app, que también arrancan `false` pese a que sus maestros
 * también traen el `<a>` puesto de fábrica.
 */
export const logoFieldsSchema = z.object({
  imageUrl: z.string().default(LOGO_DEFAULT_URL),
  linkEnabled: z.boolean().default(false),
  link: z.string().default(''),
})
export type LogoFields = z.infer<typeof logoFieldsSchema>

const defaultLogo: LogoFields = logoFieldsSchema.parse({})

export const logosFieldsSchema = generalModuleFieldsSchema.extend({
  gridSize: z.enum(LOGOS_GRID_SIZE_VALUES).default('3'),
  cellOrder: z.enum(LOGOS_CELL_ORDER_VALUES).default('textoPrimero'),
  /** El maestro trae `border-radius: 7px` fijo en LAS 6 celdas posibles de
   *  los 3 archivos — mismo criterio que Beneficios/COL2 (un default que ya
   *  muestra el archivo se expone como toggle default `true`, no `false`
   *  como IMG_AUTOMATICA_/COL1/COL3). Uno solo para TODOS los logos a la vez
   *  (el maestro no distingue por logo), mismo criterio que `size` de
   *  FRANJA_LOGOS ("todos al tiempo"). */
  logosBorderRadiusEnabled: z.boolean().default(true),
  logos: z
    .tuple([logoFieldsSchema, logoFieldsSchema, logoFieldsSchema, logoFieldsSchema, logoFieldsSchema, logoFieldsSchema])
    .default([defaultLogo, defaultLogo, defaultLogo, defaultLogo, defaultLogo, defaultLogo]),
  items: z.array(moduleItemSchema).default([]),
})
export type LogosFields = z.infer<typeof logosFieldsSchema>

/** Genera los 3 items de fábrica — mismo trío que TITLE/COL2 (el maestro trae
 *  el MISMO literal h2+separador+h3 que modulo-titulo.html). */
function logosDefaultItems(ids: [string, string, string]): ModuleItem[] {
  return [
    { id: ids[0], areaKey: LOGOS_MAIN_AREA, type: 'TITULO_TEXTO', fields: defaultTituloTextoFields },
    { id: ids[1], areaKey: LOGOS_MAIN_AREA, type: 'SEPARADOR_LINEA', fields: defaultSeparadorLineaFields },
    { id: ids[2], areaKey: LOGOS_MAIN_AREA, type: 'SUBTITULO_TEXTO', fields: defaultSubtituloTextoFields },
  ]
}

/** Valor de referencia estático — ids fijos, mismo motivo que defaultTitleFields/defaultCol2Fields. */
export const defaultLogosFields: LogosFields = logosFieldsSchema.parse({
  items: logosDefaultItems(['logos-item-titulo-default', 'logos-item-separador-default', 'logos-item-subtitulo-default']),
})

/** Usado por `insertContentBlock` para CADA instancia nueva. */
export function createDefaultLogosFields(): LogosFields {
  return logosFieldsSchema.parse({
    items: logosDefaultItems([newId(), newId(), newId()]),
  })
}

/** Usado por `duplicateContentBlock`: preserva los valores del usuario pero
 *  regenera el id de cada item — mismo motivo que cloneCol2Fields. */
export function cloneLogosFields(fields: LogosFields): LogosFields {
  return { ...fields, items: fields.items.map((item) => ({ ...item, id: newId() })) }
}
