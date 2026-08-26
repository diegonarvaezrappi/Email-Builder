import type { ZodType, ZodTypeDef } from 'zod'
import type { ComponentType, SVGProps } from 'react'
import type { EmailDocument } from './model'
import { MODULE_ITEM_ICONS } from './ui/moleculeIcons'
import type { GlobalFields } from './global/schema'
import {
  defaultFranjaLogosFields,
  defaultSeparadorFields,
  defaultTextoPastillaFields,
  franjaLogosFieldsSchema,
  separadorFieldsSchema,
  textoPastillaFieldsSchema,
} from './components/banner/items/schemas'
import { renderFranjaLogosSnippet, renderSeparadorSnippet, renderTextoPastillaSnippet } from './components/banner/items/render'
import { FranjaLogosPropertiesPanel, SeparadorPropertiesPanel, TextoPastillaPropertiesPanel } from './components/banner/items/panels'
import {
  defaultSeparadorLineaFields,
  defaultSubtituloTextoFields,
  defaultTituloTextoFields,
  MODULE_ITEM_TYPE_VALUES,
  separadorLineaFieldsSchema,
  subtituloTextoFieldsSchema,
  tituloTextoFieldsSchema,
  type ModuleItemType,
} from './moduleItems/schemas'
import { renderSeparadorLineaSnippet, renderSubtituloTextoSnippet, renderTituloTextoSnippet } from './moduleItems/render'
import { SeparadorLineaPropertiesPanel, SubtituloTextoPropertiesPanel, TituloTextoPropertiesPanel } from './moduleItems/panels'

/** Lo que una molécula de módulo necesita saber de su instancia — mismo
 *  espíritu que BannerItemRenderCtx/ContentBlockRenderCtx, un nivel más
 *  adentro (una pieza del ÁREA LIBRE de un módulo, no el módulo entero).
 *  `blockId` no lo usa ningún render de hoy, pero se pasa igual (mismo
 *  patrón que ContentBlockRenderCtx) para que un tipo futuro que sí lo
 *  necesite no tenga que cambiar la firma de todos los demás. */
export interface ModuleItemRenderCtx {
  blockId: string
}

/**
 * Definición de un tipo de molécula del catálogo de body — mismo espíritu que
 * `BannerItemDef`, un nivel más arriba: NO pertenece a un módulo puntual (a
 * diferencia de banner, donde cada pieza vive dentro de la única tabla de
 * moléculas de banner), es el catálogo COMPARTIDO por TODOS los módulos de
 * body (ver moduleItems/schemas.ts).
 */
export interface ModuleItemDef<TFields> {
  type: ModuleItemType
  label: string
  schema: ZodType<TFields, ZodTypeDef, any>
  defaultFields: TFields
  render: (fields: TFields, doc: EmailDocument, ctx: ModuleItemRenderCtx) => string
  PropertiesPanel: ComponentType<{
    value: TFields
    onChange: (next: TFields) => void
    doc: EmailDocument
    onChangeGlobal: (next: GlobalFields) => void
  }>
  Icon?: ComponentType<SVGProps<SVGSVGElement>>
}

export const bodyMoleculeRegistry: Record<ModuleItemType, ModuleItemDef<any>> = {
  TITULO_TEXTO: {
    type: 'TITULO_TEXTO',
    label: 'Título',
    schema: tituloTextoFieldsSchema,
    defaultFields: defaultTituloTextoFields,
    render: (fields, _doc, _ctx) => renderTituloTextoSnippet(fields),
    PropertiesPanel: TituloTextoPropertiesPanel,
    Icon: MODULE_ITEM_ICONS.TITULO_TEXTO,
  },
  SUBTITULO_TEXTO: {
    type: 'SUBTITULO_TEXTO',
    label: 'Subtítulo',
    schema: subtituloTextoFieldsSchema,
    defaultFields: defaultSubtituloTextoFields,
    render: (fields, _doc, _ctx) => renderSubtituloTextoSnippet(fields),
    PropertiesPanel: SubtituloTextoPropertiesPanel,
    Icon: MODULE_ITEM_ICONS.SUBTITULO_TEXTO,
  },
  SEPARADOR_LINEA: {
    type: 'SEPARADOR_LINEA',
    label: 'Línea separadora',
    schema: separadorLineaFieldsSchema,
    defaultFields: defaultSeparadorLineaFields,
    render: (fields, _doc, _ctx) => renderSeparadorLineaSnippet(fields),
    PropertiesPanel: SeparadorLineaPropertiesPanel,
    Icon: MODULE_ITEM_ICONS.SEPARADOR_LINEA,
  },
  // Las 3 de acá abajo son LA MISMA molécula que ya registra bannerItemRegistry.ts
  // (fase 1) — mismo schema, mismo default, mismo render, mismo panel, mismo
  // ícono, reusados tal cual (ver el comentario grande de moduleItems/schemas.ts).
  SEPARADOR: {
    type: 'SEPARADOR',
    label: 'Separador',
    schema: separadorFieldsSchema,
    defaultFields: defaultSeparadorFields,
    render: (fields, _doc, _ctx) => renderSeparadorSnippet(fields),
    PropertiesPanel: SeparadorPropertiesPanel,
    Icon: MODULE_ITEM_ICONS.SEPARADOR,
  },
  FRANJA_LOGOS: {
    type: 'FRANJA_LOGOS',
    label: 'Franja de logos',
    schema: franjaLogosFieldsSchema,
    defaultFields: defaultFranjaLogosFields,
    render: (fields, _doc, _ctx) => renderFranjaLogosSnippet(fields),
    PropertiesPanel: FranjaLogosPropertiesPanel,
    Icon: MODULE_ITEM_ICONS.FRANJA_LOGOS,
  },
  TEXTO_PASTILLA: {
    type: 'TEXTO_PASTILLA',
    label: 'Texto + pastilla',
    schema: textoPastillaFieldsSchema,
    defaultFields: defaultTextoPastillaFields,
    render: (fields, _doc, _ctx) => renderTextoPastillaSnippet(fields),
    PropertiesPanel: TextoPastillaPropertiesPanel,
    Icon: MODULE_ITEM_ICONS.TEXTO_PASTILLA,
  },
}

/** Mismo orden que MODULE_ITEM_TYPE_VALUES — también el orden del catálogo. */
export const MODULE_ITEM_LIBRARY_ORDER: readonly ModuleItemType[] = MODULE_ITEM_TYPE_VALUES

/** Búsqueda por `string` suelto — Viewport.tsx lee el tipo de un comentario
 *  HTML, mismo motivo que getBannerItemDef/getContentBlockDef. */
export function getModuleItemDef(type: string): ModuleItemDef<any> | undefined {
  return (bodyMoleculeRegistry as Record<string, ModuleItemDef<any> | undefined>)[type]
}
