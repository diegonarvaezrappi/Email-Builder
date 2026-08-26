import type { ZodType, ZodTypeDef } from 'zod'
import type { ComponentType } from 'react'
import type { ContentBlockType, EmailDocument } from './model'
import type { GlobalFields } from './global/schema'
import { defaultCtaFields, ctaFieldsSchema, type CtaFields } from './components/cta/schema'
import { renderCtaSnippet } from './components/cta/render'
import { CtaPropertiesPanel } from './components/cta/PropertiesPanel'
import { cloneDealsFields, createDefaultDealsFields, defaultDealsFields, dealsFieldsSchema, type DealsFields } from './components/deals/schema'
import { renderDealsSnippet } from './components/deals/render'
import { DealsPropertiesPanel } from './components/deals/panels'
import { cloneTitleFields, createDefaultTitleFields, defaultTitleFields, titleFieldsSchema, type TitleFields } from './components/title/schema'
import { renderTitleSnippet } from './components/title/render'
import { TitlePropertiesPanel } from './components/title/PropertiesPanel'
import { bulletFieldsSchema, cloneBulletFields, createDefaultBulletFields, defaultBulletFields, type BulletFields } from './components/bullet/schema'
import { renderBulletSnippet } from './components/bullet/render'
import { BulletPropertiesPanel } from './components/bullet/PropertiesPanel'
import {
  beneficiosFieldsSchema,
  cloneBeneficiosFields,
  createDefaultBeneficiosFields,
  defaultBeneficiosFields,
  type BeneficiosFields,
} from './components/benefits/schema'
import { renderBeneficiosSnippet } from './components/benefits/render'
import { BeneficiosPropertiesPanel } from './components/benefits/PropertiesPanel'

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
  /**
   * Fabrica el `fields` de una instancia NUEVA (usado por `insertContentBlock`
   * en store.ts). Por defecto ninguno hace falta — reusar `defaultFields` tal
   * cual alcanza para bloques sin ids propios adentro de `fields` (ej. CTA).
   * DEALS lo sobreescribe: cada tarjeta trae su propio id, y 2 filas de deals
   * (2 instancias del mismo tipo) no pueden compartirlos — ver la nota grande
   * en components/deals/schema.ts sobre por qué ahora se pueden arrastrar
   * varias filas.
   */
  createDefaultFields?: () => TFields
  /**
   * Clona un `fields` YA EXISTENTE para una instancia duplicada (usado por
   * `duplicateContentBlock`), preservando los valores del usuario. Por
   * defecto ninguno hace falta — reusar el mismo objeto alcanza si `fields` no
   * tiene ids propios adentro. DEALS lo sobreescribe por el mismo motivo que
   * `createDefaultFields`.
   */
  cloneFields?: (fields: TFields) => TFields
  /**
   * `true` si `fields.items` es una lista de ModuleItem (el motor de área
   * libre de moléculas compartido, ver bodyMoleculeRegistry.ts) — hoy solo
   * TITLE. Lo consultan components/contentModules/blocks.ts
   * (findModuleBlockByItem) y ui/InspectorPanel.tsx (para saber si mostrar el
   * catálogo "+ Agregar molécula"), en vez de cada uno mantener su propia
   * lista de tipos — una sola fuente de verdad. DEALS NO lo marca aunque
   * también tenga `fields.items`: es una lista de DealCard, otra forma
   * (`{id, fields}`, sin `type`/`areaKey`), un motor completamente distinto.
   */
  usesModuleItems?: boolean
  /**
   * `true` si `fields` spreadea generalModuleFieldsSchema (align/fondo/link
   * generales, ver components/contentModules/generalFields.ts) — hoy también
   * solo TITLE, pero es un flag DISTINTO de `usesModuleItems` a propósito: un
   * futuro módulo puede tener uno sin el otro (Cupones, fase 8 del plan,
   * usa el motor de área libre PERO su schema NO spreadea esto — el maestro
   * dice explícito que ahí fondo/alineado no son togglables). App.tsx lo
   * consulta para saber a qué bloques aplicarles moduleBackgroundEnabledForTheme.
   */
  hasGeneralModuleFields?: boolean
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
  createDefaultFields: createDefaultDealsFields,
  cloneFields: cloneDealsFields,
  render: renderDealsSnippet,
  PropertiesPanel: DealsPropertiesPanel,
}

const titleBlockDef: ContentBlockDef<TitleFields> = {
  type: 'TITLE',
  label: 'Título',
  schema: titleFieldsSchema,
  defaultFields: defaultTitleFields,
  createDefaultFields: createDefaultTitleFields,
  cloneFields: cloneTitleFields,
  usesModuleItems: true,
  hasGeneralModuleFields: true,
  render: renderTitleSnippet,
  PropertiesPanel: TitlePropertiesPanel,
}

const bulletBlockDef: ContentBlockDef<BulletFields> = {
  type: 'BULLET',
  label: 'Bullet',
  schema: bulletFieldsSchema,
  defaultFields: defaultBulletFields,
  createDefaultFields: createDefaultBulletFields,
  cloneFields: cloneBulletFields,
  usesModuleItems: true,
  hasGeneralModuleFields: true,
  render: renderBulletSnippet,
  PropertiesPanel: BulletPropertiesPanel,
}

const beneficiosBlockDef: ContentBlockDef<BeneficiosFields> = {
  type: 'BENEFICIOS',
  label: 'Beneficios',
  schema: beneficiosFieldsSchema,
  defaultFields: defaultBeneficiosFields,
  createDefaultFields: createDefaultBeneficiosFields,
  cloneFields: cloneBeneficiosFields,
  usesModuleItems: true,
  hasGeneralModuleFields: true,
  render: renderBeneficiosSnippet,
  PropertiesPanel: BeneficiosPropertiesPanel,
}

/** Tipos de bloque registrados — hoy CTA, DEALS, TITLE, BULLET y BENEFICIOS;
 *  LOGOS/etc. se suman acá cuando se implementen. */
export const contentBlockRegistry: Partial<Record<ContentBlockType, ContentBlockDef<any>>> = {
  CTA: ctaBlockDef,
  DEALS: dealsBlockDef,
  TITLE: titleBlockDef,
  BULLET: bulletBlockDef,
  BENEFICIOS: beneficiosBlockDef,
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
