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
  beneficiosTextoFieldsSchema,
  beneficiosTituloFieldsSchema,
  bulletIconoFieldsSchema,
  bulletIconoSimpleFieldsSchema,
  bulletNumeradoFieldsSchema,
  columnaTextoFieldsSchema,
  cuponMontoFieldsSchema,
  defaultBeneficiosTextoFields,
  defaultBeneficiosTituloFields,
  defaultBulletIconoFields,
  defaultBulletIconoSimpleFields,
  defaultBulletNumeradoFields,
  defaultColumnaTextoFields,
  defaultCuponMontoFields,
  defaultIconoFields,
  defaultSeparadorLineaFields,
  defaultSubtituloTextoFields,
  defaultTituloTextoFields,
  iconoFieldsSchema,
  MODULE_ITEM_TYPE_VALUES,
  separadorLineaFieldsSchema,
  subtituloTextoFieldsSchema,
  tituloTextoFieldsSchema,
  type ModuleItemType,
} from './moduleItems/schemas'
import {
  renderBeneficiosTextoSnippet,
  renderBeneficiosTituloSnippet,
  renderBulletIconoSimpleSnippet,
  renderBulletIconoSnippet,
  renderBulletNumeradoSnippet,
  renderColumnaTextoSnippet,
  renderCuponMontoSnippet,
  renderIconoSnippet,
  renderSeparadorLineaSnippet,
  renderSubtituloTextoSnippet,
  renderTituloTextoSnippet,
} from './moduleItems/render'
import {
  BeneficiosTextoPropertiesPanel,
  BeneficiosTituloPropertiesPanel,
  BulletIconoPropertiesPanel,
  BulletIconoSimplePropertiesPanel,
  BulletNumeradoPropertiesPanel,
  ColumnaTextoPropertiesPanel,
  CuponMontoPropertiesPanel,
  IconoPropertiesPanel,
  SeparadorLineaPropertiesPanel,
  SubtituloTextoPropertiesPanel,
  TituloTextoPropertiesPanel,
} from './moduleItems/panels'

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
  // Las 5 de acá abajo son fase 3 (plan de nuevos módulos de contenido, ver
  // [[project_body_modules_plan_2026-08-26]]) — BULLET_ICONO/BULLET_NUMERADO/
  // ICONO nacen en el catálogo de Bullet, BENEFICIOS_TITULO/BENEFICIOS_TEXTO
  // en el de Beneficios, pero las 5 quedan disponibles para CUALQUIER módulo
  // (mismo criterio "universal" que TITULO_TEXTO/SUBTITULO_TEXTO).
  BULLET_ICONO: {
    type: 'BULLET_ICONO',
    label: 'Bullet con ícono',
    schema: bulletIconoFieldsSchema,
    defaultFields: defaultBulletIconoFields,
    render: (fields, _doc, _ctx) => renderBulletIconoSnippet(fields),
    PropertiesPanel: BulletIconoPropertiesPanel,
    Icon: MODULE_ITEM_ICONS.BULLET_ICONO,
  },
  BULLET_NUMERADO: {
    type: 'BULLET_NUMERADO',
    label: 'Bullet numerado',
    schema: bulletNumeradoFieldsSchema,
    defaultFields: defaultBulletNumeradoFields,
    render: (fields, _doc, _ctx) => renderBulletNumeradoSnippet(fields),
    PropertiesPanel: BulletNumeradoPropertiesPanel,
    Icon: MODULE_ITEM_ICONS.BULLET_NUMERADO,
  },
  ICONO: {
    type: 'ICONO',
    label: 'Ícono',
    schema: iconoFieldsSchema,
    defaultFields: defaultIconoFields,
    render: (fields, _doc, _ctx) => renderIconoSnippet(fields),
    PropertiesPanel: IconoPropertiesPanel,
    Icon: MODULE_ITEM_ICONS.ICONO,
  },
  BENEFICIOS_TITULO: {
    type: 'BENEFICIOS_TITULO',
    label: 'Título (Beneficios)',
    schema: beneficiosTituloFieldsSchema,
    defaultFields: defaultBeneficiosTituloFields,
    render: (fields, _doc, _ctx) => renderBeneficiosTituloSnippet(fields),
    PropertiesPanel: BeneficiosTituloPropertiesPanel,
    Icon: MODULE_ITEM_ICONS.BENEFICIOS_TITULO,
  },
  BENEFICIOS_TEXTO: {
    type: 'BENEFICIOS_TEXTO',
    label: 'Texto (Beneficios)',
    schema: beneficiosTextoFieldsSchema,
    defaultFields: defaultBeneficiosTextoFields,
    render: (fields, _doc, _ctx) => renderBeneficiosTextoSnippet(fields),
    PropertiesPanel: BeneficiosTextoPropertiesPanel,
    Icon: MODULE_ITEM_ICONS.BENEFICIOS_TEXTO,
  },
  // Fase 5 (plan de nuevos módulos de contenido, ver
  // [[project_body_modules_plan_2026-08-26]]) — nace anclada a
  // modulo-3-columnas.html (ver moduleItems/render.ts), universal desde el día 1
  // como el resto del catálogo.
  COLUMNA_TEXTO: {
    type: 'COLUMNA_TEXTO',
    label: 'Texto corto (Columnas)',
    schema: columnaTextoFieldsSchema,
    defaultFields: defaultColumnaTextoFields,
    render: (fields, _doc, _ctx) => renderColumnaTextoSnippet(fields),
    PropertiesPanel: ColumnaTextoPropertiesPanel,
    Icon: MODULE_ITEM_ICONS.COLUMNA_TEXTO,
  },
  // Fase 8 (plan de nuevos módulos de contenido, ver
  // [[project_body_modules_plan_2026-08-26]]) — nacen ancladas a
  // cupones-modulo.html (ver moduleItems/render.ts), universales desde el
  // día 1 como el resto del catálogo.
  BULLET_ICONO_SIMPLE: {
    type: 'BULLET_ICONO_SIMPLE',
    label: 'Bullet con ícono (simple)',
    schema: bulletIconoSimpleFieldsSchema,
    defaultFields: defaultBulletIconoSimpleFields,
    render: (fields, _doc, _ctx) => renderBulletIconoSimpleSnippet(fields),
    PropertiesPanel: BulletIconoSimplePropertiesPanel,
    Icon: MODULE_ITEM_ICONS.BULLET_ICONO_SIMPLE,
  },
  CUPON_MONTO: {
    type: 'CUPON_MONTO',
    label: 'Texto destacado (Cupones)',
    schema: cuponMontoFieldsSchema,
    defaultFields: defaultCuponMontoFields,
    render: (fields, _doc, _ctx) => renderCuponMontoSnippet(fields),
    PropertiesPanel: CuponMontoPropertiesPanel,
    Icon: MODULE_ITEM_ICONS.CUPON_MONTO,
  },
}

/** Mismo orden que MODULE_ITEM_TYPE_VALUES — también el orden del catálogo. */
export const MODULE_ITEM_LIBRARY_ORDER: readonly ModuleItemType[] = MODULE_ITEM_TYPE_VALUES

/** Búsqueda por `string` suelto — Viewport.tsx lee el tipo de un comentario
 *  HTML, mismo motivo que getBannerItemDef/getContentBlockDef. */
export function getModuleItemDef(type: string): ModuleItemDef<any> | undefined {
  return (bodyMoleculeRegistry as Record<string, ModuleItemDef<any> | undefined>)[type]
}
