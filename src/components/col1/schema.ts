// ============================================================================
// Campos del bloque COL1 ("1 columna") — fase 4 del plan de nuevos módulos de
// contenido (ver [[project_body_modules_plan_2026-08-26]]).
//
// A diferencia de TITLE/BULLET (una sola área libre) y BENEFICIOS (1 área
// libre + 1 celda de imagen FIJA), acá el maestro (modulo-1columna.html) trae
// DOS áreas libres independientes alrededor de una imagen opcional también
// removible — "arriba" (`COL1_AREA_ABOVE`, la que el maestro ya trae de
// fábrica, con un `role="divcomponentes"` literal) y "abajo"
// (`COL1_AREA_BELOW`, que el maestro documenta como "se repite una
// role='divcomponentes'" SI hay contenido ahí, no un segundo bloque que ya
// venga en el archivo). Primer consumidor real de más de un `areaKey` en el
// motor de área libre — moduleItemSchema ya lo anticipaba (ver su comentario:
// "un futuro módulo con más de un área libre — ej. 1 columna, arriba/abajo de
// la imagen").
//
// A diferencia de TODO otro módulo nuevo hasta ahora, el maestro de ESTE
// módulo NO trae los tokens `{{body_alineado_molecular}}`/
// `{{alineado_molecular_mail_body}}` en ningún lado (verificado leyendo el
// archivo completo) — por eso `align` queda en el schema (se sigue
// spreadeando generalModuleFieldsSchema completo, mismo tipo que el resto)
// pero el toggle se OCULTA en el panel (`hidden={{ align: true }}`, ver
// PropertiesPanel.tsx) y render.ts NUNCA llama a substituteModuleAlignVars —
// no hay nada real que sustituir, mostrar el control sería un toggle que no
// hace nada visible.
// ============================================================================
import { z } from 'zod'
import { newId } from '../../ids'
import { generalModuleFieldsSchema } from '../contentModules/generalFields'
import { moduleItemSchema, type ModuleItem } from '../../moduleItems/schemas'

/** Las 2 áreas libres del módulo — arriba y abajo de la imagen. */
export const COL1_AREA_ABOVE = 'above'
export const COL1_AREA_BELOW = 'below'

/** La URL de fábrica del maestro para la imagen (`role="imagen-auto"` en
 *  modulo-1columna.html) — mismo criterio "el default del campo reproduce el
 *  default del maestro" que el resto de la app. El maestro trae
 *  `border-radius: 0px 0px 0px 0px` (4 valores, equivalente a 0px) → OFF por
 *  defecto, mismo criterio que IMG_AUTOMATICA_MODULO/MOLECULA (no el de
 *  Beneficios, que arranca en 8px). */
export const col1ImageFieldsSchema = z.object({
  imageUrl: z.string().default('https://lh3.googleusercontent.com/d/1OEXxNDtUklgU4W8sta2zOzdZ4rZYq7PO'),
  borderRadiusEnabled: z.boolean().default(false),
})
export type Col1ImageFields = z.infer<typeof col1ImageFieldsSchema>
export const defaultCol1ImageFields: Col1ImageFields = col1ImageFieldsSchema.parse({})

export const col1FieldsSchema = generalModuleFieldsSchema.extend({
  image: col1ImageFieldsSchema.default({}),
  items: z.array(moduleItemSchema).default([]),
})
export type Col1Fields = z.infer<typeof col1FieldsSchema>

/**
 * Sin items de fábrica en ninguna de las 2 áreas — el maestro no documenta
 * ningún contenido de ejemplo dentro de `divcomponentes` (a diferencia de
 * Título/Beneficios, que sí traen h2/h3 o ícono+2-textos hardcodeados): la
 * única pieza de fábrica real es la imagen. Reproducir eso fielmente es NO
 * inventar contenido de texto que el maestro nunca mostró.
 */
export const defaultCol1Fields: Col1Fields = col1FieldsSchema.parse({})

/** Usado por `insertContentBlock` para CADA instancia nueva — sin items, no
 *  hace falta generar ids frescos de antemano (a diferencia de Título/
 *  Beneficios/Bullet, que sí traen items de fábrica). Existe igual por
 *  consistencia con el resto de `ContentBlockDef.createDefaultFields` y por si
 *  un futuro cambio le agrega contenido de fábrica. */
export function createDefaultCol1Fields(): Col1Fields {
  return col1FieldsSchema.parse({})
}

/** Usado por `duplicateContentBlock`: preserva los valores del usuario pero
 *  regenera el id de cada item de CUALQUIER área — mismo motivo que
 *  cloneTitleFields/cloneBeneficiosFields (un id de item debe ser único en
 *  todo el documento). */
export function cloneCol1Fields(fields: Col1Fields): Col1Fields {
  return { ...fields, items: fields.items.map((item: ModuleItem) => ({ ...item, id: newId() })) }
}
