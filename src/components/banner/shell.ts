// ============================================================================
// Extrae los 2 puntos de inserción del banner ("shell") a partir de los
// archivos reales big-banner-horizontal/vertical.html — sin tocar el repo
// read-only ni escribir marcadores propios en disco: se inyectan 2 marcadores
// SOLO sobre la copia en memoria del archivo sincronizado, anclados a texto
// real del maestro. Mismo mecanismo que usa template/assemble.ts para
// HEADER WRAPPER / WRAPPER DE CONTENIDOS, y components/header/render.ts para
// COBRANDING_ANCHOR.
//
// Cada big-banner-*.html trae, en este orden: apertura (<a>, <table
// id="BANNER_HORIZONTAL|VERTICAL">, el <td> con el fondo/tono del banner),
// LUEGO la tabla "MODULO MOLECULAS" (el único punto donde el maestro agrupa
// piezas), LUEGO comentarios de los demás módulos (imagen, tags — sin markup
// real, son solo placeholders documentales) y el cierre (</div></td></tr>...).
//
// components/banner/render.ts reemplaza TODA la zona entre la apertura y el
// cierre (ITEMS_MARKER) con el HTML de las piezas reales del banner — así que
// los comentarios "MODULO PARA IMG"/"MODULO TAGS" del archivo original se
// descartan a propósito: nuestro propio groupBannerItems ya coloca ahí el
// HTML real de TAGS/IMG_FIJA/etc. cuando el usuario los agrega.
// ============================================================================
import horizontalRaw from '../../assets/templates/banners/big-banner-horizontal.html?raw'
import verticalRaw from '../../assets/templates/banners/big-banner-vertical.html?raw'
import type { BannerType } from './schema'

/** Marcadores propios de la app — nunca llegan al output final (se
 *  reemplazan siempre dentro de renderBannerSnippet). */
export const ITEMS_MARKER = '<!--__BANNER_ITEMS__-->'
export const MOLECULAS_MARKER = '<!--__BANNER_MOLECULAS__-->'

/** Aparece exactamente 1 vez en cada big-banner-*.html (validado también por
 *  scripts/sync-master.mjs antes de sincronizar). Prefijo, no el comentario
 *  completo: el texto tras los ":" difiere entre horizontal y vertical. */
const MOLECULAS_ANCHOR = '<!-- MODULO MOLECULAS'
/** Cierre de la celda de fondo/tono del banner — ambos archivos terminan su
 *  zona de módulos con este literal exacto justo antes de cerrar <tr>/<table>/<a>. */
const CONTENT_DIV_CLOSE = '</div></td>'

const HTML_COMMENT_RE = /<!--[\s\S]*?-->/g

/** Borra comentarios de autor del maestro, preservando los 2 marcadores propios. */
function stripComments(html: string): string {
  return html.replace(HTML_COMMENT_RE, (comment) => (comment === ITEMS_MARKER || comment === MOLECULAS_MARKER ? comment : ''))
}

export interface BannerShell {
  /** El big-banner completo, con toda la zona de piezas colapsada en ITEMS_MARKER. */
  shell: string
  /** La tabla "MODULO MOLECULAS" completa, con el interior de su <td> colapsado en MOLECULAS_MARKER. */
  moleculeTable: string
}

function extractShell(raw: string, fileName: string): BannerShell {
  const anchorIndex = raw.indexOf(MOLECULAS_ANCHOR)
  if (anchorIndex === -1 || raw.indexOf(MOLECULAS_ANCHOR, anchorIndex + 1) !== -1) {
    throw new Error(`${fileName}: se esperaba exactamente 1 aparición de "${MOLECULAS_ANCHOR}" — revisar components/banner/shell.ts`)
  }

  const tableStart = raw.indexOf('<table', anchorIndex)
  const tableEndTagIndex = raw.indexOf('</table>', tableStart)
  if (tableStart === -1 || tableEndTagIndex === -1) {
    throw new Error(`${fileName}: no se encontró la tabla de "MODULO MOLECULAS" — revisar components/banner/shell.ts`)
  }
  const tableEnd = tableEndTagIndex + '</table>'.length
  const table = raw.slice(tableStart, tableEnd)

  if (table.split('<table').length - 1 !== 1 || table.split('<td').length - 1 !== 1) {
    throw new Error(`${fileName}: la tabla de "MODULO MOLECULAS" ya no tiene exactamente 1 <table>/1 <td> — revisar components/banner/shell.ts`)
  }

  const closeIndex = raw.indexOf(CONTENT_DIV_CLOSE, tableEnd)
  if (closeIndex === -1) {
    throw new Error(`${fileName}: no se encontró "${CONTENT_DIV_CLOSE}" después de la tabla de moléculas — revisar components/banner/shell.ts`)
  }
  const after = raw.slice(closeIndex)

  // El interior del <td> de la tabla de moléculas (hoy solo comentarios
  // "MOLECULA PROMOS / CREDITOS / …" del maestro) se colapsa: ahí van
  // nuestras piezas reales.
  const tdStart = table.indexOf('<td')
  const tdOpenEnd = table.indexOf('>', tdStart) + 1
  const tdClose = table.indexOf('</td>', tdOpenEnd)
  if (tdStart === -1 || tdOpenEnd === 0 || tdClose === -1) {
    throw new Error(`${fileName}: no se pudo delimitar el <td> de la tabla de moléculas — revisar components/banner/shell.ts`)
  }

  return {
    shell: stripComments(raw.slice(0, anchorIndex)) + ITEMS_MARKER + stripComments(after),
    moleculeTable: stripComments(table.slice(0, tdOpenEnd)) + MOLECULAS_MARKER + stripComments(table.slice(tdClose)),
  }
}

const RAW_BY_TYPE: Record<BannerType, { raw: string; fileName: string }> = {
  horizontal: { raw: horizontalRaw, fileName: 'big-banner-horizontal.html' },
  vertical: { raw: verticalRaw, fileName: 'big-banner-vertical.html' },
}

const cache = new Map<BannerType, BannerShell>()

/** Perezoso + memoizado: si el repo cambió de forma, el throw sale recién al
 *  renderizar (lo captura renderEmailPreview y lo muestra en el Viewport), no
 *  al importar el módulo (pantalla en blanco). */
export function bannerShell(bannerType: BannerType): BannerShell {
  const cached = cache.get(bannerType)
  if (cached) return cached
  const { raw, fileName } = RAW_BY_TYPE[bannerType]
  const shell = extractShell(raw, fileName)
  cache.set(bannerType, shell)
  return shell
}
