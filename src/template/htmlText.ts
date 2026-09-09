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

const IMG_ALT_ATTR_RE = /alt="[^"]*"/

/**
 * Sustituye el `src` placeholder de un `<img>` por la URL del usuario y su
 * atributo `alt` por el texto alternativo del usuario — o, si la URL quedó en
 * blanco, borra el `<img>` ENTERO en vez de dejar `src=""` (con o sin `alt`).
 * Pedido explícito del usuario 2026-08-25 ("evitar que aparezca en el mail
 * que la imagen no ha cargado"), aplicado como mecanismo compartido a todo
 * campo de URL de imagen que renderiza como un `<img>` real (no aplica a
 * `background-image: url(...)` — ahí un valor vacío ya no deja ningún ícono
 * roto, el navegador simplemente no pinta nada, y no hay ningún `alt` que
 * sustituir). `alt` se agregó 2026-09-09, pedido explícito del usuario:
 * "donde sea que haya una imagen agrega un input... para el ALT".
 *
 * `html` puede ser el documento completo o ya un fragmento recortado (ej. la
 * celda de cobranding en header/render.ts) — busca el `<img` más cercano
 * ANTES del placeholder, así que solo funciona si `placeholder` es
 * literalmente el valor de su atributo `src` (nunca aparece un `<img` real
 * entre el placeholder y su propia apertura). Falla ruidoso si ese `<img>`
 * no trae ya un `alt="..."` literal — mismo criterio de "no adivinar en
 * silencio" que el resto de este archivo.
 */
export function substituteImgSrcOrRemove(html: string, placeholder: string, url: string, alt: string, fileName: string): string {
  const placeholderIndex = html.indexOf(placeholder)
  if (placeholderIndex === -1) {
    throw new Error(`${fileName}: no se encontró "${placeholder}" — revisar substituteImgSrcOrRemove`)
  }
  const tagStart = html.lastIndexOf('<img', placeholderIndex)
  if (tagStart === -1) {
    throw new Error(`${fileName}: no se encontró la apertura "<img" antes de "${placeholder}" — revisar substituteImgSrcOrRemove`)
  }
  const tagEnd = html.indexOf('>', placeholderIndex) + 1

  if (url.trim() === '') {
    return html.slice(0, tagStart) + html.slice(tagEnd)
  }

  const tag = html.slice(tagStart, tagEnd)
  if (!IMG_ALT_ATTR_RE.test(tag)) {
    throw new Error(`${fileName}: no se encontró alt="..." en el <img> de "${placeholder}" — revisar substituteImgSrcOrRemove`)
  }
  const nextTag = tag.replace(placeholder, () => escapeHtmlAttr(url)).replace(IMG_ALT_ATTR_RE, () => `alt="${escapeHtmlAttr(alt)}"`)
  return html.slice(0, tagStart) + nextTag + html.slice(tagEnd)
}

/**
 * `role="img" aria-label="..."` — técnica estándar de accesibilidad para un
 * elemento pintado con `background-image: url(...)`, que a diferencia de un
 * `<img>` no tiene un atributo `alt` nativo. Pedido explícito del usuario
 * 2026-09-09 (mismo día que el resto de la app ganó `alt` en cada `<img>`
 * real, ver el comentario grande de substituteImgSrcOrRemove arriba): "para
 * todas las imagenes que son agregadas como fondo, tambien agregales un campo
 * ALT, por ejemplo las imagenes de productos de los deals, no tienen ALT".
 */
export function backgroundImageAltAttrs(alt: string): string {
  return ` role="img" aria-label="${escapeHtmlAttr(alt)}"`
}

/**
 * Inserta backgroundImageAltAttrs justo después del nombre de tag de la
 * apertura de `html` — para fragmentos que arrancan exactamente en su propia
 * apertura (una celda ya recortada por elementBounds/findRepeatedElementBounds,
 * que puede ser `<td>` o `<th>` según la celda — ver components/logos/render.ts).
 * Falla ruidoso si `html` no arranca con la apertura de un tag real.
 */
export function insertBackgroundImageAltAtStart(html: string, alt: string, fileName: string): string {
  const match = /^<[a-zA-Z][a-zA-Z0-9]*/.exec(html)
  if (!match) {
    throw new Error(`${fileName}: el fragmento no arranca con la apertura de un tag — revisar insertBackgroundImageAltAtStart`)
  }
  const insertAt = match[0].length
  return html.slice(0, insertAt) + backgroundImageAltAttrs(alt) + html.slice(insertAt)
}
