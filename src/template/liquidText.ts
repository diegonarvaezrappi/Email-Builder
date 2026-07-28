// Utilidades de texto compartidas entre componentes para armar los snippets
// Liquid+HTML del template maestro (ver Referencias/instrucciones.md, A.1/A.2).

const URL_RE = /https?:\/\/[^\s<>"']+/g
const TRAILING_PUNCTUATION_RE = /[.,;:!?)]+$/

/** Envuelve cualquier URL encontrada en el texto con el <a> de estilo legal del footer. */
export function wrapUrlsAsFooterLinks(text: string): string {
  return text.replace(URL_RE, (rawUrl) => {
    const trailingMatch = rawUrl.match(TRAILING_PUNCTUATION_RE)
    const trailing = trailingMatch ? trailingMatch[0] : ''
    const url = trailing ? rawUrl.slice(0, -trailing.length) : rawUrl
    return `<a href="${url}" style="text-decoration: none; color:#7D8188">${url}</a>${trailing}`
  })
}

/** Arma un literal de string Liquid seguro a partir de texto libre (puede traer comillas). */
export function toLiquidStringLiteral(value: string): string {
  if (!value.includes("'")) return `'${value}'`
  if (!value.includes('"')) return `"${value}"`
  // Contiene ambos tipos de comillas: se reemplazan las simples por su
  // variante tipográfica para no romper el delimitador Liquid.
  return `'${value.replace(/'/g, '’')}'`
}
