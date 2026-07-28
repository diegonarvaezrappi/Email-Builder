// ============================================================================
// Las variables `*_mail_general` con las que se hornea el email: las del tema
// elegido, más las que el usuario fija desde los ajustes globales.
//
// Es el único lugar que arma ese mapa, para que el HTML exportado
// (template/assemble.ts) y el preview (preview/liquidPreview.ts) no se puedan
// desincronizar.
// ============================================================================
import { themeVars } from '../themes/themes'
import type { GlobalFields } from './schema'

/** Caracteres que romperían el `url(...)` donde se inyecta el fondo. */
const CSS_URL_ESCAPES: Record<string, string> = {
  '(': '%28',
  ')': '%29',
  '"': '%22',
  "'": '%27',
  '\\': '%5C',
}

/**
 * Deja un valor seguro para meter dentro de `background-image: url(...)`.
 * Sin comillas alrededor, un `)` cerraría el paréntesis antes de tiempo y lo
 * que siguiera se leería como CSS suelto; los espacios lo partirían en dos.
 * No valida que sea una URL a propósito: el campo también admite Liquid.
 */
export function cssUrlValue(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  return trimmed.replace(/[()"'\\\s]/g, (c) => CSS_URL_ESCAPES[c] ?? encodeURIComponent(c))
}

/**
 * Mapa completo de variables de tema, con los ajustes globales encima.
 * Lo que quede sin definir resuelve a vacío (igual que en Liquid), así que un
 * fondo vacío se comporta exactamente como hasta ahora.
 */
export function resolveGlobalVars(global: GlobalFields): Record<string, string> {
  const vars = { ...themeVars(global.tema) }
  const fondo = cssUrlValue(global.fondoUrl)
  if (fondo) vars.bg_imgevento_mail_general = fondo
  return vars
}
