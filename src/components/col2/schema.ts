// ============================================================================
// Campos del bloque COL2 ("2 columnas") — fase 6 del plan de nuevos módulos
// de contenido (ver [[project_body_modules_plan_2026-08-26]]).
//
// A diferencia de COL3 (fondo/click POR CELDA, sin hasGeneralModuleFields),
// acá TODO lo general vuelve a ser una única variable de módulo — verificado
// leyendo el archivo completo: `bg_contenedor1_mail_general`/
// `LINKMODULOCOULUMNAS`/los 2 tokens de alineado aparecen UNA sola vez cada
// uno (el `<a>`/`<div>` de fondo envuelve las 2 tablas enteras, no hay
// "celda por celda" para nada de esto) — spreadea generalModuleFieldsSchema
// completo, `hasGeneralModuleFields: true`.
//
// Lo genuinamente nuevo de este módulo: es el PRIMER módulo "dual-table"
// (desktop + mobile, réplica byte-a-byte de cada pieza variable) — ver la
// nota grande de render.ts sobre cómo se resuelve sin duplicar lógica.
// ============================================================================
import { z } from 'zod'
import { newId } from '../../ids'
import { generalModuleFieldsSchema } from '../contentModules/generalFields'
import { moduleItemSchema, type ModuleItem } from '../../moduleItems/schemas'
import { defaultSeparadorLineaFields, defaultSubtituloTextoFields, defaultTituloTextoFields } from '../../moduleItems/schemas'

/** Única área libre del módulo (la celda de texto) — mismo criterio que TITLE_MAIN_AREA. */
export const COL2_MAIN_AREA = 'main'

export const COL2_IMAGE_MODE_VALUES = ['modificable', 'full'] as const
export type Col2ImageMode = (typeof COL2_IMAGE_MODE_VALUES)[number]
export const COL2_IMAGE_MODE_LABELS: Record<Col2ImageMode, string> = {
  modificable: 'Ancho modificable (con padding)',
  full: 'Ancho completo (sin padding)',
}

export const COL2_CELL_ORDER_VALUES = ['textoPrimero', 'imagenPrimero'] as const
export type Col2CellOrder = (typeof COL2_CELL_ORDER_VALUES)[number]
export const COL2_CELL_ORDER_LABELS: Record<Col2CellOrder, string> = {
  textoPrimero: 'Texto primero',
  imagenPrimero: 'Imagen primero',
}

/**
 * `imageUrl` es UN solo campo compartido por los 2 markups alternativos del
 * maestro (mismo criterio que `logoShape` de deals — ver
 * [[project_deal_logo_shape_2026-08-25]]): cada modo tiene su propia URL de
 * ejemplo en el archivo, pero solo UNO de los 2 sobrevive el render (el otro
 * se elimina entero), así que un solo campo alcanza. El default reproduce la
 * URL de fábrica del modo POR DEFECTO ('modificable', el maestro dice
 * literal "DEBE VENIR POR DEFECTO CON LA IMAGEN CON ANCHO MODIFICABLE" —sic,
 * el archivo real tiene un typo, "CO ANCHO", no "CON ANCHO").
 *
 * `borderRadiusEnabled` arranca en `true`: el maestro trae `border-radius: 12px`
 * fijo en AMBOS modos (mismo criterio que Beneficios' imagen — un default que
 * reproduce lo que el archivo ya muestra, no el de IMG_AUTOMATICA_/COL1/COL3,
 * que arrancan en `false` porque su maestro no trae radio de fábrica).
 *
 * `widthPercent`: el ancho (en %) del modo "ancho modificable" — sourced de
 * `{{body_img_modulo_auto_ancho}}`, una variable EJEMPLO fuera de las 11 ramas
 * de tema (mismo caso que body_alineado_molecular/alineado_molecular_mail_body,
 * ver generalRender.ts) — así que se sustituye por STRING PLANO en render.ts,
 * no vía el mapa de temas. Campo de texto libre (no número): mismo criterio
 * "sin magia" que el resto de los campos de esta app — el maestro trae '90'
 * como valor de ejemplo, se reproduce tal cual.
 */
export const col2ImageFieldsSchema = z.object({
  imageUrl: z.string().default('https://lh3.googleusercontent.com/d/14VKG5CPVNPIVbOQYkyHgtxfW1uLorjXP'),
  mode: z.enum(COL2_IMAGE_MODE_VALUES).default('modificable'),
  widthPercent: z.string().default('90'),
  borderRadiusEnabled: z.boolean().default(true),
})
export type Col2ImageFields = z.infer<typeof col2ImageFieldsSchema>

export const col2FieldsSchema = generalModuleFieldsSchema.extend({
  image: col2ImageFieldsSchema.default({}),
  /**
   * "Se puede quitar el fondo de la imagen de forma independiente" (comentario
   * literal del maestro) — un SEGUNDO toggle de fondo, distinto del general
   * (`backgroundEnabled`, heredado de generalModuleFieldsSchema). A diferencia
   * de `bg_contenedor1_mail_general`/`body_container_background_radius`
   * (que SÍ traen la variante "sin fondo" vía el mecanismo Sinfondo, ver
   * MODULE_BACKGROUND_VAR_NAMES), `img_overlay_2_mail_general` NO tiene una
   * variante "sin fondo" en el maestro (un solo `{% assign %}` por rama,
   * verificado línea por línea) — por eso este toggle no pasa por
   * moduleBackgroundVars: "apagado" acá es simplemente NO pintar la propiedad
   * `background-image` en absoluto (ver render.ts). Arranca en `true`: el
   * maestro trae el fondo puesto de fábrica en las 2 tablas.
   */
  imageBackgroundEnabled: z.boolean().default(true),
  cellOrder: z.enum(COL2_CELL_ORDER_VALUES).default('textoPrimero'),
  items: z.array(moduleItemSchema).default([]),
})
export type Col2Fields = z.infer<typeof col2FieldsSchema>

/** Genera los 3 items de fábrica con ids FRESCOS — el maestro trae, literal,
 *  la MISMA plantilla h2+separador+h3 que modulo-titulo.html (ver la nota
 *  grande de render.ts), así que el default reproduce el mismo trío de items
 *  que TITLE — mismo criterio que titleDefaultItems en components/title/schema.ts. */
function col2DefaultItems(ids: [string, string, string]): ModuleItem[] {
  return [
    { id: ids[0], areaKey: COL2_MAIN_AREA, type: 'TITULO_TEXTO', fields: defaultTituloTextoFields },
    { id: ids[1], areaKey: COL2_MAIN_AREA, type: 'SEPARADOR_LINEA', fields: defaultSeparadorLineaFields },
    { id: ids[2], areaKey: COL2_MAIN_AREA, type: 'SUBTITULO_TEXTO', fields: defaultSubtituloTextoFields },
  ]
}

/** Valor de referencia estático — ids fijos, NO lo que usa la inserción real
 *  (ver createDefaultCol2Fields), mismo motivo que defaultTitleFields. */
export const defaultCol2Fields: Col2Fields = col2FieldsSchema.parse({
  items: col2DefaultItems(['col2-item-titulo-default', 'col2-item-separador-default', 'col2-item-subtitulo-default']),
})

/** Usado por `insertContentBlock` para CADA instancia nueva. */
export function createDefaultCol2Fields(): Col2Fields {
  return col2FieldsSchema.parse({ items: col2DefaultItems([newId(), newId(), newId()]) })
}

/** Usado por `duplicateContentBlock`: preserva los valores del usuario pero
 *  regenera el id de cada item — mismo motivo que cloneTitleFields. */
export function cloneCol2Fields(fields: Col2Fields): Col2Fields {
  return { ...fields, items: fields.items.map((item) => ({ ...item, id: newId() })) }
}
