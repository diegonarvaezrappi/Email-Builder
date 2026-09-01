// ============================================================================
// Campos del bloque COL3 ("3 columnas") — fase 5 del plan de nuevos módulos de
// contenido (ver [[project_body_modules_plan_2026-08-26]]).
//
// A diferencia de TODO módulo anterior (una sola instancia de fondo/alineado/
// link a nivel de módulo), el maestro (modulo-3-columnas.html) dice literal:
// "se puede quitar el fondo... celda por celda, no se quita el fondo de las 3
// celdas al tiempo" — el fondo es PER-CELL, no un solo toggle de módulo. El
// click también es per-cell (cada `<a href="LINKCELDA{n}">` envuelve UNA
// celda, no las 3). Por eso este módulo NO spreadea generalModuleFieldsSchema
// entero (a diferencia de TITLE/BULLET/BENEFICIOS/COL1): solo `align` es una
// única variable de MÓDULO (el maestro no dice "celda por celda" para el
// alineado, y los 2 tokens Liquid de alineado son los mismos en las 3 celdas
// de todos modos — no hay forma de que difieran por celda con una sola pasada
// de substituteModuleAlignVars). `linkEnabled`/`link`/`backgroundEnabled`
// viven DENTRO de cada celda de `cells` en cambio.
//
// `items` sigue siendo UN SOLO array plano a nivel de módulo (no anidado
// dentro de cada celda) — mismo mecanismo exacto que COL1's 'above'/'below':
// cada item lleva su propio `areaKey` ('cell1'|'cell2'|'cell3'), y el motor
// compartido (store.ts/blocks.ts/InspectorPanel.tsx) ya sabe filtrar por área
// sin cambios — un tercer valor de areaKey es tan válido como un segundo.
// ============================================================================
import { z } from 'zod'
import { newId } from '../../ids'
import { MODULE_ALIGN_VALUES } from '../contentModules/generalFields'
import { moduleItemSchema, type ModuleItem } from '../../moduleItems/schemas'
import { defaultSeparadorFields } from '../banner/items/schemas'

/** Las 3 áreas libres del módulo — una por celda, fijas (el maestro no ofrece
 *  agregar/quitar celdas, siempre son exactamente 3). */
export const COL3_CELL_1 = 'cell1'
export const COL3_CELL_2 = 'cell2'
export const COL3_CELL_3 = 'cell3'
export const COL3_CELL_AREAS = [COL3_CELL_1, COL3_CELL_2, COL3_CELL_3] as const

/** La URL de fábrica del ícono M — IDÉNTICA en las 3 celdas del maestro (y,
 *  coincidencia real, la misma URL que BENEFICIOS_DEFAULT_ICON_URL en
 *  components/benefits/schema.ts — 2 archivos maestro distintos que comparten
 *  la misma imagen de ejemplo). Se declara acá aparte (no se importa de
 *  benefits/schema.ts) para no acoplar 2 módulos que no tienen otra relación. */
const COL3_DEFAULT_ICON_URL = 'https://lh3.googleusercontent.com/d/13Wpazp2ezX37GZylmssneVLoF0fxq2yi'

/** Las 3 URLs de fábrica de la imagen "full" de cada celda — DISTINTAS entre
 *  sí en el maestro (a diferencia del ícono de arriba), así que van una por
 *  celda, no una constante compartida. */
const COL3_CELL_IMAGE_URLS: [string, string, string] = [
  'https://lh3.googleusercontent.com/d/1GvgYi4hdEYq1b71GrXp-UVfidhkEVeE1?v1',
  'https://lh3.googleusercontent.com/d/1c5vhJ8Hvr-weWRB5n3xKICSbou2mrcxd?v1',
  'https://lh3.googleusercontent.com/d/1Ff8AXjzhjsXyBrUwk4S4A02gjOpAg3a0?v1',
]

/** Imagen "full" de una celda — opcional (URL en blanco elimina el `<img>`
 *  entero, mismo criterio que COL1/IMG_AUTOMATICA_*) + border-radius toggle
 *  (el maestro no trae ninguno de fábrica, mismo criterio 2026-08-26). */
export const col3ImageFieldsSchema = z.object({
  imageUrl: z.string().default(''),
  borderRadiusEnabled: z.boolean().default(false),
})
export type Col3ImageFields = z.infer<typeof col3ImageFieldsSchema>

/**
 * Una celda: su propia imagen + los 3 toggles que el maestro escala "celda
 * por celda" (fondo, click) — `align` queda AFUERA a propósito, es la única
 * variable de módulo (ver la nota grande de arriba).
 */
export const col3CellFieldsSchema = z.object({
  image: col3ImageFieldsSchema.default({}),
  linkEnabled: z.boolean().default(false),
  link: z.string().default(''),
  backgroundEnabled: z.boolean().default(false),
})
export type Col3CellFields = z.infer<typeof col3CellFieldsSchema>

function defaultCol3Cells(): [Col3CellFields, Col3CellFields, Col3CellFields] {
  return COL3_CELL_IMAGE_URLS.map((imageUrl) => col3CellFieldsSchema.parse({ image: { imageUrl } })) as [
    Col3CellFields,
    Col3CellFields,
    Col3CellFields,
  ]
}

export const col3FieldsSchema = z.object({
  align: z.enum(MODULE_ALIGN_VALUES).default('left'),
  // `.default(defaultCol3Cells())`, no un `{}` genérico: a diferencia de
  // COL1 (una sola imagen), acá cada una de las 3 celdas necesita SU PROPIA
  // URL de imagen de fábrica (distintas entre sí en el maestro) — un default
  // vacío reproduciría 3 imágenes idénticas que no coinciden con el archivo.
  cells: z.tuple([col3CellFieldsSchema, col3CellFieldsSchema, col3CellFieldsSchema]).default(defaultCol3Cells()),
  items: z.array(moduleItemSchema).default([]),
})
export type Col3Fields = z.infer<typeof col3FieldsSchema>

/**
 * Genera los 9 items de fábrica (3 por celda: ícono + separador + texto
 * corto, en ese orden — reproduce literal lo que el maestro ya trae inline en
 * cada celda, mismo criterio que beneficiosDefaultItems) con ids FRESCOS —
 * usado tanto por createDefaultCol3Fields (inserción real) como, con ids
 * fijos, por defaultCol3Fields (valor de referencia estático).
 */
function col3DefaultItems(ids: [string, string, string, string, string, string, string, string, string]): ModuleItem[] {
  return COL3_CELL_AREAS.flatMap((areaKey, cellIndex): ModuleItem[] => {
    const [iconoId, separadorId, textoId] = ids.slice(cellIndex * 3, cellIndex * 3 + 3)
    return [
      { id: iconoId, areaKey, type: 'ICONO', fields: { imageUrl: COL3_DEFAULT_ICON_URL, size: 'M', borderRadiusEnabled: false } },
      { id: separadorId, areaKey, type: 'SEPARADOR', fields: { ...defaultSeparadorFields, size: 'S' } },
      { id: textoId, areaKey, type: 'COLUMNA_TEXTO', fields: { text: 'Texto corto' } },
    ]
  })
}

/**
 * Valor de referencia estático (el `defaultFields` que pide ContentBlockDef)
 * — ids fijos, NO lo que usa la inserción real (ver createDefaultCol3Fields,
 * mismo motivo que defaultTitleFields/defaultBeneficiosFields: 2 instancias de
 * COL3 no pueden compartir ids de item).
 */
export const defaultCol3Fields: Col3Fields = col3FieldsSchema.parse({
  cells: defaultCol3Cells(),
  items: col3DefaultItems([
    'col3-item-c1-icono-default',
    'col3-item-c1-separador-default',
    'col3-item-c1-texto-default',
    'col3-item-c2-icono-default',
    'col3-item-c2-separador-default',
    'col3-item-c2-texto-default',
    'col3-item-c3-icono-default',
    'col3-item-c3-separador-default',
    'col3-item-c3-texto-default',
  ]),
})

/** Usado por `insertContentBlock` para CADA instancia nueva. */
export function createDefaultCol3Fields(): Col3Fields {
  return col3FieldsSchema.parse({
    cells: defaultCol3Cells(),
    items: col3DefaultItems([newId(), newId(), newId(), newId(), newId(), newId(), newId(), newId(), newId()]),
  })
}

/** Usado por `duplicateContentBlock`: preserva los valores del usuario pero
 *  regenera el id de cada item — mismo motivo que cloneBeneficiosFields. */
export function cloneCol3Fields(fields: Col3Fields): Col3Fields {
  return { ...fields, items: fields.items.map((item) => ({ ...item, id: newId() })) }
}
