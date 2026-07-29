import type { ZodType, ZodTypeDef } from 'zod'
import type { ComponentType } from 'react'
import type { EmailDocument, SlotName } from './model'
import { defaultFooterFields, footerSchema, type FooterFields } from './components/footer/schema'
import { renderFooterSnippet } from './components/footer/render'
import { FooterPropertiesPanel } from './components/footer/PropertiesPanel'
import { defaultHeaderFields, headerSchema, type HeaderFields } from './components/header/schema'
import { renderHeaderSnippet } from './components/header/render'
import { HeaderPropertiesPanel } from './components/header/PropertiesPanel'
import { defaultGlobalFields } from './global/schema'

/**
 * Definición de un slot registrable. `render` recibe el documento completo
 * (no solo sus propios campos) porque los slots pueden estar acoplados entre
 * sí — ej.: si Footer.tipoFooter = 'RTS', el futuro slot Cierre debe
 * eliminarse por completo (ver Referencias/instrucciones.md línea 426).
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
  PropertiesPanel: ComponentType<{ value: TFields; onChange: (next: TFields) => void }>
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
 * marcadores sin entrada aquí (HEADER/BANNER/CONTENIDOS/CIERRE por ahora)
 * quedan intactos en el HTML ensamblado hasta que se implementen.
 */
export const registry: Partial<Record<SlotName, SlotDef<any>>> = {
  HEADER: headerSlotDef,
  FOOTER: footerSlotDef,
}

export const defaultEmailDocument: EmailDocument = {
  global: defaultGlobalFields,
  header: defaultHeaderFields,
  footer: defaultFooterFields,
}
