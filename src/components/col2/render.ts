// ============================================================================
// Genera el HTML de un bloque COL2 ("2 columnas") a partir del archivo real
// (02-components/04_content-modules/2columnas/modulo-2-columnas.html, sincronizado).
//
// Primer módulo "dual-table": el maestro trae 2 tablas completas — una para
// escritorio (`class="mobile_hide"`) y una para mobile (`class="desktop_hide"`,
// oculta por CSS, no por JS) — y dice explícito "se debe replicar la tabla en
// su versión escritorio y mobile, todos los modificadores se deben aplicar a
// AMBOS formatos". Verificado línea por línea: el área libre (h2+separador+h3)
// y las 2 divs alternativas de imagen son BYTE-IDÉNTICAS entre ambas tablas
// (solo cambia el `<td>`/`<div>` que las envuelve — la mobile no envuelve el
// área libre en un `<div>` extra, la escritorio sí) — por eso el render NO
// necesita tratar desktop/mobile como 2 templates distintos: encuentra las 2
// ocurrencias de cada fragmento variable (`findRepeatedElementBounds`, ver
// template/htmlEdits.ts — la generalización de deals' `spliceRow` que pide el
// plan de fase 6) y les aplica el MISMO contenido calculado una sola vez.
//
// A diferencia de COL3 (fondo/click/alineado por CELDA), acá TODO lo general
// (fondo del contenedor, click, alineado) es una única variable de módulo —
// el `<a>`/`<div>` de fondo envuelve LAS 2 TABLAS ENTERAS, confirmado por
// conteo de anclas (LINKMODULOCOULUMNAS/bg_contenedor1_mail_general aparecen
// 1 sola vez en TODO el archivo, no 2) — por eso este módulo SÍ spreadea
// generalModuleFieldsSchema completo (`hasGeneralModuleFields: true`).
// ============================================================================
import col2ModuleRaw from '../../assets/templates/col2/modulo-2-columnas.html?raw'
import type { EmailDocument } from '../../model'
import {
  applyEdits,
  elementBounds,
  findRepeatedElementBounds,
  voidElementBounds,
  type Bounds,
  type Edit,
} from '../../template/htmlEdits'
import { substituteImgSrcOrRemove } from '../../template/htmlText'
import { wrapWithModuleItemMarkers } from '../../template/contentBlocks'
import { resolveThemeVars } from '../../themes/inlineTheme'
import { resolveGlobalVars } from '../../global/vars'
import { getModuleItemDef, type ModuleItemRenderCtx } from '../../bodyMoleculeRegistry'
import type { ModuleItem } from '../../moduleItems/schemas'
import { moduleBackgroundVars, resolveModuleLink, substituteModuleAlignVars } from '../contentModules/generalRender'
import { COL2_MAIN_AREA, type Col2Fields, type Col2ImageFields } from './schema'

const FILE_NAME = 'modulo-2-columnas.html'
/** sic — typo real del maestro ("COULUMNAS", no "COLUMNAS"), anclado tal cual. */
const LINK_TOKEN = 'LINKMODULOCOULUMNAS'

const HTML_COMMENT_RE = /<!--[\s\S]*?-->/g
function stripComments(html: string): string {
  return html.replace(HTML_COMMENT_RE, '')
}

/** Mismo shape que ContentBlockRenderCtx — definido LOCAL para no crear un
 *  ciclo, mismo criterio que TitleRenderCtx/Col3RenderCtx. */
export interface Col2RenderCtx {
  blockId: string
}

// --- Orden de celdas (texto / imagen) ---------------------------------------
// Escritorio: 2 <td> hermanos dentro de UN <tr> — se intercambian los 2 <td>.
// Mobile: cada celda vive en su PROPIO <tr> — se intercambian los 2 <tr>.
// "textoPrimero" (el default, orden literal del maestro) no toca nada.

const TEXT_TD_ANCHOR = 'role="columna-textos"'
/** Común a las 2 celdas de imagen (escritorio y mobile) pese a que el resto
 *  del `style` alrededor difiere levemente entre ambas. */
const IMAGE_TD_ANCHOR = 'background-image: url({{img_overlay_2_mail_general}})'

/** `first` SIEMPRE aparece antes que `second` en el archivo (orden literal
 *  del maestro) — se intercambia su contenido preservando lo que hay en medio. */
function swapAdjacent(html: string, first: Bounds, second: Bounds): Edit {
  const between = html.slice(first.end, second.start)
  const firstHtml = html.slice(first.start, first.end)
  const secondHtml = html.slice(second.start, second.end)
  return { start: first.start, end: second.end, replacement: secondHtml + between + firstHtml }
}

function reorderCells(html: string, cellOrder: Col2Fields['cellOrder']): string {
  if (cellOrder === 'textoPrimero') return html

  const textTdBounds = findRepeatedElementBounds(html, TEXT_TD_ANCHOR, 'td', 2, FILE_NAME)
  const imageTdBounds = findRepeatedElementBounds(html, IMAGE_TD_ANCHOR, 'td', 2, FILE_NAME)

  // Escritorio (ocurrencia 0): los 2 <td> son hermanos directos — se
  // intercambian ellos mismos.
  const desktopEdit = swapAdjacent(html, textTdBounds[0], imageTdBounds[0])
  // Mobile (ocurrencia 1): cada <td> vive en su propio <tr> — se intercambian
  // esos 2 <tr> enteros, no los <td> sueltos.
  const mobileTextTr = elementBounds(html, textTdBounds[1].start, 'tr', FILE_NAME)
  const mobileImageTr = elementBounds(html, imageTdBounds[1].start, 'tr', FILE_NAME)
  const mobileEdit = swapAdjacent(html, mobileTextTr, mobileImageTr)

  return applyEdits(html, [desktopEdit, mobileEdit], FILE_NAME)
}

// --- Área libre (h2+separador+h3, byte-idéntica en las 2 tablas) ------------

const FREE_AREA_H2_LITERAL = '>Titulo<'
const FREE_AREA_H3_LITERAL = 'bloque de texto bloque de texto bloque de texto'

function renderAreaItems(items: ModuleItem[], doc: EmailDocument, itemCtx: ModuleItemRenderCtx): string {
  return items
    .filter((item) => item.areaKey === COL2_MAIN_AREA)
    .map((item) => {
      const def = getModuleItemDef(item.type)
      if (!def) return ''
      return wrapWithModuleItemMarkers(itemCtx.blockId, item.id, def.render(item.fields, doc, itemCtx))
    })
    .filter((html) => html !== '')
    .join('\n')
}

// --- Celda de imagen: 2 markups alternativos (risk #3 del plan) ------------

const IMAGE_URL_PLACEHOLDER: Record<Col2ImageFields['mode'], string> = {
  full: 'https://lh3.googleusercontent.com/d/1Xs3HucYUDlfipuPnegf5ZXO3w2Z5m28u',
  modificable: 'https://lh3.googleusercontent.com/d/14VKG5CPVNPIVbOQYkyHgtxfW1uLorjXP',
}
const IMAGE_BORDER_RADIUS_RE = /border-radius:\s*[^;]+;\s*/
const IMAGE_BORDER_RADIUS = '12px'
/** `body_img_modulo_auto_ancho` es una variable EJEMPLO fuera de las 11 ramas
 *  de tema (mismo caso que body_alineado_molecular, ver schema.ts) — se
 *  sustituye por string plano, no vía el mapa de temas. Solo vive dentro del
 *  markup "ancho modificable", nunca en "full". */
const WIDTH_TOKEN = '{{body_img_modulo_auto_ancho}}'

/** Arma el HTML final de la variante de imagen ELEGIDA (a partir de su propia
 *  plantilla, ya aislada) — radius primero (acotado al `<img>`), ancho
 *  después (solo aplica/no-op si el token no está presente), URL/remove al
 *  final (mismo orden de siempre: con imageUrl en blanco, substituteImgSrcOrRemove
 *  borra el `<img>` ENTERO). */
function renderKeptImageVariant(template: string, fields: Col2ImageFields): string {
  const placeholder = IMAGE_URL_PLACEHOLDER[fields.mode]
  const imgBounds = voidElementBounds(template, template.indexOf(placeholder), 'img', FILE_NAME)
  let imgTag = template.slice(imgBounds.start, imgBounds.end).replace(IMAGE_BORDER_RADIUS_RE, '')
  if (fields.borderRadiusEnabled) {
    imgTag = imgTag.replace('style="', `style="border-radius: ${IMAGE_BORDER_RADIUS}; `)
  }
  let html = template.slice(0, imgBounds.start) + imgTag + template.slice(imgBounds.end)
  html = html.replaceAll(WIDTH_TOKEN, fields.widthPercent)
  return substituteImgSrcOrRemove(html, placeholder, fields.imageUrl, FILE_NAME)
}

/** "Se puede quitar el fondo de la imagen de forma independiente" — a
 *  diferencia del fondo general (bg_contenedor1_mail_general, que SÍ trae una
 *  variante "sin fondo" por tema vía moduleBackgroundVars), `img_overlay_2_mail_general`
 *  no tiene ninguna variante "sin fondo" en el maestro (un solo `{% assign %}`
 *  por rama) — "apagado" acá es simplemente no pintar la propiedad CSS en
 *  absoluto, no un valor de tema alternativo. */
const IMAGE_BG_STYLE_RE = /background-image: url\(\{\{img_overlay_2_mail_general\}\}\); background-size: cover; background-position: center center;\s*/g

function stripImageBackgroundIfDisabled(html: string, enabled: boolean): string {
  return enabled ? html : html.replace(IMAGE_BG_STYLE_RE, '')
}

export function renderCol2Snippet(fields: Col2Fields, doc: EmailDocument, ctx: Col2RenderCtx): string {
  let html = stripComments(col2ModuleRaw)
  html = reorderCells(html, fields.cellOrder)

  const itemCtx: ModuleItemRenderCtx = { blockId: ctx.blockId }
  const itemsHtml = renderAreaItems(fields.items, doc, itemCtx)

  const h2Bounds = findRepeatedElementBounds(html, FREE_AREA_H2_LITERAL, 'h2', 2, FILE_NAME)
  const h3Bounds = findRepeatedElementBounds(html, FREE_AREA_H3_LITERAL, 'h3', 2, FILE_NAME)
  const freeAreaEdits: Edit[] = h2Bounds.map((h2, i) => ({ start: h2.start, end: h3Bounds[i].end, replacement: itemsHtml }))

  const fullBounds = findRepeatedElementBounds(html, IMAGE_URL_PLACEHOLDER.full, 'div', 2, FILE_NAME)
  const modBounds = findRepeatedElementBounds(html, IMAGE_URL_PLACEHOLDER.modificable, 'div', 2, FILE_NAME)
  const [keptBounds, droppedBounds] = fields.image.mode === 'full' ? [fullBounds, modBounds] : [modBounds, fullBounds]
  const keptTemplate = html.slice(keptBounds[0].start, keptBounds[0].end)
  const keptHtml = renderKeptImageVariant(keptTemplate, fields.image)
  const imageEdits: Edit[] = [
    ...keptBounds.map((b) => ({ ...b, replacement: keptHtml })),
    ...droppedBounds.map((b) => ({ ...b, replacement: '' })),
  ]

  html = applyEdits(html, [...freeAreaEdits, ...imageEdits], FILE_NAME)
  html = resolveModuleLink(html, LINK_TOKEN, fields.linkEnabled, fields.link, FILE_NAME)
  html = substituteModuleAlignVars(html, fields.align)
  html = stripImageBackgroundIfDisabled(html, fields.imageBackgroundEnabled)

  // Resolución LOCAL de las {{xxx_mail_general}} que puedan quedar — mismo
  // motivo que components/title/render.ts. `img_overlay_2_mail_general` no
  // necesita entrar a EXTRA_THEME_VAR_NAMES: termina en `_mail_general` y no
  // trae variante Sinfondo, así que ya lo captura el mecanismo genérico.
  const vars = { ...resolveGlobalVars(doc.global), ...moduleBackgroundVars(doc.global.tema, fields.backgroundEnabled) }
  return resolveThemeVars(html, vars)
}
