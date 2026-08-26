// ============================================================================
// Genera el HTML de un bloque BULLET a partir del archivo real
// (02-components/04_content-modules/bullet/modulo_bullet.html, sincronizado).
//
// Este render solo conoce el SHELL (el `<a>`/`<div>` de fondo/link + la
// `<table>` que lo envuelve): a diferencia de components/title/render.ts, acá
// el `<table>` ENTERA (icono + h3 + h4 de fábrica) se descarta — el maestro
// mismo dice "se pueden agregar más moleculas en la celda derecha", así que el
// contenido real sale entero de `fields.items` (por defecto, un solo item
// BULLET_ICONO que reproduce esa misma tabla, sourced de su propio archivo en
// content_moleculas/ — ver moduleItems/render.ts). Las moléculas en sí no se
// recortan acá, este archivo no sabe nada de sus tags internos.
// ============================================================================
import bulletModuleRaw from '../../assets/templates/bullet/modulo_bullet.html?raw'
import type { EmailDocument } from '../../model'
import { elementBounds, indexOfOrThrow, innerBounds } from '../../template/htmlEdits'
import { wrapWithModuleItemMarkers } from '../../template/contentBlocks'
import { resolveThemeVars } from '../../themes/inlineTheme'
import { resolveGlobalVars } from '../../global/vars'
import { getModuleItemDef, type ModuleItemRenderCtx } from '../../bodyMoleculeRegistry'
import { moduleBackgroundVars, resolveModuleLink, substituteModuleAlignVars } from '../contentModules/generalRender'
import type { BulletFields } from './schema'

const FILE_NAME = 'modulo_bullet.html'
const LINK_TOKEN = 'LINKMODULO'
/** Única en el archivo — el `<div>` de fondo que envuelve TODA el área libre
 *  (icono+texto de fábrica incluidos). A diferencia de TITLE, no hay un <td>
 *  intermedio: este <div> es el padre directo de la <table> que se descarta. */
const AREA_DIV_ANCHOR =
  '<div style="display: inline-block; background:{{bg_contenedor1_mail_general}}; border-radius: {{body_container_background_radius}}; overflow: hidden; width: 100%; max-width: 480px;">'

const HTML_COMMENT_RE = /<!--[\s\S]*?-->/g
function stripComments(html: string): string {
  return html.replace(HTML_COMMENT_RE, '')
}

/** Mismo shape que ContentBlockRenderCtx — definido LOCAL para no crear un
 *  ciclo, mismo criterio que TitleRenderCtx. */
export interface BulletRenderCtx {
  blockId: string
}

export function renderBulletSnippet(fields: BulletFields, doc: EmailDocument, ctx: BulletRenderCtx): string {
  const raw = stripComments(bulletModuleRaw)

  const divIndex = indexOfOrThrow(raw, AREA_DIV_ANCHOR, FILE_NAME)
  const divBounds = elementBounds(raw, divIndex + AREA_DIV_ANCHOR.length, 'div', FILE_NAME)
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
  // body_container_background_*, y cualquier {{xxx_mail_general}} que traigan
  // las moléculas insertadas) — mismo motivo que components/title/render.ts.
  const vars = { ...resolveGlobalVars(doc.global), ...moduleBackgroundVars(doc.global.tema, fields.backgroundEnabled) }
  return resolveThemeVars(html, vars)
}
