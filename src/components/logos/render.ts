// ============================================================================
// Genera el HTML de un bloque LOGOS a partir de los archivos reales
// (02-components/04_content-modules/logos/{modulo-logos,grilla3logos,
// grilla4logos,grilla6logos}.html, sincronizados).
//
// Mismo mecanismo dual-table que COL2 (ver components/col2/render.ts) para
// el shell (fondo/link/alineado module-wide, área libre byte-idéntica en
// escritorio+mobile, orden de celdas intercambiable) — no se repite ese
// comentario acá. Lo nuevo: la CELDA DE GRILLA del shell viene VACÍA en el
// maestro ("INSERTAR AQUÍ SOLO UNA GRILLA... según la cantidad de logos") —
// el HTML de la grilla vive en un archivo APARTE (grilla3/4/6logos.html), uno
// se elige por `fields.gridSize` y se inserta ENTERO, ya resuelto, en la
// celda vacía de CADA tabla (mismo cálculo-una-vez-inserta-dos-veces que la
// imagen de COL2, pero acá el contenido no preexiste en el shell — se arma
// aparte y se inyecta).
//
// Los 3 archivos de grilla anclan sus celdas de 2 formas distintas (risk #2
// del plan): grilla3/6logos.html traen `role="logoN"` (uno por celda, así que
// se ubican por ese role); grilla4logos.html NO trae ningún `role` — sus 4
// celdas se ubican por POSICIÓN DOCUMENTAL (2 `<th>` primero, 2 `<td>`
// después), ancladas en el placeholder de imagen COMPARTIDO (idéntico en
// las 4). grilla6logos.html además trae un typo real: el `<a>` de la celda
// `role="logo3"` apunta a `AQUIELLINKDELOGO2` (duplica el token de logo2, el
// token `AQUIELLINKDELOGO3` no existe en el archivo) — igual que COL3 con
// LINKCELDA, el link de cada celda se busca por REGEX dentro del fragmento YA
// aislado de esa celda, nunca por el número esperado.
// ============================================================================
import modulosLogosRaw from '../../assets/templates/logos/modulo-logos.html?raw'
import grilla3Raw from '../../assets/templates/logos/grilla3logos.html?raw'
import grilla4Raw from '../../assets/templates/logos/grilla4logos.html?raw'
import grilla6Raw from '../../assets/templates/logos/grilla6logos.html?raw'
import type { EmailDocument } from '../../model'
import {
  applyEdits,
  elementBounds,
  findRepeatedElementBounds,
  indexOfOrThrow,
  innerBounds,
  type Bounds,
  type Edit,
} from '../../template/htmlEdits'
import { cssUrlValue } from '../../global/vars'
import { wrapWithModuleItemMarkers } from '../../template/contentBlocks'
import { resolveThemeVars } from '../../themes/inlineTheme'
import { resolveGlobalVars } from '../../global/vars'
import { getModuleItemDef, type ModuleItemRenderCtx } from '../../bodyMoleculeRegistry'
import type { ModuleItem } from '../../moduleItems/schemas'
import { moduleBackgroundVars, resolveModuleLink, substituteModuleAlignVars } from '../contentModules/generalRender'
import { LOGOS_MAIN_AREA, type LogoFields, type LogosFields, type LogosGridSize } from './schema'

const FILE_NAME = 'modulo-logos.html'
/** sic — typo real del maestro (falta la "O" de "MODULO"). */
const LINK_TOKEN = 'LINKMODULLOGOS'

const HTML_COMMENT_RE = /<!--[\s\S]*?-->/g
function stripComments(html: string): string {
  return html.replace(HTML_COMMENT_RE, '')
}

export interface LogosRenderCtx {
  blockId: string
}

// --- Orden de celdas (texto / grilla) ---------------------------------------
// Idéntico mecanismo que COL2 (ver ese archivo) — anclas propias porque acá
// la celda de grilla NO trae un token compartido entre escritorio/mobile
// (está vacía en el shell).

const TEXT_TD_ANCHOR = 'role="columna-textos"'
const DESKTOP_GRID_TD_ANCHOR = '<td width="60%" style="vertical-align: middle; text-align:center; overflow: hidden; border-radius: 10px; ">'
const MOBILE_GRID_TD_ANCHOR = '<td width="100%" style="vertical-align: middle; text-align:left;  ">'

function swapAdjacent(html: string, first: Bounds, second: Bounds): Edit {
  const between = html.slice(first.end, second.start)
  const firstHtml = html.slice(first.start, first.end)
  const secondHtml = html.slice(second.start, second.end)
  return { start: first.start, end: second.end, replacement: secondHtml + between + firstHtml }
}

function reorderCells(html: string, cellOrder: LogosFields['cellOrder']): string {
  if (cellOrder === 'textoPrimero') return html

  const textTdBounds = findRepeatedElementBounds(html, TEXT_TD_ANCHOR, 'td', 2, FILE_NAME)
  const desktopGridTd = elementBounds(html, indexOfOrThrow(html, DESKTOP_GRID_TD_ANCHOR, FILE_NAME), 'td', FILE_NAME)
  const mobileGridTd = elementBounds(html, indexOfOrThrow(html, MOBILE_GRID_TD_ANCHOR, FILE_NAME), 'td', FILE_NAME)

  const desktopEdit = swapAdjacent(html, textTdBounds[0], desktopGridTd)
  const mobileTextTr = elementBounds(html, textTdBounds[1].start, 'tr', FILE_NAME)
  const mobileGridTr = elementBounds(html, mobileGridTd.start, 'tr', FILE_NAME)
  const mobileEdit = swapAdjacent(html, mobileTextTr, mobileGridTr)

  return applyEdits(html, [desktopEdit, mobileEdit], FILE_NAME)
}

// --- Área libre (h2+separador+h3, byte-idéntica en las 2 tablas) ------------

const FREE_AREA_H2_LITERAL = '>Titulo<'
const FREE_AREA_H3_LITERAL = 'bloque de texto bloque de texto bloque de texto'

function renderAreaItems(items: ModuleItem[], doc: EmailDocument, itemCtx: ModuleItemRenderCtx): string {
  return items
    .filter((item) => item.areaKey === LOGOS_MAIN_AREA)
    .map((item) => {
      const def = getModuleItemDef(item.type)
      if (!def) return ''
      return wrapWithModuleItemMarkers(itemCtx.blockId, item.id, def.render(item.fields, doc, itemCtx))
    })
    .filter((html) => html !== '')
    .join('\n')
}

// --- Grilla de logos (3/4/6, archivo aparte) --------------------------------

const GRID_RAW: Record<LogosGridSize, string> = { '3': grilla3Raw, '4': grilla4Raw, '6': grilla6Raw }
const GRID_FILE_NAME: Record<LogosGridSize, string> = { '3': 'grilla3logos.html', '4': 'grilla4logos.html', '6': 'grilla6logos.html' }
const LOGO_BG_PLACEHOLDER = 'https://lh3.googleusercontent.com/d/1B4hOqqkpKSu2cQHale6dE-hfLX6yfO7O'
const LOGO_LINK_ATTR_RE = /href="(AQUIELLINKDELOGO\d*)"/
const LOGO_BORDER_RADIUS_RE = /border-radius:\s*[^;]+;\s*/
const LOGO_BORDER_RADIUS = '7px'
/** Literal PLANO (no regex — el placeholder ya es una constante conocida, sin
 *  falta de escapar nada) — se aplica sobre un fragmento de UNA sola celda ya
 *  aislada, donde solo puede haber una ocurrencia. */
const LOGO_BG_DECLARATION = `background-image: url(${LOGO_BG_PLACEHOLDER}); background-size: cover; background-position: center center;`

/**
 * Los límites (en orden logo1..logoN) de cada celda de la grilla elegida —
 * ver el comentario grande del archivo sobre por qué grilla4logos.html usa un
 * camino distinto (sin `role`, por posición documental).
 */
function findLogoCellBounds(raw: string, gridSize: LogosGridSize, fileName: string): Bounds[] {
  if (gridSize === '4') {
    // El placeholder de fondo es IDÉNTICO en las 4 celdas — buscar las 2 <th>
    // sobre el archivo ENTERO vería también las 2 <td> más adelante (4
    // ocurrencias reales, no 2) y findRepeatedElementBounds fallaría por
    // "aparece más de lo esperado". Se acota cada búsqueda a su propia región
    // (<thead>/<tbody>, cada una con exactamente 2) y se traducen los límites
    // de vuelta a posiciones absolutas del archivo completo.
    const theadBounds = elementBounds(raw, indexOfOrThrow(raw, '<thead>', fileName), 'thead', fileName)
    const tbodyBounds = elementBounds(raw, indexOfOrThrow(raw, '<tbody>', fileName), 'tbody', fileName)
    const theadHtml = raw.slice(theadBounds.start, theadBounds.end)
    const tbodyHtml = raw.slice(tbodyBounds.start, tbodyBounds.end)
    const thBounds = findRepeatedElementBounds(theadHtml, LOGO_BG_PLACEHOLDER, 'th', 2, fileName).map((b) => ({
      start: b.start + theadBounds.start,
      end: b.end + theadBounds.start,
    }))
    const tdBounds = findRepeatedElementBounds(tbodyHtml, LOGO_BG_PLACEHOLDER, 'td', 2, fileName).map((b) => ({
      start: b.start + tbodyBounds.start,
      end: b.end + tbodyBounds.start,
    }))
    return [...thBounds, ...tdBounds]
  }
  const count = Number(gridSize)
  const bounds: Bounds[] = []
  let from = 0
  for (let i = 1; i <= count; i++) {
    const idx = indexOfOrThrow(raw, `role="logo${i}"`, fileName, from)
    const b = elementBounds(raw, idx, 'td', fileName)
    bounds.push(b)
    from = b.end
  }
  return bounds
}

/** Arma el HTML final de UNA celda de logo: border-radius → fondo (url o
 *  quitar del todo si está en blanco, mismo espíritu que substituteImgSrcOrRemove
 *  pero para `background-image`, no un `<img src>`) → link (token dinámico,
 *  ver el comentario grande del archivo sobre el typo de grilla6). El `<img>`
 *  vacío interno NUNCA se toca — el maestro lo pide explícito ("la imagen
 *  vacía dentro de la celda no se quita ni se modifica"). */
function renderLogoCell(cellHtml: string, fields: LogoFields, borderRadiusEnabled: boolean, fileName: string): string {
  let html = cellHtml.replace(LOGO_BORDER_RADIUS_RE, '')
  if (borderRadiusEnabled) {
    html = html.replace('style="', `style="border-radius: ${LOGO_BORDER_RADIUS}; `)
  }

  html = fields.imageUrl.trim() ? html.replace(LOGO_BG_PLACEHOLDER, cssUrlValue(fields.imageUrl)) : html.replace(LOGO_BG_DECLARATION, '')

  const linkMatch = html.match(LOGO_LINK_ATTR_RE)
  if (!linkMatch) {
    throw new Error(`${fileName}: una celda de logo no tiene un href="AQUIELLINKDELOGO..." — revisar renderLogosSnippet`)
  }
  return resolveModuleLink(html, linkMatch[1], fields.linkEnabled, fields.link, fileName)
}

function renderGrid(fields: LogosFields): string {
  const gridFileName = GRID_FILE_NAME[fields.gridSize]
  const raw = stripComments(GRID_RAW[fields.gridSize])
  const cellBounds = findLogoCellBounds(raw, fields.gridSize, gridFileName)
  const edits: Edit[] = cellBounds.map((bounds, i) => ({
    ...bounds,
    replacement: renderLogoCell(raw.slice(bounds.start, bounds.end), fields.logos[i], fields.logosBorderRadiusEnabled, gridFileName),
  }))
  return applyEdits(raw, edits, gridFileName)
}

export function renderLogosSnippet(fields: LogosFields, doc: EmailDocument, ctx: LogosRenderCtx): string {
  let html = stripComments(modulosLogosRaw)
  html = reorderCells(html, fields.cellOrder)

  const itemCtx: ModuleItemRenderCtx = { blockId: ctx.blockId }
  const itemsHtml = renderAreaItems(fields.items, doc, itemCtx)
  const gridHtml = renderGrid(fields)

  const h2Bounds = findRepeatedElementBounds(html, FREE_AREA_H2_LITERAL, 'h2', 2, FILE_NAME)
  const h3Bounds = findRepeatedElementBounds(html, FREE_AREA_H3_LITERAL, 'h3', 2, FILE_NAME)
  const freeAreaEdits: Edit[] = h2Bounds.map((h2, i) => ({ start: h2.start, end: h3Bounds[i].end, replacement: itemsHtml }))

  // La celda de grilla viene VACÍA en el shell (solo comentarios, ya
  // eliminados) — se reemplaza su contenido interno entero, una vez por
  // tabla, con la MISMA grilla ya resuelta.
  const desktopGridTd = elementBounds(html, indexOfOrThrow(html, DESKTOP_GRID_TD_ANCHOR, FILE_NAME), 'td', FILE_NAME)
  const mobileGridTd = elementBounds(html, indexOfOrThrow(html, MOBILE_GRID_TD_ANCHOR, FILE_NAME), 'td', FILE_NAME)
  const gridEdits: Edit[] = [desktopGridTd, mobileGridTd].map((bounds) => {
    const inner = innerBounds(html, bounds, 'td', FILE_NAME)
    return { ...inner, replacement: gridHtml }
  })

  html = applyEdits(html, [...freeAreaEdits, ...gridEdits], FILE_NAME)
  html = resolveModuleLink(html, LINK_TOKEN, fields.linkEnabled, fields.link, FILE_NAME)
  html = substituteModuleAlignVars(html, fields.align)

  const vars = { ...resolveGlobalVars(doc.global), ...moduleBackgroundVars(doc.global.tema, fields.backgroundEnabled) }
  return resolveThemeVars(html, vars)
}
