// ============================================================================
// Los 3 helpers que corresponden a generalFields.ts — cada render.ts de módulo
// nuevo los llama al FINAL, sobre el HTML ya armado (shell + área libre de
// moléculas ya insertada), mismo orden que resolveBannerVars/resolveThemeVars
// en components/banner/items/render.ts.
// ============================================================================
import { escapeHtmlAttr } from '../../template/htmlText'
import { elementBounds } from '../../template/htmlEdits'
import { moduleBackgroundVarsForTheme } from '../../themes/themes'
import type { ModuleAlign } from './generalFields'

/**
 * `body_alineado_molecular` / `alineado_molecular_mail_body` viven FUERA de
 * las 12 ramas de tema de head-meta-tags.html (un `{% if %}` propio, líneas
 * 22 y 95-103, verificado directo en el archivo) — por eso esto es una
 * sustitución de STRING PLANA, no algo que pase por resolveThemeVars: esas 2
 * variables nunca van a estar en el mapa que arma themeVars()/resolveGlobalVars(),
 * así que intentar resolverlas por ese camino las dejaría como Liquid crudo en
 * el HTML exportado. Valores tomados literalmente del propio `{% if/elsif %}`
 * del maestro (no inventados): 'center' → '0 auto', 'left' → '0px'.
 */
const ALINEADO_MOLECULAR_MAIL_BODY_FOR_ALIGN: Record<ModuleAlign, string> = {
  left: '0px',
  center: '0 auto',
}

export function substituteModuleAlignVars(html: string, align: ModuleAlign): string {
  return html
    .replaceAll('{{body_alineado_molecular}}', align)
    .replaceAll('{{alineado_molecular_mail_body}}', ALINEADO_MOLECULAR_MAIL_BODY_FOR_ALIGN[align])
}

/**
 * Overrides de tema para el fondo del CONTENEDOR de un módulo — mismo
 * mecanismo que BANNER_BACKGROUND_OFF_VARS en components/banner/render.ts,
 * pero al revés: acá el maestro SÍ trae los 2 valores reales por tema (ver el
 * comentario grande de MODULE_BACKGROUND_VAR_NAMES en themes/themes.ts), así
 * que no hace falta un literal "apagado" inventado — se sirve la variante que
 * corresponda directo del archivo. Se combina con `resolveGlobalVars(doc.global)`
 * en el render de cada módulo (`{ ...resolveGlobalVars(doc.global), ...moduleBackgroundVars(...) }`),
 * mismo patrón que `bannerThemeVars`.
 */
export function moduleBackgroundVars(tema: string, backgroundEnabled: boolean): Record<string, string> {
  const { on, off } = moduleBackgroundVarsForTheme(tema)
  return backgroundEnabled ? on : off
}

/**
 * "por defecto vienen desactivados, SOLO DEALS tienen link activo por
 * defecto" (_contenidos_wrapper.html, citado literal) — el maestro ya trae el
 * `<a href="LINKMODULO">` puesto alrededor de todo el módulo, así que
 * `enabled=false` (el default) es un UNWRAP: se saca la etiqueta `<a>` entera
 * y se conserva su contenido, no se agrega nada. `enabled=true` sustituye el
 * token por el link real, dejando la etiqueta puesta.
 */
export function resolveModuleLink(html: string, linkToken: string, enabled: boolean, link: string, fileName: string): string {
  const tokenIndex = html.indexOf(linkToken)
  if (tokenIndex === -1) {
    throw new Error(`${fileName}: no se encontró "${linkToken}" — revisar resolveModuleLink en components/contentModules/generalRender.ts`)
  }
  if (enabled) {
    return html.slice(0, tokenIndex) + escapeHtmlAttr(link) + html.slice(tokenIndex + linkToken.length)
  }
  const bounds = elementBounds(html, tokenIndex, 'a', fileName)
  const openTagEnd = html.indexOf('>', bounds.start) + 1
  const closeTagStart = bounds.end - '</a>'.length
  return html.slice(0, bounds.start) + html.slice(openTagEnd, closeTagStart) + html.slice(bounds.end)
}
