// ============================================================================
// Campos del bloque TITLE — el primer módulo de body de la fase 2 del plan de
// nuevos módulos de contenido (ver [[project_body_modules_plan_2026-08-26]]),
// el consumidor elegido para probar los 2 motores compartidos nuevos
// (generalModuleFieldsSchema y el motor de área libre de moléculas).
//
// A diferencia de DEALS (2 tarjetas de forma FIJA), acá `items` es una lista
// LIBRE (0..N) de cualquier molécula del catálogo compartido — ver
// bodyMoleculeRegistry.ts. El default reproduce LITERAL lo que
// modulo-titulo.html trae de fábrica (h2 + línea separadora + h3) como 3 items
// comunes y corrientes del área 'main', así que "solo título" (sacando los
// otros 2) es un caso real desde el arranque, sin código especial — mismo
// pedido del transcript ("title-only is a real case").
// ============================================================================
import { z } from 'zod'
import { newId } from '../../ids'
import { generalModuleFieldsSchema } from '../contentModules/generalFields'
import { moduleItemSchema, type ModuleItem } from '../../moduleItems/schemas'
import { defaultSeparadorLineaFields, defaultSubtituloTextoFields, defaultTituloTextoFields } from '../../moduleItems/schemas'

/** Única área libre del módulo — un futuro módulo con más de una (ej. 1
 *  columna, arriba/abajo de la imagen) tendría más de un valor acá. */
export const TITLE_MAIN_AREA = 'main'

export const titleFieldsSchema = generalModuleFieldsSchema.extend({
  items: z.array(moduleItemSchema).default([]),
})
export type TitleFields = z.infer<typeof titleFieldsSchema>

/** Genera los 3 items de fábrica con ids FRESCOS — usado tanto por
 *  createDefaultTitleFields (inserción real) como, con ids fijos, por
 *  defaultTitleFields (valor de referencia estático, mismo criterio que
 *  defaultDealsFields en components/deals/schema.ts). */
function titleDefaultItems(ids: [string, string, string]): ModuleItem[] {
  return [
    { id: ids[0], areaKey: TITLE_MAIN_AREA, type: 'TITULO_TEXTO', fields: defaultTituloTextoFields },
    { id: ids[1], areaKey: TITLE_MAIN_AREA, type: 'SEPARADOR_LINEA', fields: defaultSeparadorLineaFields },
    { id: ids[2], areaKey: TITLE_MAIN_AREA, type: 'SUBTITULO_TEXTO', fields: defaultSubtituloTextoFields },
  ]
}

/**
 * Valor de referencia estático (el `defaultFields` que pide ContentBlockDef)
 * — ids fijos, NO lo que usa la inserción real (ver createDefaultTitleFields
 * más abajo, mismo motivo que defaultDealsFields/createDefaultDealsFields:
 * reusar estos 3 ids en cada bloque TITLE nuevo haría que 2 instancias
 * compartieran ids de item, y findModuleBlockByItem asume que un id de item es
 * único en TODO el documento).
 */
export const defaultTitleFields: TitleFields = titleFieldsSchema.parse({
  items: titleDefaultItems(['title-item-titulo-default', 'title-item-separador-default', 'title-item-subtitulo-default']),
})

/** Usado por `insertContentBlock` (vía `ContentBlockDef.createDefaultFields`)
 *  para CADA instancia nueva que se arrastra desde la librería — 3 ids
 *  frescos, así ninguna instancia colisiona con otra ya existente. */
export function createDefaultTitleFields(): TitleFields {
  return titleFieldsSchema.parse({ items: titleDefaultItems([newId(), newId(), newId()]) })
}

/** Usado por `duplicateContentBlock` (vía `ContentBlockDef.cloneFields`):
 *  preserva los valores del usuario pero regenera los ids de cada item —
 *  mismo motivo que cloneDealsFields. */
export function cloneTitleFields(fields: TitleFields): TitleFields {
  return { ...fields, items: fields.items.map((item) => ({ ...item, id: newId() })) }
}
