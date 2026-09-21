// ============================================================================
// Marcadores de posición de link en el HTML final — pedido explícito del
// usuario (2026-09-18), y regla del PROPIO maestro, escrita literal como
// comentario en 02-components/04_content-modules/_contenidos_wrapper.html (y
// duplicada en 06-examples/template_maestro_original.html):
//
//   "Si no porporciona un link para el espacio href="", de debe agregar un
//    texto href="LINKMODULO" con el nombre del modulo y numerarlos, esto
//    permitirá que en la implementación encuentren facilmente los espacios de
//    LINK eje, LINKCUPON1, LINNKCUPON2, LINKDEAL1, LINK DEAL 2, LINKCONTENEDOR1..."
//
// Esa regla NO está en ningún `.md` del repo raíz (ni en su CLAUDE.md), y el
// propio maestro no la cumple: `LINKDEAL` aparece 2 veces sin numerar y
// `deeplink_cta = 'AQUIELLINK#'` 6 veces idénticas. Como el repo raíz es
// fuente de la verdad y no se toca, el número se pone acá, sobre el HTML ya
// ensamblado por la app.
//
// ALCANCE DE HOY: banner/HERO, CTA y Deals (los 3 que pidió el usuario). Los
// módulos de body (Título, Bullet, Beneficios, 1/2/3 columnas, Logos,
// Cupones) quedan afuera A PROPÓSITO: con su link apagado —el default que fija
// el maestro, "por defecto vienen desactivados, SOLO DEALS tienen link activo
// por defecto"— la app les saca el `<a>` entero (ver
// components/contentModules/generalRender.ts#resolveModuleLink), así que no
// hay ningún atributo donde poner el marcador sin cambiar ese comportamiento.
// ============================================================================

/**
 * El token que el maestro ya trae en el `<a>` que envuelve todo el HERO — se
 * deja tal cual cuando el usuario no puso link. No se numera: hay UN solo
 * link de HERO por mail (header + banner + imagen full width comparten ese
 * `<a>`, ver CLAUDE.md del repo raíz §1.1).
 */
export const HERO_LINK_PLACEHOLDER = 'AQUIELLINKDELBANNER'

/**
 * El CTA no tiene un `href` propio en lo que la app emite: su `<a>` vive
 * dentro del content block de Braze (`cta-template.html`, `href="{{deeplink_cta}}"`),
 * así que el marcador viaja en el `{% assign deeplink_cta = '...' %}`. El
 * maestro usa `'AQUIELLINK#'` para los 3 CTA de su ejemplo — el mismo literal
 * en todos, que es justamente lo que se viene a resolver acá.
 */
export const CTA_LINK_PLACEHOLDER = 'AQUIELLINKDELCTA'

/** El token que el maestro ya trae en el `<a>` del título de cada tarjeta de
 *  Deal (deal_columnas.html, 2 apariciones idénticas). */
export const DEAL_LINK_PLACEHOLDER = 'LINKDEAL'

/**
 * El link del logo del IMG_FIJA vertical del banner — el token ya viene con
 * el `1` puesto en el maestro (modulo_img_altofijo_vertical.html), y el
 * horizontal directamente no lleva link, así que no entra en la numeración.
 */
export const IMG_FIJA_LOGO_LINK_PLACEHOLDER = 'AQUIELLINKDELOGO1'

/** El marcador del módulo, cuando el usuario no escribió ningún link. */
export function linkOrPlaceholder(link: string, placeholder: string): string {
  return link.trim() === '' ? placeholder : link
}

const CTA_ASSIGN_RE = new RegExp(`deeplink_cta = '${CTA_LINK_PLACEHOLDER}'`, 'g')
const DEAL_HREF_RE = new RegExp(`href="${DEAL_LINK_PLACEHOLDER}"`, 'g')

/**
 * Numera, en orden de aparición, los marcadores que quedaron sin link real.
 *
 * Se hace sobre el HTML COMPLETO y no dentro de cada render porque el número
 * es una propiedad del documento entero, no de la instancia: un render suelto
 * no sabe cuántos CTA/Deals vienen antes que él. "Orden de aparición" es
 * además el orden en que un implementador los va a leer.
 *
 * La coincidencia es por el valor EXACTO del atributo/assign (`href="LINKDEAL"`,
 * nunca `href="https://…LINKDEAL…"`), así que un link real del usuario que
 * contenga el literal no se toca.
 */
export function numberLinkPlaceholders(html: string): string {
  let ctaCount = 0
  let dealCount = 0
  return html
    .replace(CTA_ASSIGN_RE, () => `deeplink_cta = '${CTA_LINK_PLACEHOLDER}${++ctaCount}'`)
    .replace(DEAL_HREF_RE, () => `href="${DEAL_LINK_PLACEHOLDER}${++dealCount}"`)
}
