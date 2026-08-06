import type { ZodType, ZodTypeDef } from 'zod'
import type { ComponentType } from 'react'
import type { ContentBlockType, EmailDocument } from './model'
import type { GlobalFields } from './global/schema'
import { defaultCtaFields, ctaFieldsSchema, type CtaFields } from './components/cta/schema'
import { renderCtaSnippet } from './components/cta/render'
import { CtaPropertiesPanel } from './components/cta/PropertiesPanel'
import { defaultDealsFields, dealsFieldsSchema, type DealsFields } from './components/deals/schema'
import { renderDealsSnippet } from './components/deals/render'
import { DealsPropertiesPanel } from './components/deals/panels'

/**
 * Lo que un bloque necesita saber de sí mismo para renderizarse. Hoy solo su
 * propio id, y solo DEALS lo usa: sus tarjetas llevan marcadores
 * `DCARD:<blockId>:<cardId>` para que ui/Viewport.tsx pueda medirlas y acotar el
 * reordenamiento al bloque dueño. Mismo espíritu que `BannerItemRenderCtx`.
 */
export interface ContentBlockRenderCtx {
  blockId: string
}

/**
 * Definición de un tipo de bloque de contenido — mismo espíritu que
 * `SlotDef` en registry.ts, un nivel más adentro (un bloque de CONTENIDOS, no
 * un slot del maestro). `PropertiesPanel` recibe además `doc`/`onChangeGlobal`
 * porque CTA necesita leer/escribir `doc.global.ctaStyle`, compartido por
 * TODAS las instancias — no hay equivalente de esto en SlotDef porque ningún
 * slot singleton necesitaba tocar un campo global.
 */
export interface ContentBlockDef<TFields> {
  type: ContentBlockType
  label: string
  schema: ZodType<TFields, ZodTypeDef, any>
  defaultFields: TFields
  render: (fields: TFields, doc: EmailDocument, ctx: ContentBlockRenderCtx) => string
  PropertiesPanel: ComponentType<{
    value: TFields
    onChange: (next: TFields) => void
    doc: EmailDocument
    onChangeGlobal: (next: GlobalFields) => void
  }>
}

const ctaBlockDef: ContentBlockDef<CtaFields> = {
  type: 'CTA',
  label: 'CTA',
  schema: ctaFieldsSchema,
  defaultFields: defaultCtaFields,
  render: (fields, doc) => renderCtaSnippet(fields, doc.global.ctaStyle),
  PropertiesPanel: CtaPropertiesPanel,
}

const dealsBlockDef: ContentBlockDef<DealsFields> = {
  type: 'DEALS',
  label: 'Deals',
  schema: dealsFieldsSchema,
  defaultFields: defaultDealsFields,
  render: renderDealsSnippet,
  PropertiesPanel: DealsPropertiesPanel,
}

/** Tipos de bloque registrados — hoy CTA y DEALS; TITLE/LOGOS/etc. se suman acá
 *  cuando se implementen. */
export const contentBlockRegistry: Partial<Record<ContentBlockType, ContentBlockDef<any>>> = {
  CTA: ctaBlockDef,
  DEALS: dealsBlockDef,
}

/**
 * Búsqueda por `string` suelto (no `ContentBlockType`) — hace falta en dos
 * lugares que no conocen el tipo exacto de antemano: LibraryPanel.tsx lista
 * también los 8 tipos de contenido aún no implementados (TITLE, DEALS, etc.,
 * documentados en el maestro pero fuera de la unión `ContentBlockType`
 * mientras no se construyan), y Viewport.tsx lee `type` de un comentario HTML
 * (siempre `string`, no algo que TypeScript pueda angostar solo).
 */
export function getContentBlockDef(type: string): ContentBlockDef<any> | undefined {
  return (contentBlockRegistry as Record<string, ContentBlockDef<any> | undefined>)[type]
}
