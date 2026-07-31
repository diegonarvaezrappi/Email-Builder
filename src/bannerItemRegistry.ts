import type { ZodType, ZodTypeDef } from 'zod'
import type { ComponentType, SVGProps } from 'react'
import type { EmailDocument } from './model'
import { MOLECULE_ICONS } from './ui/moleculeIcons'
import type { GlobalFields } from './global/schema'
import type { BannerType, BannerItemRenderCtx } from './components/banner/schema'
import { BANNER_ITEM_TYPE_VALUES, type BannerItemType } from './components/banner/items/schemas'
import {
  creditosFieldsSchema,
  ctaInternoFieldsSchema,
  defaultCreditosFields,
  defaultCtaInternoFields,
  defaultImgAutomaticaModuloFields,
  defaultImgAutomaticaMoleculaFields,
  defaultImgFijaFields,
  defaultPromoFields,
  defaultTagsFields,
  defaultTextoComplementarioFields,
  defaultTextoMFields,
  defaultTextoXlFields,
  imgAutomaticaModuloFieldsSchema,
  imgAutomaticaMoleculaFieldsSchema,
  imgFijaFieldsSchema,
  promoFieldsSchema,
  tagsFieldsSchema,
  textoComplementarioFieldsSchema,
  textoMFieldsSchema,
  textoXlFieldsSchema,
} from './components/banner/items/schemas'
import {
  renderCreditosSnippet,
  renderCtaInternoSnippet,
  renderImgAutomaticaModuloSnippet,
  renderImgAutomaticaMoleculaSnippet,
  renderImgFijaSnippet,
  renderPromoSnippet,
  renderTagsSnippet,
  renderTextoComplementarioSnippet,
  renderTextoMSnippet,
  renderTextoXlSnippet,
} from './components/banner/items/render'
import {
  CreditosPropertiesPanel,
  CtaInternoPropertiesPanel,
  ImgAutomaticaModuloPropertiesPanel,
  ImgAutomaticaMoleculaPropertiesPanel,
  ImgFijaPropertiesPanel,
  PromoPropertiesPanel,
  TagsPropertiesPanel,
  TextoComplementarioPropertiesPanel,
  TextoMPropertiesPanel,
  TextoXlPropertiesPanel,
} from './components/banner/items/panels'

export type { BannerItemRenderCtx }

/**
 * Definición de un tipo de pieza de banner — mismo espíritu que
 * `ContentBlockDef` en contentBlockRegistry.ts, un nivel más adentro (una
 * pieza de BANNER, no un bloque de CONTENIDOS). `zone` y `orientations`
 * codifican la única taxonomía del maestro que sí se conserva en código: qué
 * piezas viven dentro de la tabla "MODULO MOLECULAS" (se agrupan y combinan
 * libremente) vs. cuáles son "módulos" con archivo propio, y para qué
 * orientación de banner el maestro trae archivo/comportamiento real.
 */
export interface BannerItemDef<TFields> {
  type: BannerItemType
  label: string
  zone: 'MOLECULA' | 'MODULO'
  orientations: readonly BannerType[]
  schema: ZodType<TFields, ZodTypeDef, any>
  defaultFields: TFields
  render: (fields: TFields, doc: EmailDocument, ctx: BannerItemRenderCtx) => string
  PropertiesPanel: ComponentType<{
    value: TFields
    onChange: (next: TFields) => void
    doc: EmailDocument
    onChangeGlobal: (next: GlobalFields) => void
  }>
  /** Ícono SVG esquemático mostrado en el catálogo de piezas del panel derecho
   *  (components/banner/ItemCatalog.tsx) — ver ui/moleculeIcons.tsx. Opcional a
   *  propósito: una pieza sin ícono todavía no rompe el catálogo. */
  Icon?: ComponentType<SVGProps<SVGSVGElement>>
}

const BOTH_ORIENTATIONS: readonly BannerType[] = ['horizontal', 'vertical']

export const bannerItemRegistry: Record<BannerItemType, BannerItemDef<any>> = {
  PROMO: {
    type: 'PROMO',
    label: 'Promo',
    zone: 'MOLECULA',
    orientations: BOTH_ORIENTATIONS,
    schema: promoFieldsSchema,
    defaultFields: defaultPromoFields,
    render: renderPromoSnippet,
    PropertiesPanel: PromoPropertiesPanel,
    Icon: MOLECULE_ICONS.PROMO,
  },
  CREDITOS: {
    type: 'CREDITOS',
    label: 'Créditos',
    zone: 'MOLECULA',
    orientations: BOTH_ORIENTATIONS,
    schema: creditosFieldsSchema,
    defaultFields: defaultCreditosFields,
    render: renderCreditosSnippet,
    PropertiesPanel: CreditosPropertiesPanel,
    Icon: MOLECULE_ICONS.CREDITOS,
  },
  TEXTOXL: {
    type: 'TEXTOXL',
    label: 'Texto XL',
    zone: 'MOLECULA',
    orientations: BOTH_ORIENTATIONS,
    schema: textoXlFieldsSchema,
    defaultFields: defaultTextoXlFields,
    render: renderTextoXlSnippet,
    PropertiesPanel: TextoXlPropertiesPanel,
    Icon: MOLECULE_ICONS.TEXTOXL,
  },
  TEXTOM: {
    type: 'TEXTOM',
    label: 'Texto M',
    zone: 'MOLECULA',
    orientations: BOTH_ORIENTATIONS,
    schema: textoMFieldsSchema,
    defaultFields: defaultTextoMFields,
    render: renderTextoMSnippet,
    PropertiesPanel: TextoMPropertiesPanel,
    Icon: MOLECULE_ICONS.TEXTOM,
  },
  TEXTO_COMPLEMENTARIO: {
    type: 'TEXTO_COMPLEMENTARIO',
    label: 'Texto complementario',
    zone: 'MOLECULA',
    // Sin variante vertical en el maestro (modulo_texto_complementario.html no
    // tiene par _horizontal/_vertical) — ver components/banner/items/render.ts.
    orientations: ['horizontal'],
    schema: textoComplementarioFieldsSchema,
    defaultFields: defaultTextoComplementarioFields,
    render: (fields, _doc, _ctx) => renderTextoComplementarioSnippet(fields),
    PropertiesPanel: TextoComplementarioPropertiesPanel,
    Icon: MOLECULE_ICONS.TEXTO_COMPLEMENTARIO,
  },
  IMG_AUTOMATICA_MOLECULA: {
    type: 'IMG_AUTOMATICA_MOLECULA',
    label: 'Imagen automática (molécula)',
    zone: 'MOLECULA',
    orientations: BOTH_ORIENTATIONS,
    schema: imgAutomaticaMoleculaFieldsSchema,
    defaultFields: defaultImgAutomaticaMoleculaFields,
    render: renderImgAutomaticaMoleculaSnippet,
    PropertiesPanel: ImgAutomaticaMoleculaPropertiesPanel,
    Icon: MOLECULE_ICONS.IMG_AUTOMATICA_MOLECULA,
  },
  CTA_INTERNO: {
    type: 'CTA_INTERNO',
    label: 'CTA interno',
    zone: 'MOLECULA',
    orientations: BOTH_ORIENTATIONS,
    schema: ctaInternoFieldsSchema,
    defaultFields: defaultCtaInternoFields,
    render: renderCtaInternoSnippet,
    PropertiesPanel: CtaInternoPropertiesPanel,
    Icon: MOLECULE_ICONS.CTA_INTERNO,
  },
  IMG_FIJA: {
    type: 'IMG_FIJA',
    label: 'Imagen de alto fijo',
    zone: 'MODULO',
    orientations: BOTH_ORIENTATIONS,
    schema: imgFijaFieldsSchema,
    defaultFields: defaultImgFijaFields,
    render: renderImgFijaSnippet,
    PropertiesPanel: ImgFijaPropertiesPanel,
    Icon: MOLECULE_ICONS.IMG_FIJA,
  },
  IMG_AUTOMATICA_MODULO: {
    type: 'IMG_AUTOMATICA_MODULO',
    label: 'Imagen automática (módulo)',
    zone: 'MODULO',
    // Solo horizontal — modulo_img_automatica_horizontal.html no tiene par
    // vertical; en vertical el módulo de imagen es siempre IMG_FIJA.
    orientations: ['horizontal'],
    schema: imgAutomaticaModuloFieldsSchema,
    defaultFields: defaultImgAutomaticaModuloFields,
    render: (fields, _doc, _ctx) => renderImgAutomaticaModuloSnippet(fields),
    PropertiesPanel: ImgAutomaticaModuloPropertiesPanel,
    Icon: MOLECULE_ICONS.IMG_AUTOMATICA_MODULO,
  },
  TAGS: {
    type: 'TAGS',
    label: 'Tags',
    zone: 'MODULO',
    orientations: BOTH_ORIENTATIONS,
    schema: tagsFieldsSchema,
    defaultFields: defaultTagsFields,
    render: renderTagsSnippet,
    PropertiesPanel: TagsPropertiesPanel,
    Icon: MOLECULE_ICONS.TAGS,
  },
}

/** Todos los tipos, en el mismo orden que enumera el maestro — también el
 *  orden en que se listan las piezas en el panel de componentes. */
export const BANNER_ITEM_LIBRARY_ORDER: readonly BannerItemType[] = BANNER_ITEM_TYPE_VALUES

/** Búsqueda por `string` suelto: Viewport.tsx lee el tipo de un comentario
 *  HTML (siempre `string`, no algo que TypeScript pueda angostar solo) —
 *  mismo motivo que getContentBlockDef en contentBlockRegistry.ts. */
export function getBannerItemDef(type: string): BannerItemDef<any> | undefined {
  return (bannerItemRegistry as Record<string, BannerItemDef<any> | undefined>)[type]
}
