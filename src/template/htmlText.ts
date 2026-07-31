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
