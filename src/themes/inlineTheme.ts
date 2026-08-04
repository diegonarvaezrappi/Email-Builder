// ============================================================================
// Deja el tema RESUELTO en el HTML: reemplaza cada `{{xxx_mail_general}}` por
// su valor y borra las definiciones Liquid de los temas, para que el HTML que
// se copia/descarga salga limpio (sin el `{% if tema_general_mail_general %}`
// de las 11 ramas ni el `{% assign %}` de entrada).
//
// Solo se toca lo del tema. El resto del Liquid se conserva intacto porque lo
// necesita Braze: `{{content_blocks.${...}}}`, los `${...}` de atributos, y los
// `{% assign %}` / `{% if font_style_look %}` del footer.
//
// Recibe el mapa de variables ya resuelto (lo arma global/vars.ts) en vez del
// nombre del tema: así los ajustes globales que no son del tema — como el
// fondo personalizado — entran por el mismo camino.
// ============================================================================

import { EXTRA_THEME_VAR_NAMES } from './themes'

/**
 * Referencias a variables de tema. El sufijo `_mail_general` es lo que las
 * distingue del resto del Liquid del mail (convención del repo, ver
 * 05-docs/GUIA-DE-TEMAS.md), salvo las excepciones por nombre exacto de
 * EXTRA_THEME_VAR_NAMES (ver themes.ts) — deben resolverse acá con el mismo
 * mapa `vars` o quedarían como Liquid sin resolver en el HTML exportado. Se
 * aceptan espacios internos por si acaso.
 */
const THEME_VAR_RE = new RegExp(`\\{\\{\\s*([a-z_0-9]+_mail_general|${EXTRA_THEME_VAR_NAMES.join('|')})\\s*\\}\\}`, 'g')

/** El `{% assign tema_general_mail_general = '...' %}` de entrada, con su línea. */
const TEMA_ASSIGN_RE = /[ \t]*\{%\s*assign\s+tema_general_mail_general\s*=\s*'[^']*'\s*%\}[ \t]*\r?\n?/g

/**
 * El bloque `{% if tema_general_mail_general == ... %} … {% endif %}`. No
 * codicioso hasta el primer `{% endif %}`: el bloque de temas no anida ifs
 * (head-meta-tags.html tiene exactamente un `{% if %}`), y sync-master
 * valida la forma del archivo en cada corrida.
 */
const THEME_IF_RE = /\{%\s*if\s+tema_general_mail_general\s*==[\s\S]*?\{%\s*endif\s*%\}/g

const HTML_COMMENT_RE = /<!--[\s\S]*?-->/g

/** Sustituye las variables de tema. Lo no definido queda vacío, como en Liquid. */
export function resolveThemeVars(html: string, vars: Record<string, string>): string {
  return html.replace(THEME_VAR_RE, (_match, name: string) => vars[name] ?? '')
}

/**
 * Borra las definiciones de temas. Hoy el bloque de las 11 ramas viene dentro
 * de un comentario HTML (head-meta-tags.html es un `<!-- … -->` completo), así
 * que se elimina el comentario entero; si en algún momento deja de estarlo, el
 * segundo reemplazo saca el `{% if %}` suelto. Los demás comentarios del
 * maestro (HEADER WRAPPER, INICIO SECCION BANNER, …) no se tocan.
 */
export function stripThemeDefinitions(html: string): string {
  return html
    .replace(HTML_COMMENT_RE, (comment) => (/tema_general_mail_general\s*==/.test(comment) ? '' : comment))
    .replace(THEME_IF_RE, '')
    .replace(TEMA_ASSIGN_RE, '')
}

/**
 * Limpia las definiciones de temas y resuelve las variables con los valores
 * dados (ver global/vars.ts).
 *
 * Al final se descarta el espacio en blanco inicial que dejan el assign y el
 * comentario borrados, para que el HTML arranque en su `<!doctype html>`. Solo
 * espacios: si el maestro llegara a tener otro Liquid antes del doctype, se
 * conserva.
 */
export function inlineTheme(html: string, vars: Record<string, string>): string {
  return resolveThemeVars(stripThemeDefinitions(html), vars).replace(/^\s+/, '')
}
