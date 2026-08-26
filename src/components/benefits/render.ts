// ============================================================================
// Genera el HTML de un bloque BENEFICIOS a partir del archivo real
// (02-components/04_content-modules/benefits/modulo-beneficios.html, sincronizado).
//
// A diferencia de TITLE/BULLET (una sola pasada, todo el contenido es área
// libre), acá hay 2 pasos: (1) la celda 1 (imagen fija, `fields.image`) se
// edita in-place — border-radius + URL, mismo patrón que
// IMG_AUTOMATICA_MOLECULA/MODULO en components/banner/items/render.ts — y (2)
// la celda 2 (`role="celda2"`) se vacía entera y se rellena con `fields.items`,
// mismo patrón que el área libre de components/title/render.ts. El icono+h5
// vacío+h3+h4 de fábrica de la celda 2 se descartan enteros (nadie los lee):
// el área libre por defecto trae sus propios items (ver schema.ts).
// ============================================================================
import beneficiosModuleRaw from '../../assets/templates/benefits/modulo-beneficios.html?raw'
import type { EmailDocument } from '../../model'
import { elementBounds, indexOfOrThrow, innerBounds, voidElementBounds } from '../../template/htmlEdits'
import { substituteImgSrcOrRemove } from '../../template/htmlText'
import { wrapWithModuleItemMarkers } from '../../template/contentBlocks'
import { resolveThemeVars } from '../../themes/inlineTheme'
import { resolveGlobalVars } from '../../global/vars'
import { getModuleItemDef, type ModuleItemRenderCtx } from '../../bodyMoleculeRegistry'
import { moduleBackgroundVars, resolveModuleLink, substituteModuleAlignVars } from '../contentModules/generalRender'
import type { BeneficiosFields } from './schema'

const FILE_NAME = 'modulo-beneficios.html'
const LINK_TOKEN = 'LINKMODULO'
const IMAGE_URL_PLACEHOLDER = 'https://lh3.googleusercontent.com/d/1K55fPu7buJT65XOj9VqaplZD2J4WTaTb'
/** Único en el archivo — el `<td role="celda2">` que envuelve el área libre. */
const CELDA2_ANCHOR = 'role="celda2"'
const IMAGE_BORDER_RADIUS_RE = /border-radius:\s*[^;]+;\s*/
const IMAGE_BORDER_RADIUS = '8px'

const HTML_COMMENT_RE = /<!--[\s\S]*?-->/g
function stripComments(html: string): string {
  return html.replace(HTML_COMMENT_RE, '')
}

/** Mismo shape que ContentBlockRenderCtx — definido LOCAL para no crear un
 *  ciclo, mismo criterio que TitleRenderCtx. */
export interface BeneficiosRenderCtx {
  blockId: string
}

/** Celda 1: reescribe el border-radius del `<img role="imagen-auto">` (regex
 *  ACOTADO al fragmento ya aislado del propio <img>, mismo criterio que ICONO
 *  en moduleItems/render.ts) y por último la URL — en ese orden, mismo motivo
 *  de siempre: con imageUrl en blanco, substituteImgSrcOrRemove borra el <img>
 *  ENTERO. */
function renderBeneficiosImage(raw: string, fields: BeneficiosFields['image']): string {
  const placeholderIndex = indexOfOrThrow(raw, IMAGE_URL_PLACEHOLDER, FILE_NAME)
  const bounds = voidElementBounds(raw, placeholderIndex, 'img', FILE_NAME)

  let imgTag = raw.slice(bounds.start, bounds.end).replace(IMAGE_BORDER_RADIUS_RE, '')
  if (fields.borderRadiusEnabled) {
    imgTag = imgTag.replace('style="', `style="border-radius: ${IMAGE_BORDER_RADIUS}; `)
  }

  const withRadius = raw.slice(0, bounds.start) + imgTag + raw.slice(bounds.end)
  return substituteImgSrcOrRemove(withRadius, IMAGE_URL_PLACEHOLDER, fields.imageUrl, FILE_NAME)
}

export function renderBeneficiosSnippet(fields: BeneficiosFields, doc: EmailDocument, ctx: BeneficiosRenderCtx): string {
  let raw = stripComments(beneficiosModuleRaw)
  raw = renderBeneficiosImage(raw, fields.image)

  const celda2Index = indexOfOrThrow(raw, CELDA2_ANCHOR, FILE_NAME)
  const tdBounds = elementBounds(raw, celda2Index, 'td', FILE_NAME)
  const areaBounds = innerBounds(raw, tdBounds, 'td', FILE_NAME)

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
  // body_container_background_*, img_fondo_especial, color_texto, y cualquier
  // {{xxx_mail_general}} que traigan las moléculas insertadas) — mismo motivo
  // que components/title/render.ts.
  const vars = { ...resolveGlobalVars(doc.global), ...moduleBackgroundVars(doc.global.tema, fields.backgroundEnabled) }
  return resolveThemeVars(html, vars)
}
