// ============================================================================
// Los 10 tipos de pieza que puede alojar un Banner, y su unión discriminada.
//
// Vive fuera de model.ts a propósito: BannerFields.items está anidado DENTRO
// de un slot (a diferencia de contenidos, que es una key de EmailDocument), y
// model.ts necesita este tipo — si viviera en model.ts, banner/schema.ts →
// model.ts → banner/schema.ts sería un ciclo. model.ts re-exporta estos tipos
// para que el resto de la app siga importándolos desde ahí, igual que
// ContentBlock.
//
// Orden = el que el propio maestro enumera dentro de "MODULO MOLECULAS" en
// big-banner-horizontal.html (PROMOS, CREDITOS, TEXTO XL VIVO, TEXTO M VIVO,
// TEXTO COMPLEMENTO, IMG AUTOMATICA), + CTA interno, + los 3 MODULOS. Es
// también el orden en que aparecen en el panel de componentes.
// ============================================================================
import { z } from 'zod'
import { defaultRichText, richTextSchema } from '../../../richText/model'

export const BANNER_ITEM_TYPE_VALUES = [
  'PROMO',
  'CREDITOS',
  'TEXTOXL',
  'TEXTOM',
  'TEXTO_COMPLEMENTARIO',
  'IMG_AUTOMATICA_MOLECULA',
  'CTA_INTERNO',
  'IMG_FIJA',
  'IMG_AUTOMATICA_MODULO',
  'TAGS',
] as const
export type BannerItemType = (typeof BANNER_ITEM_TYPE_VALUES)[number]

// Defaults tomados literalmente de los {% assign %} de ejemplo del maestro
// (06-examples/estructura_general.html) y de las URLs placeholder de cada
// archivo real de 02-components/02_banners/banner_moleculas/.

export const promoFieldsSchema = z.object({ promoText: z.string().default('$14.000') })
export type PromoFields = z.infer<typeof promoFieldsSchema>
export const defaultPromoFields: PromoFields = promoFieldsSchema.parse({})

export const creditosFieldsSchema = z.object({ creditosText: z.string().default('120') })
export type CreditosFields = z.infer<typeof creditosFieldsSchema>
export const defaultCreditosFields: CreditosFields = creditosFieldsSchema.parse({})

/** `text` es RichText (runs con marcas), no un string plano, desde que se
 *  agregaron los modificadores de texto (bold/italic/tachado/subrayado/
 *  superíndice/color) por selección — ver richText/model.ts y el panel de
 *  esta pieza (items/panels.tsx, RichTextInput). `richTextSchema` migra solo
 *  un string viejo (documento guardado antes de este cambio) a un run sin
 *  marcas, así no se pierde ni se invalida el documento completo al cargar. */
export const textoXlFieldsSchema = z.object({ text: richTextSchema.default(defaultRichText('120 créditos')) })
export type TextoXlFields = z.infer<typeof textoXlFieldsSchema>
export const defaultTextoXlFields: TextoXlFields = textoXlFieldsSchema.parse({})

export const textoMFieldsSchema = z.object({ text: richTextSchema.default(defaultRichText('de regalo para tu proxima compra')) })
export type TextoMFields = z.infer<typeof textoMFieldsSchema>
export const defaultTextoMFields: TextoMFields = textoMFieldsSchema.parse({})

export const textoComplementarioFieldsSchema = z.object({
  text: richTextSchema.default(defaultRichText('Más de 500 opciones de tacos solo durante una semana')),
})
export type TextoComplementarioFields = z.infer<typeof textoComplementarioFieldsSchema>
export const defaultTextoComplementarioFields: TextoComplementarioFields = textoComplementarioFieldsSchema.parse({})

/** `banner_img_modulo_auto_ancho` — el maestro lo asigna a '80' en su ejemplo;
 *  la misma variable alimenta tanto la molécula como el módulo. */
export const imgAutomaticaMoleculaFieldsSchema = z.object({
  imageUrl: z.string().default('https://lh3.googleusercontent.com/d/1U4HZfNfRWpZ0XhMCmFF-4V4U2H3W8IcN'),
  widthPercent: z.number().int().min(1).max(100).default(80),
})
export type ImgAutomaticaMoleculaFields = z.infer<typeof imgAutomaticaMoleculaFieldsSchema>
export const defaultImgAutomaticaMoleculaFields: ImgAutomaticaMoleculaFields = imgAutomaticaMoleculaFieldsSchema.parse({})

export const imgAutomaticaModuloFieldsSchema = z.object({
  imageUrl: z.string().default(
    'https://braze-images.com/appboy/communication/assets/image_assets/images/6a69942490791600863938e5/original.png?1785304099',
  ),
  widthPercent: z.number().int().min(1).max(100).default(80),
})
export type ImgAutomaticaModuloFields = z.infer<typeof imgAutomaticaModuloFieldsSchema>
export const defaultImgAutomaticaModuloFields: ImgAutomaticaModuloFields = imgAutomaticaModuloFieldsSchema.parse({})

export const imgFijaFieldsSchema = z.object({
  heroImageUrl: z.string().default('https://lh3.googleusercontent.com/d/1DUvbZ8_lGdt1N_jZUSt4vyHHblvbVg9P'),
  logoImageUrl: z.string().default('https://lh3.googleusercontent.com/d/1a9-c_8otztz8MJvWa6G-TczJ3NEO083G'),
  /** Solo la variante VERTICAL envuelve el logo en <a href="AQUIELLINKDELOGO1">;
   *  la horizontal no lo hace. Asimetría real de los 2 archivos del maestro,
   *  no un bug a "arreglar" — en horizontal este campo se ignora. */
  logoLink: z.string().default(''),
})
export type ImgFijaFields = z.infer<typeof imgFijaFieldsSchema>
export const defaultImgFijaFields: ImgFijaFields = imgFijaFieldsSchema.parse({})

/** El archivo real trae 3 pills hardcodeadas con el texto literal "tag 1".
 *  Acá son 1-3 etiquetas editables: "si la fuente no trae tag, se omite"
 *  (05-docs/USO-DE-CADA-PARTE.md) implica que 1 sola es lo normal. */
export const tagsFieldsSchema = z.object({ tags: z.array(z.string()).min(1).max(3).default(['tag 1']) })
export type TagsFields = z.infer<typeof tagsFieldsSchema>
export const defaultTagsFields: TagsFields = tagsFieldsSchema.parse({})

/** `cta_alineado` NO es campo: es fijo por orientación del banner ('left'
 *  horizontal / 'center' vertical, hardcodeado en el maestro). El color/estilo
 *  sale de doc.global.ctaStyle, compartido con el CTA libre de CONTENIDOS. */
export const ctaInternoFieldsSchema = z.object({
  text: z.string().default('Súper completo en 10 min'),
  deeplink: z.string().default(''),
})
export type CtaInternoFields = z.infer<typeof ctaInternoFieldsSchema>
export const defaultCtaInternoFields: CtaInternoFields = ctaInternoFieldsSchema.parse({})

/** Unión discriminada derivada de zod (no interfaces a mano como CtaBlock en
 *  model.ts): con 10 tipos, mantener 2 fuentes de verdad a mano se desincroniza. */
export const bannerItemSchema = z.discriminatedUnion('type', [
  z.object({ id: z.string(), type: z.literal('PROMO'), fields: promoFieldsSchema }),
  z.object({ id: z.string(), type: z.literal('CREDITOS'), fields: creditosFieldsSchema }),
  z.object({ id: z.string(), type: z.literal('TEXTOXL'), fields: textoXlFieldsSchema }),
  z.object({ id: z.string(), type: z.literal('TEXTOM'), fields: textoMFieldsSchema }),
  z.object({ id: z.string(), type: z.literal('TEXTO_COMPLEMENTARIO'), fields: textoComplementarioFieldsSchema }),
  z.object({ id: z.string(), type: z.literal('IMG_AUTOMATICA_MOLECULA'), fields: imgAutomaticaMoleculaFieldsSchema }),
  z.object({ id: z.string(), type: z.literal('CTA_INTERNO'), fields: ctaInternoFieldsSchema }),
  z.object({ id: z.string(), type: z.literal('IMG_FIJA'), fields: imgFijaFieldsSchema }),
  z.object({ id: z.string(), type: z.literal('IMG_AUTOMATICA_MODULO'), fields: imgAutomaticaModuloFieldsSchema }),
  z.object({ id: z.string(), type: z.literal('TAGS'), fields: tagsFieldsSchema }),
])
export type BannerItem = z.infer<typeof bannerItemSchema>
