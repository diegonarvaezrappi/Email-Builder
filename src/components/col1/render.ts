// ============================================================================
// Genera el HTML de un bloque COL1 ("1 columna") a partir del archivo real
// (02-components/04_content-modules/1columna/modulo-1columna.html, sincronizado).
//
// 3 piezas, en este orden dentro de `role="contenedorgeneral"`:
// (1) el área libre "arriba" — el `divcomponentes` que el maestro YA trae
//     (se rellena in-place, mismo criterio que el área libre de TITLE/BULLET);
// (2) la imagen — border-radius toggle + URL-en-blanco-elimina-el-<img>, mismo
//     patrón que BENEFICIOS/IMG_AUTOMATICA_*;
// (3) el área libre "abajo" — el maestro NO trae un segundo `divcomponentes`
//     de fábrica (dice literal "se repite una role='divcomponentes'" SI hay
//     contenido ahí), así que esta pieza se CONSTRUYE reusando el mismo
//     literal de apertura del área "arriba" — solo se agrega si hay al menos
//     1 item con areaKey='below', igual que el maestro nunca la muestra vacía.
//
// Se ancla en `role="contenedorgeneral"` (no en el <img>) para insertar el
// área "abajo" justo antes de su cierre: ese anchor sobrevive aunque la
// imagen se elimine entera (URL en blanco), a diferencia de anclar en el
// propio <img>.
// ============================================================================
import col1ModuleRaw from '../../assets/templates/col1/modulo-1columna.html?raw'
import type { EmailDocument } from '../../model'
import { elementBounds, indexOfOrThrow, innerBounds, voidElementBounds } from '../../template/htmlEdits'
import { substituteImgSrcOrRemove } from '../../template/htmlText'
import { wrapWithModuleItemMarkers } from '../../template/contentBlocks'
import { resolveThemeVars } from '../../themes/inlineTheme'
import { resolveGlobalVars } from '../../global/vars'
import { getModuleItemDef, type ModuleItemRenderCtx } from '../../bodyMoleculeRegistry'
import type { ModuleItem } from '../../moduleItems/schemas'
import { moduleBackgroundVars, resolveModuleLink } from '../contentModules/generalRender'
import { COL1_AREA_ABOVE, COL1_AREA_BELOW, type Col1Fields } from './schema'

const FILE_NAME = 'modulo-1columna.html'
const LINK_TOKEN = 'LINKMODULO'
const IMAGE_URL_PLACEHOLDER = 'https://lh3.googleusercontent.com/d/1OEXxNDtUklgU4W8sta2zOzdZ4rZYq7PO'
const IMAGE_BORDER_RADIUS_RE = /border-radius:\s*[^;]+;\s*/
const IMAGE_BORDER_RADIUS = '8px'
/** Única en el archivo — el `<div>` del área libre "arriba", ya presente de
 *  fábrica en el maestro. Se reusa literal (mismo string) para CONSTRUIR el
 *  área "abajo" cuando hace falta — ver el comentario grande de arriba. */
const DIVCOMPONENTES_OPEN = '<div role="divcomponentes" style="display: inline-block; padding: {{body_container_background_padding}};">'
/** Única en el archivo — el contenedor de fondo que envuelve TODO (área
 *  arriba + imagen + área abajo). Ancla estable para insertar el área "abajo"
 *  al final, sobreviva o no la imagen. */
const CONTENEDORGENERAL_OPEN =
  '<div role="contenedorgeneral" style="background:{{bg_contenedor1_mail_general}}; border-radius: {{body_container_background_radius}}; overflow: hidden;">'

const HTML_COMMENT_RE = /<!--[\s\S]*?-->/g
function stripComments(html: string): string {
  return html.replace(HTML_COMMENT_RE, '')
}

/** Mismo shape que ContentBlockRenderCtx — definido LOCAL para no crear un
 *  ciclo, mismo criterio que TitleRenderCtx/BeneficiosRenderCtx. */
export interface Col1RenderCtx {
  blockId: string
}

/** Celda de imagen: mismo 2-pasos que renderBeneficiosImage (radius primero,
 *  aislado; URL/remove al final) — mismo motivo de siempre: con imageUrl en
 *  blanco, substituteImgSrcOrRemove borra el <img> ENTERO. */
function renderCol1Image(raw: string, fields: Col1Fields['image']): string {
  const placeholderIndex = indexOfOrThrow(raw, IMAGE_URL_PLACEHOLDER, FILE_NAME)
  const bounds = voidElementBounds(raw, placeholderIndex, 'img', FILE_NAME)

  let imgTag = raw.slice(bounds.start, bounds.end).replace(IMAGE_BORDER_RADIUS_RE, '')
  if (fields.borderRadiusEnabled) {
    imgTag = imgTag.replace('style="', `style="border-radius: ${IMAGE_BORDER_RADIUS}; `)
  }

  const withRadius = raw.slice(0, bounds.start) + imgTag + raw.slice(bounds.end)
  return substituteImgSrcOrRemove(withRadius, IMAGE_URL_PLACEHOLDER, fields.imageUrl, FILE_NAME)
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

export function renderCol1Snippet(fields: Col1Fields, doc: EmailDocument, ctx: Col1RenderCtx): string {
  let raw = stripComments(col1ModuleRaw)
  const itemCtx: ModuleItemRenderCtx = { blockId: ctx.blockId }

  raw = renderCol1Image(raw, fields.image)

  // Área "arriba": el divcomponentes que el maestro ya trae, in-place.
  const aboveIndex = indexOfOrThrow(raw, DIVCOMPONENTES_OPEN, FILE_NAME)
  const aboveDivBounds = elementBounds(raw, aboveIndex + DIVCOMPONENTES_OPEN.length, 'div', FILE_NAME)
  const aboveAreaBounds = innerBounds(raw, aboveDivBounds, 'div', FILE_NAME)
  const aboveHtml = renderAreaItems(fields.items, COL1_AREA_ABOVE, doc, itemCtx)
  raw = raw.slice(0, aboveAreaBounds.start) + aboveHtml + raw.slice(aboveAreaBounds.end)

  // Área "abajo": SOLO si hay contenido ahí (mismo criterio del maestro — "se
  // repite" el divcomponentes, no se deja uno vacío de fábrica). Se inserta
  // al final de contenedorgeneral, después de la imagen (presente o no).
  const belowHtml = renderAreaItems(fields.items, COL1_AREA_BELOW, doc, itemCtx)
  if (belowHtml !== '') {
    const contGenIndex = indexOfOrThrow(raw, CONTENEDORGENERAL_OPEN, FILE_NAME)
    const contGenBounds = elementBounds(raw, contGenIndex + CONTENEDORGENERAL_OPEN.length, 'div', FILE_NAME)
    const contGenInner = innerBounds(raw, contGenBounds, 'div', FILE_NAME)
    const belowDiv = `\n${DIVCOMPONENTES_OPEN}${belowHtml}</div>`
    raw = raw.slice(0, contGenInner.end) + belowDiv + raw.slice(contGenInner.end)
  }

  let html = resolveModuleLink(raw, LINK_TOKEN, fields.linkEnabled, fields.link, FILE_NAME)
  // Sin substituteModuleAlignVars a propósito: el maestro de este módulo NO
  // trae los tokens body_alineado_molecular/alineado_molecular_mail_body en
  // ningún lado (verificado leyendo el archivo completo) — no hay nada real
  // que sustituir. `fields.align` sigue existiendo (generalModuleFieldsSchema
  // completo, mismo tipo que el resto) pero el toggle se oculta en el panel
  // (ver PropertiesPanel.tsx) para no mostrar un control que no hace nada.

  const vars = { ...resolveGlobalVars(doc.global), ...moduleBackgroundVars(doc.global.tema, fields.backgroundEnabled) }
  return resolveThemeVars(html, vars)
}
