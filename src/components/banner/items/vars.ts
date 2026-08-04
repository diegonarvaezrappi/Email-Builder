// ============================================================================
// Helpers compartidos por los 10 renders de pieza de banner (items/render.ts).
// ============================================================================

/**
 * Sustituye los `{{banner_*}}` de un archivo real por valores concretos.
 * Nunca toca `{{xxx_mail_general}}` (esos los resuelve components/banner/render.ts
 * al final, con themeVars — ver la nota ahí sobre por qué tiene que ser al
 * final). THROW si el archivo referencia un `banner_*` que no está en el mapa:
 * significa que el repo agregó una variable nueva y el email saldría con un
 * `font-size: ;` roto en silencio — mismo criterio de "fallar ruidoso" que el
 * resto de la app (PLACEHOLDER_IMAGE_URL en cierre/render.ts, los throw de
 * template/assemble.ts).
 */
const BANNER_VAR_RE = /\{\{\s*(banner_[a-z_0-9]+)\s*\}\}/g

export function resolveBannerVars(html: string, vars: Record<string, string>, fileName: string): string {
  return html.replace(BANNER_VAR_RE, (match, name: string) => {
    if (name.endsWith('_mail_general')) return match
    const value = vars[name]
    if (value === undefined) {
      throw new Error(`${fileName}: variable {{${name}}} desconocida — revisar components/banner/items/render.ts`)
    }
    return value
  })
}

/**
 * Reemplazo literal de un placeholder fijo del maestro (una URL de ejemplo,
 * un token de relleno manual), con guardia: si el repo ya no trae ese
 * placeholder exacto, falla ruidoso en vez de dejar pasar el asset viejo del
 * repo (mismo criterio que PLACEHOLDER_IMAGE_URL en components/cierre/render.ts).
 * Reemplazo por FUNCIÓN, nunca por string: varios valores reales traen `$`
 * (ej. el default de PROMO es literalmente '$14.000'), y `String.replace` con
 * un string de reemplazo interpreta `$&`/`$$`/etc. como patrones especiales.
 */
export function substituteOnce(html: string, placeholder: string, value: string, fileName: string): string {
  if (!html.includes(placeholder)) {
    throw new Error(`${fileName}: ya no contiene "${placeholder}" — revisar components/banner/items/render.ts`)
  }
  return html.replace(placeholder, () => value)
}

/** Igual que substituteOnce, pero para un placeholder que el archivo real
 *  repite más de una vez (ej. color_creditos_mail_general aparece 2 veces en
 *  molecula_creditos_*.html: el monto y "DE REINTEGRO") — replaceAll en vez
 *  de replace, misma guardia de "sigue existiendo" y mismo reemplazo por
 *  función para no interpretar `$` del valor como patrón especial. */
export function substituteAll(html: string, placeholder: string, value: string, fileName: string): string {
  if (!html.includes(placeholder)) {
    throw new Error(`${fileName}: ya no contiene "${placeholder}" — revisar components/banner/items/render.ts`)
  }
  return html.replaceAll(placeholder, () => value)
}
