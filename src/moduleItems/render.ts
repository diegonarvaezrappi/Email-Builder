// ============================================================================
// Los 3 renders NUEVOS de esta fase (TITULO_TEXTO/SUBTITULO_TEXTO/SEPARADOR_LINEA
// — ver moduleItems/schemas.ts sobre por qué los otros 3 tipos del catálogo se
// REUSAN de components/banner/items/render.ts en vez de vivir acá).
//
// TITULO_TEXTO y SUBTITULO_TEXTO cargan modulo-titulo.html directo (mismo
// archivo que components/title/render.ts usa para el SHELL del módulo) y
// recortan su propio fragmento (el `<h2>`/`<h3>`) por ancla literal — el shell
// no sabe nada de estos 2 tags puntuales, solo vacía el `<div>` que los
// contenía y lo rellena con lo que sea que fields.items tenga (ver
// innerBounds en template/htmlEdits.ts). SEPARADOR_LINEA carga su propio
// archivo dedicado (content_moleculas/molecula_separador_s.html) — no hace
// falta recortar nada, se devuelve tal cual sin comentarios.
// ============================================================================
import titleModuleRaw from '../assets/templates/title/modulo-titulo.html?raw'
import separadorLineaRaw from '../assets/templates/content-modules/content_moleculas/molecula_separador_s.html?raw'
import { escapeHtmlText } from '../template/htmlText'
import { elementBounds, indexOfOrThrow, textRunBounds } from '../template/htmlEdits'
import type { SeparadorLineaFields, SubtituloTextoFields, TituloTextoFields } from './schemas'

const TITLE_FILE_NAME = 'modulo-titulo.html'

const HTML_COMMENT_RE = /<!--[\s\S]*?-->/g
function stripComments(html: string): string {
  return html.replace(HTML_COMMENT_RE, '')
}

// --- TITULO_TEXTO --------------------------------------------------------------

const TITULO_TEXTO_LITERAL = '>Titulo<'

export function renderTituloTextoSnippet(fields: TituloTextoFields): string {
  const raw = stripComments(titleModuleRaw)
  const literalIndex = indexOfOrThrow(raw, TITULO_TEXTO_LITERAL, TITLE_FILE_NAME)
  const bounds = elementBounds(raw, literalIndex, 'h2', TITLE_FILE_NAME)
  const template = raw.slice(bounds.start, bounds.end)
  const textBounds = textRunBounds(template, { start: 0, end: template.length }, 'h2', TITLE_FILE_NAME)
  return template.slice(0, textBounds.start) + escapeHtmlText(fields.text) + template.slice(textBounds.end)
}

// --- SUBTITULO_TEXTO -------------------------------------------------------------

const SUBTITULO_TEXTO_LITERAL = 'bloque de texto bloque de texto bloque de texto'

export function renderSubtituloTextoSnippet(fields: SubtituloTextoFields): string {
  const raw = stripComments(titleModuleRaw)
  const literalIndex = indexOfOrThrow(raw, SUBTITULO_TEXTO_LITERAL, TITLE_FILE_NAME)
  const bounds = elementBounds(raw, literalIndex, 'h3', TITLE_FILE_NAME)
  const template = raw.slice(bounds.start, bounds.end)
  const textBounds = textRunBounds(template, { start: 0, end: template.length }, 'h3', TITLE_FILE_NAME)
  return template.slice(0, textBounds.start) + escapeHtmlText(fields.text) + template.slice(textBounds.end)
}

// --- SEPARADOR_LINEA -------------------------------------------------------------
// Sin campos: se devuelve el archivo (sin comentarios) tal cual. Los 2
// `{{...}}` que trae ({{color_acento1_mail_general}}, {{alineado_molecular_mail_body}})
// quedan para la pasada de tema y de alineado del módulo dueño, respectivamente.

export function renderSeparadorLineaSnippet(_fields: SeparadorLineaFields): string {
  return stripComments(separadorLineaRaw)
}
