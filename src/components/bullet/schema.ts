// ============================================================================
// Campos del bloque BULLET — fase 3 del plan de nuevos módulos de contenido
// (ver [[project_body_modules_plan_2026-08-26]]), 2do/3er ContentBlockType
// desde CTA/DEALS/TITLE, y 1ro que valida el motor compartido (fase 2) con un
// shell que NO reusa su propio contenido de fábrica para nada: a diferencia de
// TITLE (cuyo <h2>/<h3> de fábrica SÍ se extraen y registran como items
// propios), el icono+h3+h4 hardcodeados de modulo_bullet.html se descarta
// ENTERO — el área libre por defecto trae en cambio UN item BULLET_ICONO,
// sourced de su propio archivo en content_moleculas/ (ver moduleItems/render.ts).
//
// Igual que TITLE, `items` es una lista LIBRE (0..N) de cualquier molécula del
// catálogo compartido — ver bodyMoleculeRegistry.ts. El maestro dice "se
// pueden agregar más moléculas en la celda derecha" (modulo_bullet.html): acá
// eso se traduce en agregar más BULLET_ICONO/BULLET_NUMERADO (u otra molécula
// cualquiera) al área, cada uno una fila completa (ícono+texto) dentro del
// mismo contenedor de fondo/link — no una lista de textos sueltos como Título.
// ============================================================================
import { z } from 'zod'
import { newId } from '../../ids'
import { generalModuleFieldsSchema } from '../contentModules/generalFields'
import { moduleItemSchema, type ModuleItem } from '../../moduleItems/schemas'
import { defaultBulletIconoFields } from '../../moduleItems/schemas'

/** Única área libre del módulo — mismo criterio que TITLE_MAIN_AREA. */
export const BULLET_MAIN_AREA = 'main'

export const bulletFieldsSchema = generalModuleFieldsSchema.extend({
  items: z.array(moduleItemSchema).default([]),
})
export type BulletFields = z.infer<typeof bulletFieldsSchema>

/** Genera el único item de fábrica con id FRESCO — usado tanto por
 *  createDefaultBulletFields (inserción real) como, con un id fijo, por
 *  defaultBulletFields (valor de referencia estático, mismo criterio que
 *  defaultTitleFields). */
function bulletDefaultItems(id: string): ModuleItem[] {
  return [{ id, areaKey: BULLET_MAIN_AREA, type: 'BULLET_ICONO', fields: defaultBulletIconoFields }]
}

/**
 * Valor de referencia estático — id fijo, NO lo que usa la inserción real
 * (ver createDefaultBulletFields más abajo, mismo motivo que defaultTitleFields:
 * reusar este id en cada bloque BULLET nuevo haría que 2 instancias
 * compartieran id de item).
 */
export const defaultBulletFields: BulletFields = bulletFieldsSchema.parse({
  items: bulletDefaultItems('bullet-item-icono-default'),
})

/** Usado por `insertContentBlock` para CADA instancia nueva que se arrastra
 *  desde la librería — un id fresco, así ninguna instancia colisiona con otra
 *  ya existente. */
export function createDefaultBulletFields(): BulletFields {
  return bulletFieldsSchema.parse({ items: bulletDefaultItems(newId()) })
}

/** Usado por `duplicateContentBlock`: preserva los valores del usuario pero
 *  regenera los ids de cada item — mismo motivo que cloneTitleFields. */
export function cloneBulletFields(fields: BulletFields): BulletFields {
  return { ...fields, items: fields.items.map((item) => ({ ...item, id: newId() })) }
}
