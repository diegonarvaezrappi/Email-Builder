// ============================================================================
// Genera el HTML de un bloque TITLE a partir del archivo real
// (02-components/04_content-modules/title/modulo-titulo.html, sincronizado).
//
// Este render solo conoce el SHELL (el `<a>`/`<div>` de fondo/link + la
// `<table>` que lo envuelve): el `<div>` interior que en el maestro trae el
// h2/separador/h3 hardcodeados se vacía y se rellena con lo que sea que
// `fields.items` tenga — cualquier molécula del catálogo compartido (ver
// bodyMoleculeRegistry.ts), no solo esas 3. Las moléculas en sí (TITULO_TEXTO/
// SUBTITULO_TEXTO/SEPARADOR_LINEA/...) se recortan de su propio archivo en
// moduleItems/render.ts o components/banner/items/render.ts — este archivo no
// sabe nada de sus tags internos.
// ============================================================================
import titleModuleRaw from '../../assets/templates/title/modulo-titulo.html?raw'
import type { EmailDocument } from '../../model'
import { elementBounds, indexOfOrThrow, innerBounds } from '../../template/htmlEdits'
import { wrapWithModuleItemMarkers } from '../../template/contentBlocks'
import { resolveThemeVars } from '../../themes/inlineTheme'
import { resolveGlobalVars } from '../../global/vars'
import { getModuleItemDef, type ModuleItemRenderCtx } from '../../bodyMoleculeRegistry'
import { moduleBackgroundVars, resolveModuleLink, substituteModuleAlignVars } from '../contentModules/generalRender'
import type { TitleFields } from './schema'

const FILE_NAME = 'modulo-titulo.html'
const LINK_TOKEN = 'LINKMODULO'
/** Única en el archivo — el `<td>` que envuelve el área libre de moléculas. */
const AREA_TD_ANCHOR = '<td height="100%" valign="top" bgcolor="" role="">'

const HTML_COMMENT_RE = /<!--[\s\S]*?-->/g
function stripComments(html: string): string {
  return html.replace(HTML_COMMENT_RE, '')
}

/** Mismo shape que ContentBlockRenderCtx (contentBlockRegistry.ts) — definido
 *  LOCAL en vez de importado para no crear un ciclo (contentBlockRegistry.ts
 *  importa este archivo, no al revés) — mismo criterio que DealsRenderCtx en
 *  components/deals/render.ts. */
export interface TitleRenderCtx {
  blockId: string
}

export function renderTitleSnippet(fields: TitleFields, doc: EmailDocument, ctx: TitleRenderCtx): string {
  const raw = stripComments(titleModuleRaw)

  const tdIndex = indexOfOrThrow(raw, AREA_TD_ANCHOR, FILE_NAME)
  const divBounds = elementBounds(raw, tdIndex + AREA_TD_ANCHOR.length, 'div', FILE_NAME)
  const areaBounds = innerBounds(raw, divBounds, 'div', FILE_NAME)

  const itemCtx: ModuleItemRenderCtx = { blockId: ctx.blockId }
  const itemsHtml = fields.items
    .map((item) => {
      const def = getModuleItemDef(item.type)
      if (!def) return ''
      return wrapWithModuleItemMarkers(ctx.blockId, item.id, def.render(item.fields, doc, itemCtx))
    })
    .filter((html) => html !== '')
    .join('\n')

  let html = raw.slice(0, areaBounds.start) + itemsHtml + raw.slice(areaBounds.end)
  html = resolveModuleLink(html, LINK_TOKEN, fields.linkEnabled, fields.link, FILE_NAME)
  html = substituteModuleAlignVars(html, fields.align)

  // Resolución LOCAL de las {{xxx_mail_general}} que puedan quedar (bg_contenedor1,
  // body_container_background_*, color_texto, color_acento1, y cualquier
  // {{xxx_mail_general}} que traigan las moléculas insertadas) — mismo motivo
  // que components/banner/render.ts y components/deals/render.ts: template/assemble.ts
  // ya corrió inlineTheme() sobre el maestro ANTES de insertar este snippet.
  const vars = { ...resolveGlobalVars(doc.global), ...moduleBackgroundVars(doc.global.tema, fields.backgroundEnabled) }
  return resolveThemeVars(html, vars)
}
