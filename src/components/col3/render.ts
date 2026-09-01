// ============================================================================
// Genera el HTML de un bloque COL3 ("3 columnas") a partir del archivo real
// (02-components/04_content-modules/3columnas/modulo-3-columnas.html, sincronizado).
//
// A diferencia de TODO módulo anterior (una sola pasada de tema/fondo sobre
// el HTML entero), acá el maestro dice literal que el fondo se puede quitar
// "celda por celda" — bg_contenedor1_mail_general/body_container_background_radius
// aparecen 3 VECES (uno por celda), cada una necesitando potencialmente un
// valor DISTINTO según el backgroundEnabled de ESA celda. resolveThemeVars
// resuelve por un único mapa de variables sobre TODO el string que recibe, así
// que no puede servir 2 valores distintos para el mismo nombre de token en una
// sola pasada — por eso acá se corta el archivo en sus 3 `<td>` (por límite
// ESTRUCTURAL, ver más abajo) y cada celda se resuelve por separado ANTES de
// volver a unirlas, cada una con su propio moduleBackgroundVars(...). El
// `align` en cambio SÍ es una única variable de módulo (ver schema.ts) — se
// sustituye una sola vez, al final, sobre el HTML ya reensamblado. Ninguna
// celda deja tokens de tema sin resolver (cada una pasa por resolveThemeVars
// antes de reensamblarse) y el shell exterior (`<table>`/`<tr>`) no trae
// ningún token propio — por eso, a diferencia de TITLE/BENEFICIOS/COL1, NO
// hace falta una pasada final de resolveThemeVars sobre el HTML ya unido.
//
// Las 3 celdas son BYTE-IDÉNTICAS en su `<td>` de apertura (mismo literal
// exacto) pero difieren en detalles internos menores (espacios, la URL de la
// imagen "full", el número de su LINKCELDA) — cortar por ese `<td>` de
// apertura (que aparece 3 veces) y usar elementBounds para hallar el cierre de
// CADA una es la única forma robusta de aislarlas (buscar un literal interno
// cualquiera y asumir "la primera es la celda 1" sería frágil apenas el
// maestro reordene texto). Ver risk #4 del plan: "cut cells by structural
// boundary first".
// ============================================================================
import col3ModuleRaw from '../../assets/templates/col3/modulo-3-columnas.html?raw'
import type { EmailDocument } from '../../model'
import { applyEdits, elementBounds, indexOfOrThrow, innerBounds, voidElementBounds, type Bounds, type Edit } from '../../template/htmlEdits'
import { substituteImgSrcOrRemove } from '../../template/htmlText'
import { wrapWithModuleItemMarkers } from '../../template/contentBlocks'
import { resolveThemeVars } from '../../themes/inlineTheme'
import { resolveGlobalVars } from '../../global/vars'
import { getModuleItemDef, type ModuleItemRenderCtx } from '../../bodyMoleculeRegistry'
import type { ModuleItem } from '../../moduleItems/schemas'
import { moduleBackgroundVars, resolveModuleLink, substituteModuleAlignVars } from '../contentModules/generalRender'
import { COL3_CELL_AREAS, type Col3CellFields, type Col3Fields } from './schema'

const FILE_NAME = 'modulo-3-columnas.html'
/** Único literal, aparece 3 veces (una por celda) — ver el comentario grande de arriba. */
const CELL_TD_OPEN =
  '<td style="padding:0px 0px 0px 0px; line-height:23px; text-align:inherit; " height="100%" valign="top" bgcolor="" role="">'
/** El `href="LINKCELDA..."` real de CADA celda — el maestro trae un typo
 *  conocido (celda 2 repite el token de la celda 1, "LINKCELDA1", en vez de
 *  "LINKCELDA2" — ver risk #4/#6 del plan): en vez de asumir un número fijo
 *  por posición, se busca el token REAL dentro del fragmento YA aislado de
 *  esa celda y se le pasa tal cual a resolveModuleLink — funciona sin cambios
 *  el día que el maestro corrija el typo. sync-master.mjs encierra el estado
 *  actual (LINKCELDA1 × 2, LINKCELDA3 × 1) para que un cambio de forma avise. */
const CELL_LINK_ATTR_RE = /href="(LINKCELDA\d*)"/
const DIVCOMPONENTES_ANCHOR = 'role="divcomponentes"'
/** Las 3 URLs de fábrica de la imagen "full" de cada celda, en orden de
 *  aparición (celda 1, 2, 3) — mismo array que schema.ts, repetido acá porque
 *  ahí describe un DEFAULT de campo y acá ancla un CORTE de HTML: mismo
 *  criterio que el resto de la app (cada archivo declara sus propias
 *  constantes de ancla, no las importa de schema.ts). */
const CELL_IMAGE_URL_PLACEHOLDERS = [
  'https://lh3.googleusercontent.com/d/1GvgYi4hdEYq1b71GrXp-UVfidhkEVeE1?v1',
  'https://lh3.googleusercontent.com/d/1c5vhJ8Hvr-weWRB5n3xKICSbou2mrcxd?v1',
  'https://lh3.googleusercontent.com/d/1Ff8AXjzhjsXyBrUwk4S4A02gjOpAg3a0?v1',
]
const IMAGE_BORDER_RADIUS_RE = /border-radius:\s*[^;]+;\s*/
const IMAGE_BORDER_RADIUS = '8px'

const HTML_COMMENT_RE = /<!--[\s\S]*?-->/g
function stripComments(html: string): string {
  return html.replace(HTML_COMMENT_RE, '')
}

/** Mismo shape que ContentBlockRenderCtx — definido LOCAL para no crear un
 *  ciclo, mismo criterio que TitleRenderCtx/Col1RenderCtx. */
export interface Col3RenderCtx {
  blockId: string
}

/** Los 3 límites (no solapados) de cada `<td>` de celda, en el archivo
 *  pristino — orden de aparición = celda 1, 2, 3 (el maestro no las
 *  reordena). `from` avanza al final de cada celda ya encontrada para que la
 *  búsqueda de la próxima no puede volver a matchear la misma. */
function findCellBounds(raw: string): [Bounds, Bounds, Bounds] {
  const bounds: Bounds[] = []
  let from = 0
  for (let i = 0; i < 3; i++) {
    const tdIndex = indexOfOrThrow(raw, CELL_TD_OPEN, FILE_NAME, from)
    const tdBounds = elementBounds(raw, tdIndex, 'td', FILE_NAME)
    bounds.push(tdBounds)
    from = tdBounds.end
  }
  return bounds as [Bounds, Bounds, Bounds]
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
 * Resuelve UNA celda por completo: imagen "full" → área libre → link → tema
 * (incl. el fondo, con el valor que corresponda a ESTA celda). Las primeras 3
 * son ediciones estructurales (no dependen de resolveThemeVars); el tema se
 * resuelve al FINAL, sobre el fragmento ya armado, para capturar también los
 * tokens que traigan las moléculas recién insertadas — mismo orden que
 * cualquier otro render de módulo, solo que acotado a UNA celda en vez de al
 * documento entero.
 */
function renderCell(
  cellHtml: string,
  cellIndex: number,
  areaKey: string,
  fields: Col3CellFields,
  allItems: ModuleItem[],
  doc: EmailDocument,
  itemCtx: ModuleItemRenderCtx,
): string {
  let html = cellHtml

  // Imagen "full": border-radius (toggle nuevo, el maestro no trae ninguno) +
  // URL/remove — mismo orden de siempre (con imageUrl en blanco,
  // substituteImgSrcOrRemove borra el <img> ENTERO).
  const imagePlaceholder = CELL_IMAGE_URL_PLACEHOLDERS[cellIndex]
  const placeholderIndex = indexOfOrThrow(html, imagePlaceholder, FILE_NAME)
  const imgBounds = voidElementBounds(html, placeholderIndex, 'img', FILE_NAME)
  let imgTag = html.slice(imgBounds.start, imgBounds.end).replace(IMAGE_BORDER_RADIUS_RE, '')
  if (fields.image.borderRadiusEnabled) {
    imgTag = imgTag.replace('style="', `style="border-radius: ${IMAGE_BORDER_RADIUS}; `)
  }
  html = html.slice(0, imgBounds.start) + imgTag + html.slice(imgBounds.end)
  html = substituteImgSrcOrRemove(html, imagePlaceholder, fields.image.imageUrl, FILE_NAME)

  // Área libre de la celda (role="divcomponentes"): se vacía entera y se
  // rellena con lo que fields.items tenga para ESTA areaKey — mismo patrón
  // que components/title/render.ts, un nivel más adentro (por celda, no por
  // módulo entero).
  const divIndex = indexOfOrThrow(html, DIVCOMPONENTES_ANCHOR, FILE_NAME)
  const divBounds = elementBounds(html, divIndex, 'div', FILE_NAME)
  const areaBounds = innerBounds(html, divBounds, 'div', FILE_NAME)
  const itemsHtml = renderAreaItems(allItems, areaKey, doc, itemCtx)
  html = html.slice(0, areaBounds.start) + itemsHtml + html.slice(areaBounds.end)

  // Link: por celda, token DINÁMICO (ver CELL_LINK_ATTR_RE) — no un
  // LINKMODULO único como el resto de los módulos.
  const linkMatch = html.match(CELL_LINK_ATTR_RE)
  if (!linkMatch) {
    throw new Error(`${FILE_NAME}: la celda ${cellIndex + 1} no tiene un href="LINKCELDA..." — revisar renderCol3Snippet`)
  }
  html = resolveModuleLink(html, linkMatch[1], fields.linkEnabled, fields.link, FILE_NAME)

  // Tema — incl. el fondo CON EL VALOR DE ESTA CELDA, resuelto ACÁ (no al
  // final sobre el módulo entero: ver el comentario grande del archivo).
  const vars = { ...resolveGlobalVars(doc.global), ...moduleBackgroundVars(doc.global.tema, fields.backgroundEnabled) }
  return resolveThemeVars(html, vars)
}

export function renderCol3Snippet(fields: Col3Fields, doc: EmailDocument, ctx: Col3RenderCtx): string {
  const raw = stripComments(col3ModuleRaw)
  const itemCtx: ModuleItemRenderCtx = { blockId: ctx.blockId }

  const cellBounds = findCellBounds(raw)
  const edits: Edit[] = cellBounds.map((bounds, i) => ({
    ...bounds,
    replacement: renderCell(raw.slice(bounds.start, bounds.end), i, COL3_CELL_AREAS[i], fields.cells[i], fields.items, doc, itemCtx),
  }))

  const assembled = applyEdits(raw, edits, FILE_NAME)
  return substituteModuleAlignVars(assembled, fields.align)
}
