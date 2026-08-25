// ============================================================================
// Escapado de HTML para texto/atributos de usuario.
//
// Hasta el componente Banner, ningún slot inyectaba texto libre directo en un
// nodo HTML o atributo: CTA/Footer arman literales de Liquid (toLiquidStringLiteral,
// liquidText.ts) que Braze interpola en tiempo de envío. Banner es real HTML
// horneado por la app (como Header/Cierre) con texto de usuario pegado
// directo en <h4>/<span> y en atributos href — sin escapar, un tag con "<" o
// un link con `"` rompería el HTML exportado.
//
// A propósito NO se escapan `{{` / `}}`: el texto libre puede llevar
// personalización de Braze (mismo criterio que global.fondoUrl, que también
// acepta Liquid crudo — ver global/schema.ts).
// ============================================================================

const HTML_TEXT_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
}

const HTML_ATTR_ESCAPES: Record<string, string> = {
  ...HTML_TEXT_ESCAPES,
  '"': '&quot;',
  "'": '&#39;',
}

/** Para texto que cae dentro de un nodo HTML (ej. el label de un tag, un <h4>). */
export function escapeHtmlText(value: string): string {
  return value.replace(/[&<>]/g, (c) => HTML_TEXT_ESCAPES[c])
}

/** Para texto que cae dentro de un atributo entre comillas dobles (ej. href="..."). */
export function escapeHtmlAttr(value: string): string {
  return value.replace(/[&<>"']/g, (c) => HTML_ATTR_ESCAPES[c])
}

/**
 * Sustituye el `src` placeholder de un `<img>` por la URL del usuario — o,
 * si la dejó en blanco, borra el `<img>` ENTERO en vez de dejar `src=""`.
 * Pedido explícito del usuario 2026-08-25 ("evitar que aparezca en el mail
 * que la imagen no ha cargado"), aplicado como mecanismo compartido a todo
 * campo de URL de imagen que renderiza como un `<img>` real (no aplica a
 * `background-image: url(...)` — ahí un valor vacío ya no deja ningún ícono
 * roto, el navegador simplemente no pinta nada).
 *
 * `html` puede ser el documento completo o ya un fragmento recortado (ej. la
 * celda de cobranding en header/render.ts) — busca el `<img` más cercano
 * ANTES del placeholder, así que solo funciona si `placeholder` es
 * literalmente el valor de su atributo `src` (nunca aparece un `<img` real
 * entre el placeholder y su propia apertura).
 */
export function substituteImgSrcOrRemove(html: string, placeholder: string, url: string, fileName: string): string {
  const placeholderIndex = html.indexOf(placeholder)
  if (placeholderIndex === -1) {
    throw new Error(`${fileName}: no se encontró "${placeholder}" — revisar substituteImgSrcOrRemove`)
  }
  if (url.trim() === '') {
    const tagStart = html.lastIndexOf('<img', placeholderIndex)
    if (tagStart === -1) {
      throw new Error(`${fileName}: no se encontró la apertura "<img" antes de "${placeholder}" — revisar substituteImgSrcOrRemove`)
    }
    const tagEnd = html.indexOf('>', placeholderIndex) + 1
    return html.slice(0, tagStart) + html.slice(tagEnd)
  }
  return html.replace(placeholder, () => escapeHtmlAttr(url))
}
