// ============================================================================
// Campos del bloque BENEFICIOS — fase 3 del plan de nuevos módulos de
// contenido (ver [[project_body_modules_plan_2026-08-26]]). A diferencia de
// TITLE/BULLET (una sola área libre que cubre TODO el módulo), acá el maestro
// (modulo-beneficios.html) trae una estructura de 2 celdas fija: celda 1 =
// una imagen FIJA no removible (40% de ancho, solo con toggle de border-radius
// — mismo criterio que IMG_AUTOMATICA_*), celda 2 = el área libre de
// moléculas. `image` vive como su propio campo (no un ModuleItem): no es
// insertable/removible/reordenable como el resto del catálogo, es una pieza
// estructural del módulo mismo — mismo espíritu que el logo de marca del
// header (headerFieldsSchema.logoUrl), no del área libre.
//
// El maestro dice literalmente "por defecto trae una molécula de icono, y dos
// de texto" para la celda 2 — se reproduce como 3 items reales (ICONO +
// BENEFICIOS_TITULO + BENEFICIOS_TEXTO) separados por SEPARADOR(S) entre cada
// uno (el espaciador invisible `<div class="separador-S">` que el maestro pide
// "siempre debe haber... entre una molécula y otra"), NO el bundle
// ícono+2-textos-en-una-tabla de BULLET_ICONO: acá son 3 moléculas
// independientes, reordenables/removibles por separado.
// ============================================================================
import { z } from 'zod'
import { newId } from '../../ids'
import { generalModuleFieldsSchema } from '../contentModules/generalFields'
import { moduleItemSchema, type ModuleItem } from '../../moduleItems/schemas'
import { defaultBeneficiosTextoFields, defaultBeneficiosTituloFields } from '../../moduleItems/schemas'
import { defaultSeparadorFields } from '../banner/items/schemas'

/** Única área libre del módulo (la celda 2) — mismo criterio que TITLE_MAIN_AREA. */
export const BENEFICIOS_MAIN_AREA = 'main'

/** La URL de fábrica del maestro para la imagen de la celda 1 (`role="imagen-auto"`
 *  en modulo-beneficios.html) — el maestro trae `border-radius: 8px` puesto de
 *  fábrica ahí (a diferencia de IMG_AUTOMATICA_MOLECULA/MODULO, que arrancan
 *  SIN radio), así que `borderRadiusEnabled` arranca en `true` acá — mismo
 *  criterio "el default del campo reproduce el default del maestro" que el
 *  resto de la app. */
export const beneficiosImageFieldsSchema = z.object({
  imageUrl: z.string().default('https://lh3.googleusercontent.com/d/1K55fPu7buJT65XOj9VqaplZD2J4WTaTb'),
  borderRadiusEnabled: z.boolean().default(true),
})
export type BeneficiosImageFields = z.infer<typeof beneficiosImageFieldsSchema>
export const defaultBeneficiosImageFields: BeneficiosImageFields = beneficiosImageFieldsSchema.parse({})

/** La URL de fábrica del ícono M de la celda 2 en modulo-beneficios.html — NO
 *  es la misma que ICONO's propio default (molecula_icono.html tiene su
 *  propia URL de ejemplo para M): se reproduce la de ESTE archivo, mismo
 *  criterio que defaultBeneficiosImageFields. */
const BENEFICIOS_DEFAULT_ICON_URL = 'https://lh3.googleusercontent.com/d/13Wpazp2ezX37GZylmssneVLoF0fxq2yi'

export const beneficiosFieldsSchema = generalModuleFieldsSchema.extend({
  image: beneficiosImageFieldsSchema.default({}),
  items: z.array(moduleItemSchema).default([]),
})
export type BeneficiosFields = z.infer<typeof beneficiosFieldsSchema>

/** Genera los 5 items de fábrica con ids FRESCOS (ícono + separador + título +
 *  separador + texto) — usado tanto por createDefaultBeneficiosFields
 *  (inserción real) como, con ids fijos, por defaultBeneficiosFields (valor de
 *  referencia estático). */
function beneficiosDefaultItems(ids: [string, string, string, string, string]): ModuleItem[] {
  return [
    { id: ids[0], areaKey: BENEFICIOS_MAIN_AREA, type: 'ICONO', fields: { imageUrl: BENEFICIOS_DEFAULT_ICON_URL, size: 'M', borderRadiusEnabled: false } },
    { id: ids[1], areaKey: BENEFICIOS_MAIN_AREA, type: 'SEPARADOR', fields: { ...defaultSeparadorFields, size: 'S' } },
    { id: ids[2], areaKey: BENEFICIOS_MAIN_AREA, type: 'BENEFICIOS_TITULO', fields: defaultBeneficiosTituloFields },
    { id: ids[3], areaKey: BENEFICIOS_MAIN_AREA, type: 'SEPARADOR', fields: { ...defaultSeparadorFields, size: 'S' } },
    { id: ids[4], areaKey: BENEFICIOS_MAIN_AREA, type: 'BENEFICIOS_TEXTO', fields: defaultBeneficiosTextoFields },
  ]
}

export const defaultBeneficiosFields: BeneficiosFields = beneficiosFieldsSchema.parse({
  items: beneficiosDefaultItems([
    'beneficios-item-icono-default',
    'beneficios-item-separador1-default',
    'beneficios-item-titulo-default',
    'beneficios-item-separador2-default',
    'beneficios-item-texto-default',
  ]),
})

/** Usado por `insertContentBlock` para CADA instancia nueva. */
export function createDefaultBeneficiosFields(): BeneficiosFields {
  return beneficiosFieldsSchema.parse({ items: beneficiosDefaultItems([newId(), newId(), newId(), newId(), newId()]) })
}

/** Usado por `duplicateContentBlock`: preserva los valores del usuario pero
 *  regenera los ids de cada item — mismo motivo que cloneTitleFields. */
export function cloneBeneficiosFields(fields: BeneficiosFields): BeneficiosFields {
  return { ...fields, items: fields.items.map((item) => ({ ...item, id: newId() })) }
}
