// ============================================================================
// Utilidades de corte/reemplazo por anclas literales — promovidas desde
// components/deals/render.ts (donde nacieron como el toolkit privado de
// deals, la primera pieza que necesitó cortar/rellenar HTML de un maestro
// sin `{% if %}` alrededor de sus piezas opcionales) a un módulo compartido:
// el plan de fase 1 de "nuevos módulos de contenido" (ver
// [[project_body_modules_plan_2026-08-26]]) fija que cada módulo nuevo va a
// necesitar exactamente estas mismas primitivas (títulos, bullets,
// beneficios, cupones, etc. — todos maestros sin `{% if %}` en sus piezas
// opcionales, mismo patrón que deals). `fileName` viaja explícito en cada
// función (en vez de vivir como constante de módulo, como hacía el original
// en deals/render.ts) porque ahora hay múltiples call sites, cada uno con su
// propio archivo maestro — mismo criterio que ya usa
// components/banner/items/vars.ts (substituteOnce/substituteAll).
// ============================================================================

export interface Bounds {
  start: number
  end: number
}

export interface Edit extends Bounds {
  replacement: string
}

/**
 * Aplica una lista de ediciones calculadas TODAS sobre el mismo texto pristino,
 * de atrás hacia adelante: así ningún reemplazo puede correr los índices de
 * otro, ni hacer que el `indexOf` de una pieza caiga sobre texto que acabó de
 * escribir el usuario en otra.
 *
 * El chequeo de superposición es una red de seguridad real: cortar 2
 * elementos que en verdad se anidan produciría HTML corrupto, así que la
 * lógica que arma `edits` nunca debe emitir las 2 ediciones juntas — y si
 * algún día lo hace, esto lo grita en vez de exportar un mail roto.
 */
export function applyEdits(html: string, edits: Edit[], fileName: string): string {
  const sorted = [...edits].sort((a, b) => b.start - a.start)
  let previousStart = html.length
  let out = html
  for (const edit of sorted) {
    if (edit.end > previousStart) {
      throw new Error(`${fileName}: ediciones superpuestas (${edit.start}-${edit.end} contra ${previousStart}) — revisar el render que las generó`)
    }
    out = out.slice(0, edit.start) + edit.replacement + out.slice(edit.end)
    previousStart = edit.start
  }
  return out
}

/** Igual criterio que substituteOnce en components/banner/items/vars.ts: si el
 *  maestro ya no trae el literal, falla ruidoso en vez de seguir de largo. */
export function indexOfOrThrow(html: string, literal: string, fileName: string, from = 0): number {
  const index = html.indexOf(literal, from)
  if (index === -1) {
    throw new Error(`${fileName}: ya no contiene "${literal}" — revisar el render que lo busca`)
  }
  return index
}

/**
 * Límites del elemento `<tag>` que contiene `anchorIndex`, contando anidamiento
 * — hace falta de verdad cuando el elemento envuelve otro del mismo tag (ej.
 * un `<div>` que a su vez contiene otro `<div>` hijo): buscar el primer cierre
 * cortaría en el del hijo y dejaría un cierre huérfano en el HTML exportado.
 */
export function elementBounds(html: string, anchorIndex: number, tag: string, fileName: string): Bounds {
  const open = `<${tag}`
  const close = `</${tag}>`
  const start = html.lastIndexOf(open, anchorIndex)
  if (start === -1) {
    throw new Error(`${fileName}: no se encontró la apertura ${open} antes de la posición ${anchorIndex} — revisar el render que la busca`)
  }

  let depth = 0
  let cursor = start
  for (;;) {
    const nextOpen = html.indexOf(open, cursor)
    const nextClose = html.indexOf(close, cursor)
    if (nextClose === -1) {
      throw new Error(`${fileName}: no se encontró el cierre ${close} del elemento que abre en ${start} — revisar el render que lo busca`)
    }
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++
      cursor = nextOpen + open.length
    } else {
      depth--
      cursor = nextClose + close.length
      if (depth === 0) return { start, end: cursor }
    }
  }
}

/** Elemento sin cierre (`<img>`): de su apertura hasta el `>` que la termina. */
export function voidElementBounds(html: string, anchorIndex: number, tag: string, fileName: string): Bounds {
  const open = `<${tag}`
  const start = html.lastIndexOf(open, anchorIndex)
  if (start === -1) {
    throw new Error(`${fileName}: no se encontró la apertura ${open} antes de la posición ${anchorIndex} — revisar el render que la busca`)
  }
  const end = html.indexOf('>', anchorIndex)
  if (end === -1) {
    throw new Error(`${fileName}: no se encontró el cierre ">" de ${open} en ${start} — revisar el render que lo busca`)
  }
  return { start, end: end + 1 }
}

/**
 * El texto que va inmediatamente antes del cierre de un elemento: desde el
 * último `>` de su contenido hasta el `</tag>`. Reemplazar "todo el contenido"
 * no serviría en piezas que mezclan un `<img>` con texto: borraría también el
 * ícono.
 */
export function textRunBounds(html: string, bounds: Bounds, tag: string, fileName: string): Bounds {
  const closeStart = bounds.end - `</${tag}>`.length
  const lastGt = html.lastIndexOf('>', closeStart - 1)
  if (lastGt === -1 || lastGt < bounds.start) {
    throw new Error(`${fileName}: no se encontró el texto de <${tag}> en ${bounds.start}-${bounds.end} — revisar el render que lo busca`)
  }
  return { start: lastGt + 1, end: closeStart }
}

/**
 * Todo el contenido interno de un elemento: desde el `>` que cierra su propia
 * apertura hasta el `<` que abre su cierre — a diferencia de textRunBounds
 * (que busca un RUN DE TEXTO al final, tras el último tag hijo), esto sirve
 * para reemplazar el contenido ENTERO sin importar qué tenga adentro (texto,
 * un solo hijo, o una lista libre de varios). Primer consumidor: el "área
 * libre de moléculas" de un módulo de body (ver components/title/render.ts) —
 * el `<div>` que hoy trae el h2/separador/h3 hardcodeados del maestro se
 * reemplaza entero por lo que el usuario tenga en `fields.items`.
 */
export function innerBounds(html: string, bounds: Bounds, tag: string, fileName: string): Bounds {
  const openEnd = html.indexOf('>', bounds.start) + 1
  if (openEnd === 0 || openEnd > bounds.end) {
    throw new Error(`${fileName}: no se encontró el cierre ">" de la apertura <${tag}> en ${bounds.start} — revisar el render que la busca`)
  }
  return { start: openEnd, end: bounds.end - `</${tag}>`.length }
}

/**
 * Ubica las N ocurrencias (en orden de aparición) del elemento `<tag>` que
 * contiene cada una de las N apariciones de `literal` — generaliza el bucle
 * "buscar desde `from`, avanzar `from` al final de cada match" que ya usan
 * components/col3/render.ts (sus 3 celdas) y deals' `spliceRow` (sus 2 celdas
 * por fila), para cualquier maestro que repita el MISMO fragmento N veces
 * literalmente en vez de traer un solo slot por instancia — primer
 * consumidor real: components/col2/render.ts, cuyo maestro replica el área
 * libre y la celda de imagen byte-por-byte entre su tabla de escritorio y la
 * de mobile (fase 6 del plan de nuevos módulos de contenido, ver
 * [[project_body_modules_plan_2026-08-26]]).
 *
 * Lanza si `literal` aparece MÁS de `expectedCount` veces — mismo criterio
 * "avisar fuerte" que el resto de este archivo (si aparece MENOS, ya lo grita
 * el `indexOfOrThrow` interno antes de completar el loop).
 */
export function findRepeatedElementBounds(html: string, literal: string, tag: string, expectedCount: number, fileName: string): Bounds[] {
  const bounds: Bounds[] = []
  let from = 0
  for (let i = 0; i < expectedCount; i++) {
    const literalIndex = indexOfOrThrow(html, literal, fileName, from)
    const elBounds = elementBounds(html, literalIndex, tag, fileName)
    bounds.push(elBounds)
    from = elBounds.end
  }
  if (html.indexOf(literal, from) !== -1) {
    throw new Error(`${fileName}: "${literal}" aparece más de ${expectedCount} veces — revisar el render que la busca`)
  }
  return bounds
}
