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
import { cloneCol1Fields, createDefaultCol1Fields, defaultCol1Fields, col1FieldsSchema, COL1_AREA_ABOVE, COL1_AREA_BELOW, type Col1Fields } from './components/col1/schema'
import { renderCol1Snippet } from './components/col1/render'
import { Col1PropertiesPanel } from './components/col1/PropertiesPanel'
import { cloneCol3Fields, createDefaultCol3Fields, defaultCol3Fields, col3FieldsSchema, COL3_CELL_1, COL3_CELL_2, COL3_CELL_3, type Col3Fields } from './components/col3/schema'
import { renderCol3Snippet } from './components/col3/render'
import { Col3PropertiesPanel } from './components/col3/PropertiesPanel'
import { cloneCol2Fields, createDefaultCol2Fields, defaultCol2Fields, col2FieldsSchema, type Col2Fields } from './components/col2/schema'
import { renderCol2Snippet } from './components/col2/render'
import { Col2PropertiesPanel } from './components/col2/PropertiesPanel'

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
  /**
   * Áreas libres del módulo, cada una con su propio `areaKey` (el que viajan
   * en `ModuleItem.areaKey`) + un `label` para el catálogo "+ Agregar
   * molécula" de cada una (ver ui/InspectorPanel.tsx). Ausente en TITLE/
   * BULLET/BENEFICIOS (una sola área implícita, `getModuleAreas` resuelve el
   * default `'main'` sin label) — COL1 (fase 4) es el primero en declararlo
   * explícito, con 2 áreas reales ('above'/'below' de la imagen).
   */
  moduleAreas?: { key: string; label: string }[]
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

const col1BlockDef: ContentBlockDef<Col1Fields> = {
  type: 'COL1',
  label: '1 columna',
  schema: col1FieldsSchema,
  defaultFields: defaultCol1Fields,
  createDefaultFields: createDefaultCol1Fields,
  cloneFields: cloneCol1Fields,
  usesModuleItems: true,
  hasGeneralModuleFields: true,
  moduleAreas: [
    { key: COL1_AREA_ABOVE, label: 'Arriba de la imagen' },
    { key: COL1_AREA_BELOW, label: 'Debajo de la imagen' },
  ],
  render: renderCol1Snippet,
  PropertiesPanel: Col1PropertiesPanel,
}

/**
 * COL3 ("3 columnas") — fase 5. `hasGeneralModuleFields` queda DELIBERADAMENTE
 * ausente (a diferencia de TITLE/BULLET/BENEFICIOS/COL1): el maestro dice
 * explícito que el fondo se apaga "celda por celda", así que `backgroundEnabled`
 * no vive en la raíz de `fields` (ver components/col3/schema.ts) — ese flag
 * asume exactamente eso, y marcarlo igual rompería el efecto de App.tsx (que
 * resuelve el default por tema de COL3 aparte, con su propio caso especial
 * `block.type === 'COL3'`, ver la nota grande ahí).
 */
const col3BlockDef: ContentBlockDef<Col3Fields> = {
  type: 'COL3',
  label: '3 columnas',
  schema: col3FieldsSchema,
  defaultFields: defaultCol3Fields,
  createDefaultFields: createDefaultCol3Fields,
  cloneFields: cloneCol3Fields,
  usesModuleItems: true,
  moduleAreas: [
    { key: COL3_CELL_1, label: 'Celda 1' },
    { key: COL3_CELL_2, label: 'Celda 2' },
    { key: COL3_CELL_3, label: 'Celda 3' },
  ],
  render: renderCol3Snippet,
  PropertiesPanel: Col3PropertiesPanel,
}

/**
 * COL2 ("2 columnas") — fase 6. A diferencia de COL3, SÍ marca
 * `hasGeneralModuleFields: true` (fondo/click/alineado vuelven a ser una
 * única variable de módulo, verificado por conteo de anclas — ver la nota
 * grande de components/col2/schema.ts) — App.tsx lo patchea con el mismo
 * camino genérico que TITLE/BULLET/BENEFICIOS/COL1, sin caso especial.
 */
const col2BlockDef: ContentBlockDef<Col2Fields> = {
  type: 'COL2',
  label: '2 columnas',
  schema: col2FieldsSchema,
  defaultFields: defaultCol2Fields,
  createDefaultFields: createDefaultCol2Fields,
  cloneFields: cloneCol2Fields,
  usesModuleItems: true,
  hasGeneralModuleFields: true,
  render: renderCol2Snippet,
  PropertiesPanel: Col2PropertiesPanel,
}

/** Tipos de bloque registrados — hoy CTA, DEALS, TITLE, BULLET, BENEFICIOS,
 *  COL1, COL3 y COL2; LOGOS/CUPONES se suman acá cuando se implementen. */
export const contentBlockRegistry: Partial<Record<ContentBlockType, ContentBlockDef<any>>> = {
  CTA: ctaBlockDef,
  DEALS: dealsBlockDef,
  TITLE: titleBlockDef,
  BULLET: bulletBlockDef,
  BENEFICIOS: beneficiosBlockDef,
  COL1: col1BlockDef,
  COL3: col3BlockDef,
  COL2: col2BlockDef,
}

/** Áreas libres de un bloque `usesModuleItems` — default `'main'` sin label
 *  para los módulos de una sola área (compat con TITLE/BULLET/BENEFICIOS, que
 *  no declaran `moduleAreas`). Usado por ui/InspectorPanel.tsx (un catálogo
 *  "+ Agregar molécula" por área) y ui/Viewport.tsx (destino por defecto de un
 *  drop geométrico en el canvas — ver la nota en resolveModuleBlockForDrop). */
export function getModuleAreas(def: ContentBlockDef<any>): { key: string; label: string }[] {
  return def.moduleAreas ?? [{ key: 'main', label: '' }]
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
