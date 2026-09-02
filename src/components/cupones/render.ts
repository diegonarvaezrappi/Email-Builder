// ============================================================================
// Genera el HTML de un bloque CUPONES a partir de los 2 archivos reales
// (02-components/04_content-modules/coupons/{cupones-modulo,celda_cupon_titulo}.html,
// sincronizados): el shell trae 2 celdas "cupón" (`role="cupon"`) byte-
// idénticas + una fila de legales compartida; celda_cupon_titulo.html es un
// `<td>` alternativo que se sustituye ENTERO en el lugar de una celda cuando
// esa celda es tipo 'titulo' — a diferencia de COL2's `imageMode` (2 markups
// alternativos EN EL MISMO archivo), acá el reemplazo viene de un archivo
// DISTINTO: mecánicamente da igual, `applyEdits` no le importa de dónde salió
// el `replacement`, solo que los límites (`bounds`) sean los correctos del
// shell original.
//
// Fondo/alineado NO son togglables acá (el maestro lo dice, dos veces) — por
// eso, a diferencia de TITLE/COL1/COL2/LOGOS, este render nunca lee un
// `backgroundEnabled`/`align` de `fields`: llama moduleBackgroundVars(tema,
// true) y substituteModuleAlignVars(html, 'left') con valores FIJOS, mismo
// criterio que el fondo per-celda de components/col3/render.ts.
// ============================================================================
import cuponesModuleRaw from '../../assets/templates/coupons/cupones-modulo.html?raw'
import cuponesTituloCellRaw from '../../assets/templates/coupons/celda_cupon_titulo.html?raw'
import type { EmailDocument } from '../../model'
import {
  applyEdits,
  elementBounds,
  findRepeatedElementBounds,
  indexOfOrThrow,
  innerBounds,
  textRunBounds,
  voidElementBounds,
  type Bounds,
  type Edit,
} from '../../template/htmlEdits'
import { escapeHtmlText, substituteImgSrcOrRemove } from '../../template/htmlText'
import { wrapWithModuleItemMarkers } from '../../template/contentBlocks'
import { resolveThemeVars } from '../../themes/inlineTheme'
import { resolveGlobalVars } from '../../global/vars'
import { getModuleItemDef, type ModuleItemRenderCtx } from '../../bodyMoleculeRegistry'
import type { ModuleItem } from '../../moduleItems/schemas'
import { moduleBackgroundVars, resolveModuleLink, substituteModuleAlignVars } from '../contentModules/generalRender'
import { CUPONES_CELL_AREAS, type CuponCellFields, type CuponesCellFields, type CuponesFields, type TituloCellFields } from './schema'

const MODULE_FILE_NAME = 'cupones-modulo.html'
const TITULO_FILE_NAME = 'celda_cupon_titulo.html'

/** No se puede desactivar en este módulo (ver el comentario grande de
 *  arriba) — un valor fijo, nunca leído de `fields`. */
const CUPONES_FIXED_ALIGN = 'left'

const CUPON_CELL_ROLE_ANCHOR = 'role="cupon"'
const CUPON_IMAGE_URL_PLACEHOLDER = 'https://lh3.googleusercontent.com/d/17zBTLASXQzFtt9NtEP3h0qudKBhcZRMA'
const CUPON_IMAGE_BORDER_RADIUS_RE = /border-radius:\s*[^;]+;\s*/
const CUPON_IMAGE_BORDER_RADIUS = '8px'
const CUPON_FREE_AREA_STYLE_ANCHOR = 'word-break: break-all'
const CUPON_LINK_TOKEN = 'LINKCUPON'
const LEGAL_CLASS_ANCHOR = 'class="legal"'

const TITULO_LINK_TOKEN = 'LINKTITULO'
const TITULO_TAG_ROLE_ANCHOR = 'role="molecula-tag"'
const TITULO_TAG_ICON_PLACEHOLDER = 'https://lh3.googleusercontent.com/d/1wZxPSRbT-maSuZWDyZz99Ewi2A2RH37-'
/** Único dentro de celda_cupon_titulo.html — el otro `<h4>` del archivo usa
 *  "color: {{...}} " con otro espaciado (ver sync-master.mjs). */
const TITULO_HEADING_STYLE_ANCHOR = 'margin:0; text-align: left;'

const HTML_COMMENT_RE = /<!--[\s\S]*?-->/g
function stripComments(html: string): string {
  return html.replace(HTML_COMMENT_RE, '')
}

/** Mismo shape que ContentBlockRenderCtx — definido LOCAL para no crear un
 *  ciclo, mismo criterio que TitleRenderCtx/Col3RenderCtx. */
export interface CuponesRenderCtx {
  blockId: string
}

function renderAreaItems(items: ModuleItem[], areaKey: string, doc: EmailDocument, itemCtx: ModuleItemRenderCtx): string {
  return items
    .filter((item) => item.areaKey === areaKey)
    .map((item) => {
      const def = getModuleItemDef(item.type)
      if (!def) return ''
      return wrapWithModuleItemMarkers(itemCtx.blockId, item.id, def.render(item.fields, doc, itemCtx))
    })
    .filter((html) => html !== '')
    .join('\n')
}

/**
 * Celda "cupón": imagen (blanco = se quita el `<img>` entero, mismo criterio
 * global 2026-08-25) + border-radius toggle (el maestro no trae ninguno) +
 * área libre (sin `role="divcomponentes"` en este archivo, a diferencia de
 * TITLE/COL1/COL3/COL2/LOGOS — se ancla en el estilo distintivo del `<div>`,
 * único DENTRO de la celda ya aislada) + link por celda.
 */
function renderCuponCell(
  cellHtml: string,
  fields: CuponCellFields,
  allItems: ModuleItem[],
  areaKey: string,
  doc: EmailDocument,
  itemCtx: ModuleItemRenderCtx,
): string {
  let html = cellHtml

  const imagePlaceholderIndex = indexOfOrThrow(html, CUPON_IMAGE_URL_PLACEHOLDER, MODULE_FILE_NAME)
  const imgBounds = voidElementBounds(html, imagePlaceholderIndex, 'img', MODULE_FILE_NAME)
  let imgTag = html.slice(imgBounds.start, imgBounds.end).replace(CUPON_IMAGE_BORDER_RADIUS_RE, '')
  if (fields.borderRadiusEnabled) {
    imgTag = imgTag.replace('style="', `style="border-radius: ${CUPON_IMAGE_BORDER_RADIUS}; `)
  }
  html = html.slice(0, imgBounds.start) + imgTag + html.slice(imgBounds.end)
  html = substituteImgSrcOrRemove(html, CUPON_IMAGE_URL_PLACEHOLDER, fields.imageUrl, MODULE_FILE_NAME)

  const areaAnchorIndex = indexOfOrThrow(html, CUPON_FREE_AREA_STYLE_ANCHOR, MODULE_FILE_NAME)
  const divBounds = elementBounds(html, areaAnchorIndex, 'div', MODULE_FILE_NAME)
  const areaBounds = innerBounds(html, divBounds, 'div', MODULE_FILE_NAME)
  const itemsHtml = renderAreaItems(allItems, areaKey, doc, itemCtx)
  html = html.slice(0, areaBounds.start) + itemsHtml + html.slice(areaBounds.end)

  html = resolveModuleLink(html, CUPON_LINK_TOKEN, fields.linkEnabled, fields.link, MODULE_FILE_NAME)
  return html
}

/**
 * Celda "título": sin área libre (ver el comentario grande de schema.ts) —
 * ícono de tag (blanco = se quita el `<div role="molecula-tag">` ENTERO, no
 * solo el `<img>`: no hay texto que lo acompañe) + texto (h1, plano, no
 * removible) + link.
 */
function renderTituloCell(fields: TituloCellFields): string {
  let html = stripComments(cuponesTituloCellRaw)

  if (fields.tagIconUrl.trim() === '') {
    const tagRoleIndex = indexOfOrThrow(html, TITULO_TAG_ROLE_ANCHOR, TITULO_FILE_NAME)
    const tagBounds = elementBounds(html, tagRoleIndex, 'div', TITULO_FILE_NAME)
    html = html.slice(0, tagBounds.start) + html.slice(tagBounds.end)
  } else {
    const tagIconIndex = indexOfOrThrow(html, TITULO_TAG_ICON_PLACEHOLDER, TITULO_FILE_NAME)
    html = html.slice(0, tagIconIndex) + fields.tagIconUrl + html.slice(tagIconIndex + TITULO_TAG_ICON_PLACEHOLDER.length)
  }

  // El maestro trae el texto partido en 2 runs por un `<br>` fijo de ejemplo
  // ("Aca un<br>\n titulo") — `textRunBounds` solo reemplazaría el run
  // DESPUÉS del `<br>`, dejando "Aca un" pegado permanentemente (bug real,
  // encontrado por verificación visual CDP). `innerBounds` reemplaza el
  // contenido ENTERO del `<h1>` (el `<br>` incluido), consistente con que
  // `titleText` es un string plano sin soporte de salto de línea.
  const styleIndex = indexOfOrThrow(html, TITULO_HEADING_STYLE_ANCHOR, TITULO_FILE_NAME)
  const h1Bounds = elementBounds(html, styleIndex, 'h1', TITULO_FILE_NAME)
  const innerTextBounds = innerBounds(html, h1Bounds, 'h1', TITULO_FILE_NAME)
  html = html.slice(0, innerTextBounds.start) + escapeHtmlText(fields.titleText) + html.slice(innerTextBounds.end)

  html = resolveModuleLink(html, TITULO_LINK_TOKEN, fields.linkEnabled, fields.link, TITULO_FILE_NAME)
  return html
}

function renderCell(
  cellHtml: string,
  cellFields: CuponesCellFields,
  areaKey: string,
  allItems: ModuleItem[],
  doc: EmailDocument,
  itemCtx: ModuleItemRenderCtx,
): string {
  return cellFields.type === 'cupon' ? renderCuponCell(cellHtml, cellFields, allItems, areaKey, doc, itemCtx) : renderTituloCell(cellFields)
}

/** Reemplaza el texto de la celda de legales (span `class="legal"`) — vacío
 *  si esta celda no activó el toggle (la fila entera se quita en
 *  `removeLegalRow` si NINGUNA de las 2 lo activó), mismo criterio que
 *  renderLegalCell de components/deals/render.ts. */
function renderLegalCell(cellHtml: string, fields: CuponesCellFields): string {
  const spanIndex = indexOfOrThrow(cellHtml, LEGAL_CLASS_ANCHOR, MODULE_FILE_NAME)
  const spanBounds = elementBounds(cellHtml, spanIndex, 'span', MODULE_FILE_NAME)
  const textBounds = textRunBounds(cellHtml, spanBounds, 'span', MODULE_FILE_NAME)
  const text = fields.legalEnabled ? escapeHtmlText(fields.legalText) : ''
  return cellHtml.slice(0, textBounds.start) + text + cellHtml.slice(textBounds.end)
}

/** Saca la fila de legales entera cuando ninguna de las 2 celdas la activó —
 *  mismo mecanismo que removeLegalRow de components/deals/render.ts. */
function removeLegalRow(html: string): string {
  const cellIndex = indexOfOrThrow(html, LEGAL_CLASS_ANCHOR, MODULE_FILE_NAME)
  const rowStart = html.lastIndexOf('<tr', cellIndex)
  if (rowStart === -1) {
    throw new Error(`${MODULE_FILE_NAME}: no se encontró el <tr> de la fila de legales — revisar components/cupones/render.ts`)
  }
  const rowEnd = indexOfOrThrow(html, '</tr>', MODULE_FILE_NAME, cellIndex) + '</tr>'.length
  return html.slice(0, rowStart) + html.slice(rowEnd)
}

export function renderCuponesSnippet(fields: CuponesFields, doc: EmailDocument, ctx: CuponesRenderCtx): string {
  const raw = stripComments(cuponesModuleRaw)
  const itemCtx: ModuleItemRenderCtx = { blockId: ctx.blockId }

  const cellBounds = findRepeatedElementBounds(raw, CUPON_CELL_ROLE_ANCHOR, 'td', 2, MODULE_FILE_NAME)
  const cellEdits: Edit[] = cellBounds.map((bounds: Bounds, i: number) => ({
    ...bounds,
    replacement: renderCell(raw.slice(bounds.start, bounds.end), fields.cells[i], CUPONES_CELL_AREAS[i], fields.items, doc, itemCtx),
  }))
  let assembled = applyEdits(raw, cellEdits, MODULE_FILE_NAME)

  const showLegal = fields.cells.some((c) => c.legalEnabled)
  if (showLegal) {
    const legalBounds = findRepeatedElementBounds(assembled, LEGAL_CLASS_ANCHOR, 'td', 2, MODULE_FILE_NAME)
    const legalEdits: Edit[] = legalBounds.map((bounds: Bounds, i: number) => ({
      ...bounds,
      replacement: renderLegalCell(assembled.slice(bounds.start, bounds.end), fields.cells[i]),
    }))
    assembled = applyEdits(assembled, legalEdits, MODULE_FILE_NAME)
  } else {
    assembled = removeLegalRow(assembled)
  }

  assembled = substituteModuleAlignVars(assembled, CUPONES_FIXED_ALIGN)

  const vars = { ...resolveGlobalVars(doc.global), ...moduleBackgroundVars(doc.global.tema, true) }
  return resolveThemeVars(assembled, vars)
}
