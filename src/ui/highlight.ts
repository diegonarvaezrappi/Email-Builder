// ============================================================================
// Tokenizador para pintar el HTML generado como en un editor de código.
//
// Es propio y no una librería a propósito: lo que más importa resaltar acá es
// el LIQUID de Braze (`{% %}`, `{{ }}`, `${...}`), y los resaltadores de HTML
// genéricos no lo conocen — lo dejarían como texto plano o, peor, lo romperían.
// También cubre el CSS de los `<style>` del maestro.
//
// INVARIANTE: concatenar los `value` de los tokens devuelve el input EXACTO.
// El formato del HTML no se toca nunca — no se reindenta ni se normaliza nada,
// esto solo colorea. Hay un test que lo verifica sobre el maestro real.
// ============================================================================

export type TokenKind =
  | 'text'
  | 'comment'
  | 'doctype'
  | 'liquid'
  | 'braze'
  | 'punct'
  | 'tagName'
  | 'attrName'
  | 'attrValue'
  | 'cssSelector'
  | 'cssProp'
  | 'cssValue'
  | 'cssAtRule'

export interface Token {
  kind: TokenKind
  value: string
}

/** Acumula tokens fusionando los consecutivos del mismo tipo (menos spans que pintar). */
class TokenSink {
  readonly tokens: Token[] = []

  push(kind: TokenKind, value: string): void {
    if (!value) return
    const last = this.tokens[this.tokens.length - 1]
    if (last && last.kind === kind) last.value += value
    else this.tokens.push({ kind, value })
  }
}

/** Fin de un delimitador, o el fin del string si quedó sin cerrar. */
function closeAt(src: string, from: number, close: string): number {
  const at = src.indexOf(close, from)
  return at === -1 ? src.length : at + close.length
}

/**
 * Fin de un `{{ ... }}`, saltando los `${...}` de Braze que lleve dentro.
 * Hace falta porque `{{content_blocks.${FOOTER_q1_2024_legales}}}` cierra en el
 * TERCER `}`: buscar el primer `}}` cortaría el token una llave antes.
 */
function liquidOutputEnd(src: string, start: number): number {
  let i = start + 2
  while (i < src.length) {
    if (src.startsWith('${', i)) {
      i = closeAt(src, i + 2, '}')
      continue
    }
    if (src.startsWith('}}', i)) return i + 2
    i += 1
  }
  return src.length
}

/** Si en `i` empieza Liquid o un `${...}` de Braze, dónde termina y de qué tipo es. */
function liquidAt(src: string, i: number): { kind: TokenKind; end: number } | null {
  if (src.startsWith('{%', i)) return { kind: 'liquid', end: closeAt(src, i + 2, '%}') }
  if (src.startsWith('{{', i)) return { kind: 'liquid', end: liquidOutputEnd(src, i) }
  if (src.startsWith('${', i)) return { kind: 'braze', end: closeAt(src, i + 2, '}') }
  return null
}

/**
 * Emite un token de Liquid separando los `${...}` que tenga dentro, para que en
 * `{{content_blocks.${FOOTER_q1_2024_legales}}}` se lea a simple vista qué
 * content block de Braze se está referenciando.
 */
function pushLiquid(sink: TokenSink, chunk: string, kind: TokenKind): void {
  if (kind !== 'liquid' || !chunk.includes('${')) {
    sink.push(kind, chunk)
    return
  }
  const re = /\$\{[^}]*\}/g
  let last = 0
  for (let m = re.exec(chunk); m; m = re.exec(chunk)) {
    sink.push('liquid', chunk.slice(last, m.index))
    sink.push('braze', m[0])
    last = m.index + m[0].length
  }
  sink.push('liquid', chunk.slice(last))
}

/**
 * Liquid y `${...}` dentro de un fragmento (el valor de un atributo, un trozo
 * de CSS), para que `bgcolor="{{x}}"` no se pinte como un literal.
 */
function pushWithLiquid(sink: TokenSink, src: string, base: TokenKind): void {
  let i = 0
  let plain = 0
  while (i < src.length) {
    const found = liquidAt(src, i)
    if (!found) {
      i += 1
      continue
    }
    sink.push(base, src.slice(plain, i))
    pushLiquid(sink, src.slice(i, found.end), found.kind)
    i = found.end
    plain = i
  }
  sink.push(base, src.slice(plain))
}

/** Tokeniza `<tag attr="v">` desde `<`. Devuelve el índice después del `>`. */
function tokenizeTag(src: string, start: number, sink: TokenSink): number {
  let i = start
  const isClosing = src[i + 1] === '/'
  sink.push('punct', isClosing ? '</' : '<')
  i += isClosing ? 2 : 1

  const name = /^[a-zA-Z][^\s/>]*/.exec(src.slice(i))?.[0] ?? ''
  sink.push('tagName', name)
  i += name.length

  while (i < src.length && src[i] !== '>') {
    const ch = src[i]

    if (/\s/.test(ch)) {
      const ws = /^\s+/.exec(src.slice(i))![0]
      sink.push('text', ws)
      i += ws.length
    } else if (ch === '=') {
      sink.push('punct', '=')
      i += 1
    } else if (ch === '"' || ch === "'") {
      const end = src.indexOf(ch, i + 1)
      const stop = end === -1 ? src.length : end + 1
      sink.push('attrValue', ch)
      pushWithLiquid(sink, src.slice(i + 1, stop - 1), 'attrValue')
      sink.push('attrValue', src.slice(stop - 1, stop))
      i = stop
    } else if (ch === '/') {
      sink.push('punct', '/')
      i += 1
    } else {
      const word = /^[^\s=/>]+/.exec(src.slice(i))![0]
      // Un atributo puede ser Liquid entero: <td {% if x %}...{% endif %}>
      pushWithLiquid(sink, word, 'attrName')
      i += word.length
    }
  }

  if (src[i] === '>') {
    sink.push('punct', '>')
    i += 1
  }
  return i
}

/** Tokeniza el cuerpo de un `<style>`: selectores, propiedades y valores. */
function tokenizeCss(css: string, sink: TokenSink): void {
  let i = 0
  let depth = 0
  let inValue = false

  while (i < css.length) {
    const rest = css.slice(i)

    if (rest.startsWith('/*')) {
      const end = closeAt(css, i + 2, '*/')
      sink.push('comment', css.slice(i, end))
      i = end
      continue
    }

    const liquid = liquidAt(css, i)
    if (liquid) {
      pushLiquid(sink, css.slice(i, liquid.end), liquid.kind)
      i = liquid.end
      continue
    }

    const ch = css[i]
    if (ch === '{') {
      depth += 1
      inValue = false
      sink.push('punct', ch)
      i += 1
      continue
    }
    if (ch === '}') {
      depth = Math.max(0, depth - 1)
      inValue = false
      sink.push('punct', ch)
      i += 1
      continue
    }
    if (ch === ':' && depth > 0) {
      inValue = true
      sink.push('punct', ch)
      i += 1
      continue
    }
    if (ch === ';') {
      inValue = false
      sink.push('punct', ch)
      i += 1
      continue
    }

    // Trozo corrido hasta el próximo carácter significativo.
    const next = /[{};:/]|\{[%{]/.exec(rest.slice(1))
    const chunk = rest.slice(0, next ? next.index + 1 : rest.length) || rest[0]
    if (depth === 0) {
      const atRule = /^\s*@/.test(chunk)
      pushWithLiquid(sink, chunk, atRule ? 'cssAtRule' : 'cssSelector')
    } else {
      pushWithLiquid(sink, chunk, inValue ? 'cssValue' : 'cssProp')
    }
    i += chunk.length
  }
}

/** Índice donde empieza el `</style>` que cierra, o el fin del string. */
function findStyleEnd(src: string, from: number): number {
  const at = src.slice(from).search(/<\/style\b/i)
  return at === -1 ? src.length : from + at
}

/** Próximo carácter que abre algo interesante, para cortar los tramos de texto. */
function nextSpecial(src: string, from: number): number {
  for (let i = from; i < src.length; i += 1) {
    if (src[i] === '<' || src.startsWith('{%', i) || src.startsWith('{{', i) || src.startsWith('${', i)) {
      return i === from ? i + 1 : i
    }
  }
  return src.length
}

export function tokenizeHtml(source: string): Token[] {
  const sink = new TokenSink()
  let i = 0

  while (i < source.length) {
    if (source.startsWith('<!--', i)) {
      const end = closeAt(source, i + 4, '-->')
      sink.push('comment', source.slice(i, end))
      i = end
      continue
    }
    if (source.startsWith('<!', i)) {
      const end = closeAt(source, i + 2, '>')
      sink.push('doctype', source.slice(i, end))
      i = end
      continue
    }
    const liquid = liquidAt(source, i)
    if (liquid) {
      pushLiquid(sink, source.slice(i, liquid.end), liquid.kind)
      i = liquid.end
      continue
    }
    if (source.startsWith('</', i) || (source[i] === '<' && /[a-zA-Z]/.test(source[i + 1] ?? ''))) {
      const isStyle = /^<style\b/i.test(source.slice(i, i + 7))
      i = tokenizeTag(source, i, sink)
      if (isStyle) {
        const end = findStyleEnd(source, i)
        tokenizeCss(source.slice(i, end), sink)
        i = end
      }
      continue
    }

    const end = nextSpecial(source, i)
    sink.push('text', source.slice(i, end))
    i = end
  }

  return sink.tokens
}
