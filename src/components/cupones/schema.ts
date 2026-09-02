// ============================================================================
// Campos del bloque CUPONES — fase 8 (última) del plan de nuevos módulos de
// contenido (ver [[project_body_modules_plan_2026-08-26]]).
//
// El maestro (02-components/04_content-modules/coupons/cupones-modulo.html)
// arma los cupones SIEMPRE de a dos, en una sola `<table role="module">` con
// 2 celdas "cupón" (`role="cupon"`) + una fila de legales compartida — a
// diferencia de DEALS ("se eliminan los elementos no la celda" para una
// tarjeta impar), acá el comentario del maestro dice simplemente "siempre
// debe haber 2": no hay caso de celda vacía, `cells` es una tupla fija de 2.
//
// Cada celda puede ser tipo 'cupon' (el default del archivo — imagen + área
// libre de moléculas) o 'titulo' (celda_cupon_titulo.html, un `<td>`
// alternativo swap-in: "SE PUEDE CAMBIAR POR UNA CELDA DE TITULO") — unión
// discriminada por `type`, mismo criterio que ContentBlock en model.ts.
// Cambiar el selector de tipo en el panel REEMPLAZA los campos de la celda
// por un default fresco del nuevo tipo (misma convención "sin magia por
// campo" que el resto de la app) — ver createDefaultCuponCellFields/
// createDefaultTituloCellFields.
//
// El maestro dice, dos veces, "el fondo NO se puede desactivar" / "el
// alineado NO se puede cambiar" — por eso `cuponesFieldsSchema` NO spreadea
// generalModuleFieldsSchema (ni backgroundEnabled ni align existen acá): el
// render llama moduleBackgroundVars(tema, true) y substituteModuleAlignVars(
// html, 'left') HARDCODEADOS, mismo criterio que el fondo per-celda de COL3
// (risk #1 del plan padre).
//
// `items` es UN SOLO array plano a nivel de módulo (no anidado dentro de cada
// celda) — mismo mecanismo exacto que COL1/COL3: cada item lleva su propio
// `areaKey` ('cell1'|'cell2'), y el motor compartido (store.ts vía
// findModuleBlockByItem, que asume `fields.items` en la RAÍZ del bloque) ya
// sabe filtrar por área sin cambios. Simplificación aceptada (confirmada con
// el usuario): el catálogo "+ Agregar molécula" de InspectorPanel.tsx se
// muestra para las 2 áreas SIEMPRE, incluso cuando esa celda está tipeada
// 'titulo' (que no tiene área libre en el maestro) — insertar ahí no se ve
// hasta que la celda vuelva a tipo 'cupon'. Evita agregar un caso especial
// para CUPONES en el componente compartido.
// ============================================================================
import { z } from 'zod'
import { newId } from '../../ids'
import { moduleItemSchema, type ModuleItem } from '../../moduleItems/schemas'
import { defaultSeparadorFields, defaultTextoPastillaFields } from '../banner/items/schemas'
import { defaultCuponMontoFields } from '../../moduleItems/schemas'

/** Las 2 áreas libres del módulo — una por celda, mismo criterio que
 *  COL3_CELL_AREAS (fijas: el maestro nunca agrega/quita celdas, siempre son 2). */
export const CUPONES_CELL_1 = 'cell1'
export const CUPONES_CELL_2 = 'cell2'
export const CUPONES_CELL_AREAS = [CUPONES_CELL_1, CUPONES_CELL_2] as const

/** Ambas celdas "cupón" del maestro comparten la MISMA URL de imagen de
 *  fábrica (a diferencia de COL3, cuyas 3 celdas traen 3 distintas) — una
 *  sola constante alcanza. */
export const CUPON_CELL_IMAGE_URL = 'https://lh3.googleusercontent.com/d/17zBTLASXQzFtt9NtEP3h0qudKBhcZRMA'
/** Ícono del tag de la celda "título" (celda_cupon_titulo.html) — misma URL
 *  que usa el mini-bullet de la celda "cupón" en el otro archivo, coincidencia
 *  real del maestro, no una constante compartida a propósito. */
export const TITULO_CELL_TAG_ICON_URL = 'https://lh3.googleusercontent.com/d/1wZxPSRbT-maSuZWDyZz99Ewi2A2RH37-'

/**
 * Celda "cupón": imagen (no removible en el maestro — comentario: solo la
 * imagen SIGUIENTE, la de puntos decorativos, "no se puede quitar"; esta SÍ
 * es un campo real de URL, así que sigue el criterio global de blanco =
 * elimina el `<img>`) + border-radius toggle (el maestro no trae ninguno,
 * mismo precedente 2026-08-26 que COL3/BENEFICIOS) + link/legal per-celda.
 */
export const cuponCellFieldsSchema = z.object({
  type: z.literal('cupon').default('cupon'),
  imageUrl: z.string().default(CUPON_CELL_IMAGE_URL),
  borderRadiusEnabled: z.boolean().default(false),
  linkEnabled: z.boolean().default(false),
  link: z.string().default(''),
  legalEnabled: z.boolean().default(false),
  legalText: z.string().default('Aplican términos y condiciones |'),
})
export type CuponCellFields = z.infer<typeof cuponCellFieldsSchema>

/**
 * Celda "título": SIN área libre (el maestro solo dice "se puede cambiar el
 * orden de las moléculas..." para la celda "cupón", nunca para esta) — un
 * ícono de tag (blanco = se quita el `<div>` del tag ENTERO, no solo el
 * `<img>`: no hay texto que lo acompañe, mismo criterio "sin ícono no hay
 * pill" que TAG1/TAG2 de deals) + un texto (h1, plano, NO RichText, NO
 * removible — el maestro solo dice que el texto "se puede cambiar", no que
 * pueda quedar vacío, a diferencia de copy1/copy2 de deals).
 */
export const tituloCellFieldsSchema = z.object({
  type: z.literal('titulo').default('titulo'),
  tagIconUrl: z.string().default(TITULO_CELL_TAG_ICON_URL),
  titleText: z.string().default('Aca un titulo'),
  linkEnabled: z.boolean().default(false),
  link: z.string().default(''),
  legalEnabled: z.boolean().default(false),
  legalText: z.string().default('Aplican términos y condiciones |'),
})
export type TituloCellFields = z.infer<typeof tituloCellFieldsSchema>

export const cuponesCellFieldsSchema = z.discriminatedUnion('type', [cuponCellFieldsSchema, tituloCellFieldsSchema])
export type CuponesCellFields = z.infer<typeof cuponesCellFieldsSchema>

function defaultCuponesCells(): [CuponesCellFields, CuponesCellFields] {
  return [cuponCellFieldsSchema.parse({}), cuponCellFieldsSchema.parse({})]
}

export const cuponesFieldsSchema = z.object({
  // `.default(defaultCuponesCells())`, no un `{}` genérico — mismo motivo que
  // COL3: cada celda necesita SU PROPIO default completo (aunque acá las 2
  // sean idénticas, a diferencia de COL3).
  cells: z.tuple([cuponesCellFieldsSchema, cuponesCellFieldsSchema]).default(defaultCuponesCells()),
  items: z.array(moduleItemSchema).default([]),
})
export type CuponesFields = z.infer<typeof cuponesFieldsSchema>

/**
 * Genera los 8 items de fábrica (4 por celda: texto+pastilla → texto
 * destacado → separador → mini-bullet, en ese orden — reproduce literal lo
 * que el maestro trae inline en cada celda "cupón", mismo criterio que
 * col3DefaultItems/beneficiosDefaultItems) con ids FRESCOS.
 *
 * `TEXTO_PASTILLA` reusa la molécula ya registrada (fase 1) pero con sus
 * textos/posición ajustados a lo que el maestro trae acá ("Solo en" en la
 * pastilla, a la IZQUIERDA; "Restaurantes" como texto plano) — su propio
 * default genérico (`defaultTextoPastillaFields`) trae otro contenido
 * (Supermercados/Martes), así que se sobreescribe explícito.
 */
function cuponesDefaultItems(ids: [string, string, string, string, string, string, string, string]): ModuleItem[] {
  return CUPONES_CELL_AREAS.flatMap((areaKey, cellIndex): ModuleItem[] => {
    const [pastillaId, montoId, separadorId, bulletId] = ids.slice(cellIndex * 4, cellIndex * 4 + 4)
    return [
      {
        id: pastillaId,
        areaKey,
        type: 'TEXTO_PASTILLA',
        fields: { ...defaultTextoPastillaFields, text: 'Restaurantes', pillText: 'Solo en', pillPosition: 'izquierda' },
      },
      { id: montoId, areaKey, type: 'CUPON_MONTO', fields: defaultCuponMontoFields },
      { id: separadorId, areaKey, type: 'SEPARADOR', fields: { ...defaultSeparadorFields, size: 'S' } },
      { id: bulletId, areaKey, type: 'BULLET_ICONO_SIMPLE', fields: { imageUrl: TITULO_CELL_TAG_ICON_URL, text: 'Cupón xxxxxxxxxxx' } },
    ]
  })
}

/**
 * Valor de referencia estático (el `defaultFields` que pide ContentBlockDef)
 * — ids fijos, NO lo que usa la inserción real (ver createDefaultCuponesFields
 * más abajo, mismo motivo que defaultCol3Fields/defaultDealsFields: 2
 * instancias de CUPONES no pueden compartir ids de item).
 */
export const defaultCuponesFields: CuponesFields = cuponesFieldsSchema.parse({
  cells: defaultCuponesCells(),
  items: cuponesDefaultItems([
    'cupones-item-c1-pastilla-default',
    'cupones-item-c1-monto-default',
    'cupones-item-c1-separador-default',
    'cupones-item-c1-bullet-default',
    'cupones-item-c2-pastilla-default',
    'cupones-item-c2-monto-default',
    'cupones-item-c2-separador-default',
    'cupones-item-c2-bullet-default',
  ]),
})

/** Usado por `insertContentBlock` para CADA instancia nueva. */
export function createDefaultCuponesFields(): CuponesFields {
  return cuponesFieldsSchema.parse({
    cells: defaultCuponesCells(),
    items: cuponesDefaultItems([newId(), newId(), newId(), newId(), newId(), newId(), newId(), newId()]),
  })
}

/** Usado por `duplicateContentBlock`: preserva los valores del usuario pero
 *  regenera el id de cada item — mismo motivo que cloneCol3Fields. */
export function cloneCuponesFields(fields: CuponesFields): CuponesFields {
  return { ...fields, items: fields.items.map((item) => ({ ...item, id: newId() })) }
}

/** Usado por el selector de tipo del panel: cambiar una celda a 'cupon'
 *  reemplaza sus campos por un default fresco (no preserva nada de la celda
 *  'titulo' anterior — misma convención "sin magia por campo" del resto de la
 *  app). Los items existentes de esa área NO se tocan acá (siguen en
 *  `fields.items`, listos para reaparecer si la celda vuelve a 'cupon'). */
export function createDefaultCuponCellFields(): CuponCellFields {
  return cuponCellFieldsSchema.parse({})
}

/** Mismo criterio, para el sentido contrario del selector. */
export function createDefaultTituloCellFields(): TituloCellFields {
  return tituloCellFieldsSchema.parse({})
}
