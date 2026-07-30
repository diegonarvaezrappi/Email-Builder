import type { ZodType, ZodTypeDef } from 'zod'
import type { ComponentType } from 'react'
import type { ContentBlock, EmailDocument, SlotName } from './model'
import { contentBlockSchema } from './model'
import { defaultFooterFields, footerSchema, type FooterFields } from './components/footer/schema'
import { renderFooterSnippet } from './components/footer/render'
import { FooterPropertiesPanel } from './components/footer/PropertiesPanel'
import { defaultHeaderFields, headerSchema, type HeaderFields } from './components/header/schema'
import { renderHeaderSnippet } from './components/header/render'
import { HeaderPropertiesPanel } from './components/header/PropertiesPanel'
import { defaultCierreFields, cierreSchema, type CierreFields } from './components/cierre/schema'
import { renderCierreSnippet } from './components/cierre/render'
import { CierrePropertiesPanel } from './components/cierre/PropertiesPanel'
import { renderContenidosSnippet } from './components/contenidos/render'
import { defaultGlobalFields } from './global/schema'
import { z } from 'zod'

/**
 * Definición de un slot registrable. `render` recibe el documento completo
 * (no solo sus propios campos) porque los slots pueden estar acoplados entre
 * sí — ej.: si Footer.tipoFooter = 'RTS', Cierre se elimina por completo (ver
 * Referencias/instrucciones.md línea 426, y components/cierre/render.ts).
 *
 * `schema` se tipa con Input=any a propósito: los schemas de cada slot usan
 * `.default(...)` en varios campos, por lo que su tipo de entrada (antes de
 * aplicar defaults) difiere de TFields (la salida) — ZodType es invariante en
 * ese parámetro, así que fijarlo a TFields rompería la asignación.
 */
export interface SlotDef<TFields> {
  slot: SlotName
  docKey: keyof EmailDocument
  schema: ZodType<TFields, ZodTypeDef, any>
  defaultFields: TFields
  render: (fields: TFields, doc: EmailDocument) => string
  /**
   * Ausente en CONTENIDOS: lo editable vive por-instancia (ver
   * contentBlockRegistry.ts), no hay un panel de "todo el array a la vez".
   * InspectorPanel resuelve CONTENIDOS antes de llegar a este campo.
   */
  PropertiesPanel?: ComponentType<{ value: TFields; onChange: (next: TFields) => void }>
  /**
   * Si es true, el Viewport muestra un botón para eliminar el slot del email
   * y el LibraryPanel permite arrastrarlo de vuelta cuando quedó fuera. El
   * schema de TFields debe incluir un campo `removed: boolean` — ver
   * components/cierre/schema.ts.
   */
  removable?: boolean
}

const footerSlotDef: SlotDef<FooterFields> = {
  slot: 'FOOTER',
  docKey: 'footer',
  schema: footerSchema,
  defaultFields: defaultFooterFields,
  render: (fields, doc) => renderFooterSnippet(fields, doc.global.tema),
  PropertiesPanel: FooterPropertiesPanel,
}

const headerSlotDef: SlotDef<HeaderFields> = {
  slot: 'HEADER',
  docKey: 'header',
  schema: headerSchema,
  defaultFields: defaultHeaderFields,
  render: (fields, doc) => renderHeaderSnippet(fields, doc.global.tema),
  PropertiesPanel: HeaderPropertiesPanel,
}

const cierreSlotDef: SlotDef<CierreFields> = {
  slot: 'CIERRE',
  docKey: 'cierre',
  schema: cierreSchema,
  defaultFields: defaultCierreFields,
  render: (fields, doc) => renderCierreSnippet(fields, doc),
  PropertiesPanel: CierrePropertiesPanel,
  removable: true,
}

const contenidosSlotDef: SlotDef<ContentBlock[]> = {
  slot: 'CONTENIDOS',
  docKey: 'contenidos',
  schema: z.array(contentBlockSchema),
  defaultFields: [],
  render: renderContenidosSnippet,
  // Sin PropertiesPanel: ver la nota de la interfaz SlotDef.
}

/** Label del slot en la librería de componentes (panel izquierdo). */
export const SLOT_LABELS: Record<SlotName, string> = {
  HEADER: 'Header',
  BANNER: 'Banner',
  CONTENIDOS: 'Contenidos',
  CIERRE: 'Cierre',
  FOOTER: 'Footer',
}

/**
 * Mapa de slots registrados — NO una unión discriminada (a diferencia de
 * inapps-builder), porque un email tiene todos los slots a la vez. Los
 * marcadores sin entrada aquí (BANNER por ahora) quedan intactos en el HTML
 * ensamblado hasta que se implementen.
 */
export const registry: Partial<Record<SlotName, SlotDef<any>>> = {
  HEADER: headerSlotDef,
  FOOTER: footerSlotDef,
  CIERRE: cierreSlotDef,
  CONTENIDOS: contenidosSlotDef,
}

export const defaultEmailDocument: EmailDocument = {
  global: defaultGlobalFields,
  header: defaultHeaderFields,
  footer: defaultFooterFields,
  cierre: defaultCierreFields,
  contenidos: [],
}
