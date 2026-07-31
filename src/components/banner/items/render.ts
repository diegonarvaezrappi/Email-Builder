// ============================================================================
// Los 10 renders de pieza de banner. Cada uno carga el archivo real
// horizontal/vertical correspondiente (sincronizado por scripts/sync-master.mjs),
// sustituye sus placeholders por los valores del usuario, y devuelve HTML
// limpio de Liquid — salvo CTA_INTERNO, la única excepción documentada (ver
// ese render más abajo).
//
// Los `{{xxx_mail_general}}` de tema que puedan quedar en el HTML devuelto acá
// (bg_descuento, color_descuento, bg_creditos, color_creditos, color_acento2,
// bg_tag_fondo, color_texto, img_overlay_2) se dejan intactos a propósito:
// components/banner/render.ts los resuelve todos de una sola pasada al final,
// mismo precedente que resolveHeaderThemeVars en components/header/render.ts.
// ============================================================================
import type { EmailDocument } from '../../../model'
import { escapeHtmlAttr, escapeHtmlText } from '../../../template/htmlText'
import { renderCtaSnippet } from '../../cta/render'
import type { BannerItemRenderCtx } from '../schema'
import { loadBannerMoleculaFile } from './files'
import type {
  CreditosFields,
  CtaInternoFields,
  ImgAutomaticaModuloFields,
  ImgAutomaticaMoleculaFields,
  ImgFijaFields,
  PromoFields,
  TagsFields,
  TextoComplementarioFields,
  TextoMFields,
  TextoXlFields,
} from './schemas'
import { ahoraSizing, liveTextSizing, sizingVars } from './sizing'
import { resolveBannerVars, substituteOnce } from './vars'

const HTML_COMMENT_RE = /<!--[\s\S]*?-->/g

/** Los comentarios de autor del archivo real no pasan al output — mismo
 *  criterio que renderHeaderSnippet/renderCierreSnippet/renderFooterSnippet. */
function stripComments(html: string): string {
  return html.replace(HTML_COMMENT_RE, '')
}

// --- PROMO -------------------------------------------------------------------

export function renderPromoSnippet(fields: PromoFields, _doc: EmailDocument, ctx: BannerItemRenderCtx): string {
  const fileName = `molecula_promo_${ctx.bannerType}.html`
  const raw = stripComments(loadBannerMoleculaFile(fileName))
  const size = liveTextSizing(fields.promoText, ctx.bannerType)
  const ahora = ahoraSizing(fields.promoText, ctx.bannerType)
  const vars: Record<string, string> = {
    banner_copy_modulo_promo: escapeHtmlText(fields.promoText),
    ...sizingVars(
      {
        classVar: 'banner_copy_modulo_prom_class',
        fontsizeVar: 'banner_copy_modulo_promo_fontsize',
        lineheightVar: 'banner_copy_modulo_promo_lineheight',
      },
      size,
      ctx.bannerType,
    ),
    ...sizingVars(
      {
        classVar: 'banner_copy_modulo_ahora_class',
        fontsizeVar: 'banner_copy_modulo_ahora_fontsize',
        lineheightVar: 'banner_copy_modulo_ahora_lineheight',
      },
      ahora,
      ctx.bannerType,
    ),
  }
  return resolveBannerVars(raw, vars, fileName)
}

// --- CREDITOS ------------------------------------------------------------------

export function renderCreditosSnippet(fields: CreditosFields, _doc: EmailDocument, ctx: BannerItemRenderCtx): string {
  const fileName = `molecula_creditos_${ctx.bannerType}.html`
  const raw = stripComments(loadBannerMoleculaFile(fileName))
  const size = liveTextSizing(fields.creditosText, ctx.bannerType)
  const vars: Record<string, string> = {
    banner_copy_modulo_creditos: escapeHtmlText(fields.creditosText),
    ...sizingVars(
      {
        classVar: 'banner_copy_modulo_creditos_class',
        fontsizeVar: 'banner_copy_modulo_creditos_fontsize',
        lineheightVar: 'banner_copy_modulo_creditos_lineheight',
      },
      size,
      ctx.bannerType,
    ),
  }
  return resolveBannerVars(raw, vars, fileName)
}

// --- TEXTOXL -------------------------------------------------------------------

export function renderTextoXlSnippet(fields: TextoXlFields, _doc: EmailDocument, ctx: BannerItemRenderCtx): string {
  const fileName = `molecula_textoxl_${ctx.bannerType}.html`
  const raw = stripComments(loadBannerMoleculaFile(fileName))
  const size = liveTextSizing(fields.text, ctx.bannerType)
  const vars: Record<string, string> = {
    banner_copy_modulo_textoxl: escapeHtmlText(fields.text),
    ...sizingVars(
      {
        classVar: 'banner_copy_modulo_textoxl_class',
        fontsizeVar: 'banner_copy_modulo_textoxl_fontsize',
        lineheightVar: 'banner_copy_modulo_textoxl_lineheight',
      },
      size,
      ctx.bannerType,
    ),
  }
  return resolveBannerVars(raw, vars, fileName)
}

// --- TEXTOM ----------------------------------------------------------------
// Sin lógica de tamaño: 30px/31px (horizontal) y 50px/51px (vertical) son
// literales inline en el archivo real, con class="bnr-md" fija — no dependen
// del largo del texto (a diferencia de PROMO/CREDITOS/TEXTOXL).
// `molecula_texto_M_horizontal/_vertical.html` son duplicados byte a byte de
// estos (05-docs/INDICE-DE-COMPONENTES.md los marca como duplicado sin
// resolver) — no se sincronizan ni se usan.

export function renderTextoMSnippet(fields: TextoMFields, _doc: EmailDocument, ctx: BannerItemRenderCtx): string {
  const fileName = `molecula_textom_${ctx.bannerType}.html`
  const raw = stripComments(loadBannerMoleculaFile(fileName))
  return resolveBannerVars(raw, { banner_copy_modulo_textom: escapeHtmlText(fields.text) }, fileName)
}

// --- TEXTO_COMPLEMENTARIO (solo horizontal, sin variante) -----------------------

const TEXTO_COMPLEMENTARIO_PLACEHOLDER = 'Más de 500 opciones de tacos solo durante una semana'

export function renderTextoComplementarioSnippet(fields: TextoComplementarioFields): string {
  const fileName = 'modulo_texto_complementario.html'
  const raw = stripComments(loadBannerMoleculaFile(fileName))
  return substituteOnce(raw, TEXTO_COMPLEMENTARIO_PLACEHOLDER, escapeHtmlText(fields.text), fileName)
}

// --- IMG_AUTOMATICA_MOLECULA -----------------------------------------------

const IMG_AUTOMATICA_MOLECULA_URL_PLACEHOLDER = 'https://lh3.googleusercontent.com/d/1U4HZfNfRWpZ0XhMCmFF-4V4U2H3W8IcN'

export function renderImgAutomaticaMoleculaSnippet(
  fields: ImgAutomaticaMoleculaFields,
  _doc: EmailDocument,
  ctx: BannerItemRenderCtx,
): string {
  const fileName = `molecula_img_automatica_${ctx.bannerType}.html`
  let html = stripComments(loadBannerMoleculaFile(fileName))
  html = substituteOnce(html, IMG_AUTOMATICA_MOLECULA_URL_PLACEHOLDER, escapeHtmlAttr(fields.imageUrl), fileName)
  return resolveBannerVars(html, { banner_img_modulo_auto_ancho: String(fields.widthPercent) }, fileName)
}

// --- IMG_AUTOMATICA_MODULO (solo horizontal) -----------------------------------
// Pieza DISTINTA de IMG_AUTOMATICA_MOLECULA (confirmado por diff: archivo,
// wrapper 240px y URL placeholder diferentes) — no confundir, ambas pueden
// coexistir (una es "modulo", ocupa la columna derecha del banner horizontal;
// la otra es "molecula", vive dentro de la tabla de moléculas).

const IMG_AUTOMATICA_MODULO_URL_PLACEHOLDER =
  'https://braze-images.com/appboy/communication/assets/image_assets/images/6a69942490791600863938e5/original.png?1785304099'

export function renderImgAutomaticaModuloSnippet(fields: ImgAutomaticaModuloFields): string {
  const fileName = 'modulo_img_automatica_horizontal.html'
  let html = stripComments(loadBannerMoleculaFile(fileName))
  html = substituteOnce(html, IMG_AUTOMATICA_MODULO_URL_PLACEHOLDER, escapeHtmlAttr(fields.imageUrl), fileName)
  return resolveBannerVars(html, { banner_img_modulo_auto_ancho: String(fields.widthPercent) }, fileName)
}

// --- IMG_FIJA ----------------------------------------------------------------

const IMG_FIJA_HERO_URL_PLACEHOLDER = 'https://lh3.googleusercontent.com/d/1DUvbZ8_lGdt1N_jZUSt4vyHHblvbVg9P'
const IMG_FIJA_LOGO_URL_PLACEHOLDER = 'https://lh3.googleusercontent.com/d/1a9-c_8otztz8MJvWa6G-TczJ3NEO083G'
/** Solo la variante VERTICAL envuelve el logo en este link — asimetría real
 *  del maestro entre modulo_img_altofijo_horizontal.html (sin link) y
 *  _vertical.html (con <a href="AQUIELLINKDELOGO1">), no un bug a "arreglar". */
const IMG_FIJA_LOGO_LINK_PLACEHOLDER = 'AQUIELLINKDELOGO1'

export function renderImgFijaSnippet(fields: ImgFijaFields, _doc: EmailDocument, ctx: BannerItemRenderCtx): string {
  const fileName = `modulo_img_altofijo_${ctx.bannerType}.html`
  let html = stripComments(loadBannerMoleculaFile(fileName))
  html = substituteOnce(html, IMG_FIJA_HERO_URL_PLACEHOLDER, escapeHtmlAttr(fields.heroImageUrl), fileName)
  html = substituteOnce(html, IMG_FIJA_LOGO_URL_PLACEHOLDER, escapeHtmlAttr(fields.logoImageUrl), fileName)
  if (ctx.bannerType === 'vertical') {
    html = substituteOnce(html, IMG_FIJA_LOGO_LINK_PLACEHOLDER, escapeHtmlAttr(fields.logoLink), fileName)
  }
  // {{img_overlay_2_mail_general}} queda para la pasada de tema de render.ts.
  return html
}

// --- TAGS ----------------------------------------------------------------------
// El archivo real trae 3 <td> pill hermanos casi idénticos (el 1º difiere de
// los otros 2 por un espacio de más en el style — los pills 2 y 3 son byte a
// byte iguales entre sí), así que se usan los ÍNDICES de matchAll, nunca
// indexOf (que encontraría siempre el mismo pill).

const TAG_PILL_RE = /<td style=""><div style="vertical-align: middle;text-align: left;[\s\S]*?<\/div><\/td>/g
const TAG_TEXT_PLACEHOLDER = '> tag 1 </h4>'

export function renderTagsSnippet(fields: TagsFields, _doc: EmailDocument, ctx: BannerItemRenderCtx): string {
  const fileName = `modulo_tags_${ctx.bannerType}.html`
  const raw = stripComments(loadBannerMoleculaFile(fileName))
  const pills = [...raw.matchAll(TAG_PILL_RE)]
  if (pills.length !== 3) {
    throw new Error(`${fileName}: se esperaban 3 pills de tag y se encontraron ${pills.length} — revisar TAG_PILL_RE en components/banner/items/render.ts`)
  }
  const template = pills[0][0]
  if (!template.includes(TAG_TEXT_PLACEHOLDER)) {
    throw new Error(`${fileName}: el pill de tag ya no contiene "${TAG_TEXT_PLACEHOLDER}" — revisar components/banner/items/render.ts`)
  }

  const renderedPills = fields.tags
    .slice(0, 3)
    .map((label) => template.replace(TAG_TEXT_PLACEHOLDER, () => `> ${escapeHtmlText(label)} </h4>`))
    .join('\n')

  const start = pills[0].index
  const end = pills[2].index + pills[2][0].length
  return raw.slice(0, start) + renderedPills + raw.slice(end)
}

// --- CTA_INTERNO -----------------------------------------------------------
// ÚNICA excepción del banner al "output limpio de Liquid": el botón real es
// un content block de Braze que se resuelve server-side (no se puede
// hornear), igual que Footer y el CTA libre de CONTENIDOS. Reusa
// renderCtaSnippet tal cual para que doc.global.ctaStyle siga siendo UN solo
// control global — cambiar el color de un CTA cambia TODOS, también el de un
// banner. `cta_alineado` es fijo por orientación (hardcodeado en el maestro:
// 'left' en el banner horizontal, 'center' en el vertical) — no es un campo.

export function renderCtaInternoSnippet(fields: CtaInternoFields, doc: EmailDocument, ctx: BannerItemRenderCtx): string {
  return renderCtaSnippet({ ...fields, align: ctx.bannerType === 'horizontal' ? 'left' : 'center' }, doc.global.ctaStyle)
}
