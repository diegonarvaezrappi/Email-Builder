// ============================================================================
// Los 10 renders de pieza de banner. Cada uno carga el archivo real
// horizontal/vertical correspondiente (sincronizado por scripts/sync-master.mjs),
// sustituye sus placeholders por los valores del usuario, y devuelve HTML
// limpio de Liquid — salvo CTA_INTERNO, la única excepción documentada (ver
// ese render más abajo).
//
// Los `{{xxx_mail_general}}` de tema que puedan quedar en el HTML devuelto acá
// (bg_descuento, color_descuento, bg_creditos, color_creditos, color_acento1,
// color_acento2, bg_tag_fondo, color_texto, img_overlay_2) se dejan intactos a
// propósito: components/banner/render.ts los resuelve todos de una sola
// pasada al final, mismo precedente que resolveHeaderThemeVars en
// components/header/render.ts. color_acento1/color_texto también pueden
// aparecer inyectados por los modificadores de texto (subtono 1 / color base)
// de TEXTOXL/TEXTOM/TEXTO_COMPLEMENTARIO — ver richText/render.ts.
// ============================================================================
import type { EmailDocument } from '../../../model'
import { escapeHtmlAttr, escapeHtmlText } from '../../../template/htmlText'
import { plainText } from '../../../richText/model'
import { LIQUID_COLOR_TOKENS, renderRichText } from '../../../richText/render'
import { DARK_THEME_SLUGS } from '../../../themes/themes'
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
// BUG DEL MAESTRO (no se puede tocar el archivo — regla de solo lectura): el
// <span> del monto en molecula_creditos_horizontal.html trae `font-siaze` en
// vez de `font-size` (confirmado por diff contra el vertical, que sí lo
// escribe bien) — el navegador descarta esa declaración inline inválida
// entera, y como los `.bnr-xl/.bnr-lg` con !important de template_base.html
// SOLO aplican en el breakpoint mobile (max-width:620px), en escritorio el
// número de CREDITOS pierde su tamaño grande y queda con el font-size por
// defecto — exactamente el "pierde sus estilos" reportado. Se corrige acá
// después de cargar el archivo. THROW si el typo ya no aparece: significaría
// que David lo arregló upstream y este parche quedó muerto, hay que borrarlo.
const CREDITOS_HORIZONTAL_FONT_TYPO = 'font-siaze:'

function fixCreditosHorizontalFontSizeTypo(html: string, fileName: string): string {
  if (!html.includes(CREDITOS_HORIZONTAL_FONT_TYPO)) {
    throw new Error(`${fileName}: ya no contiene el typo "${CREDITOS_HORIZONTAL_FONT_TYPO}" — quitar fixCreditosHorizontalFontSizeTypo en components/banner/items/render.ts`)
  }
  return html.replace(CREDITOS_HORIZONTAL_FONT_TYPO, 'font-size:')
}

export function renderCreditosSnippet(fields: CreditosFields, _doc: EmailDocument, ctx: BannerItemRenderCtx): string {
  const fileName = `molecula_creditos_${ctx.bannerType}.html`
  let raw = stripComments(loadBannerMoleculaFile(fileName))
  if (ctx.bannerType === 'horizontal') raw = fixCreditosHorizontalFontSizeTypo(raw, fileName)
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

// --- TEXTOXL / TEXTOM: color de acento por tema -----------------------------
// El maestro trae `color: {{color_acento2_mail_general}}` fijo en las 2
// moléculas (el naranja de marca casi constante en todos los temas — ver
// memoria project_banner_text_colors_2026-08-03). Pedido explícito: en los 3
// temas oscuros, usar `color_acento1_mail_general` en su lugar (mejor
// contraste sobre esos fondos). Se sustituye el NOMBRE de la variable acá,
// ANTES de la pasada final de tema de components/banner/render.ts — esa
// pasada sigue resolviendo cualquier `_mail_general` que quede, sin tener que
// conocer esta regla. THROW si el literal ya no aparece: el maestro cambió
// esa línea y hay que revisar este parche.
const TEXTOXL_TEXTOM_ACCENT_VAR = '{{color_acento2_mail_general}}'
const TEXTOXL_TEXTOM_DARK_ACCENT_VAR = '{{color_acento1_mail_general}}'

function withDarkThemeAccentOverride(html: string, tema: string, fileName: string): string {
  if (!DARK_THEME_SLUGS.includes(tema)) return html
  return substituteOnce(html, TEXTOXL_TEXTOM_ACCENT_VAR, TEXTOXL_TEXTOM_DARK_ACCENT_VAR, fileName)
}

// --- TEXTOXL -------------------------------------------------------------------

export function renderTextoXlSnippet(fields: TextoXlFields, doc: EmailDocument, ctx: BannerItemRenderCtx): string {
  const fileName = `molecula_textoxl_${ctx.bannerType}.html`
  const raw = withDarkThemeAccentOverride(stripComments(loadBannerMoleculaFile(fileName)), doc.global.tema, fileName)
  const size = liveTextSizing(plainText(fields.text), ctx.bannerType)
  const vars: Record<string, string> = {
    banner_copy_modulo_textoxl: renderRichText(fields.text, LIQUID_COLOR_TOKENS),
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

export function renderTextoMSnippet(fields: TextoMFields, doc: EmailDocument, ctx: BannerItemRenderCtx): string {
  const fileName = `molecula_textom_${ctx.bannerType}.html`
  const raw = withDarkThemeAccentOverride(stripComments(loadBannerMoleculaFile(fileName)), doc.global.tema, fileName)
  return resolveBannerVars(raw, { banner_copy_modulo_textom: renderRichText(fields.text, LIQUID_COLOR_TOKENS) }, fileName)
}

// --- TEXTO_COMPLEMENTARIO ----------------------------------------------------
// Hasta un pull reciente del maestro era un único archivo compartido
// (modulo_texto_complementario.html) con un <h4 style="color: #FFFFFF;">
// hardcodeado — el propio archivo ya avisaba "PENDIENTE: revisar si este
// placeholder sigue haciendo falta ahora que existe
// modulo_texto_complemento_horizontal.html / _vertical.html". Ese pull lo
// reemplazó por el par real: molecula_texto_complementario_horizontal.html /
// _vertical.html, con `<h2 style="color: {{color_texto_mail_general}} ">` —
// ya no hardcodeado, y ahora sí con variante por orientación, igual que
// TEXTOXL/TEXTOM. El placeholder de texto sigue llamándose
// `{{banner_copy_modulo_textom}}` en el archivo real (confirmado por diff —
// copy-paste del molde de TEXTOM al crear este par, no un error de esta app);
// se sustituye tal cual, sin renombrarlo, porque cada archivo se resuelve por
// separado y no hay colisión real con la pieza TEXTOM.

export function renderTextoComplementarioSnippet(fields: TextoComplementarioFields, _doc: EmailDocument, ctx: BannerItemRenderCtx): string {
  const fileName = `molecula_texto_complementario_${ctx.bannerType}.html`
  const raw = stripComments(loadBannerMoleculaFile(fileName))
  return resolveBannerVars(raw, { banner_copy_modulo_textom: renderRichText(fields.text, LIQUID_COLOR_TOKENS) }, fileName)
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
