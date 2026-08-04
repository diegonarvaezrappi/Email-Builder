// ============================================================================
// Traduce la selección nativa del navegador (window.getSelection(), atada a
// nodos de DOM) a/desde offsets de caracteres sobre el texto plano de `root`
// — el mismo sistema de coordenadas que usan edit.ts y domToRichText. Único
// código de la feature que depende de verdad del navegador (Selection/Range);
// se verifica a mano vía CDP (ver reference_cdp_browser_verification), no con
// tests unitarios.
// ============================================================================
export interface SelectionOffsets {
  start: number
  end: number
}

/** null si no hay selección, o si la selección no está dentro de `root`. */
export function getSelectionOffsets(root: HTMLElement): SelectionOffsets | null {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return null
  const range = selection.getRangeAt(0)
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null

  const toStart = document.createRange()
  toStart.selectNodeContents(root)
  toStart.setEnd(range.startContainer, range.startOffset)
  const start = toStart.toString().length

  const toEnd = document.createRange()
  toEnd.selectNodeContents(root)
  toEnd.setEnd(range.endContainer, range.endOffset)
  const end = toEnd.toString().length

  return start <= end ? { start, end } : { start: end, end: start }
}

function findPoint(root: Node, targetOffset: number): { node: Node; offset: number } | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let total = 0
  let node = walker.nextNode()
  let last: Text | null = null
  while (node) {
    const len = node.textContent?.length ?? 0
    if (targetOffset <= total + len) return { node, offset: targetOffset - total }
    total += len
    last = node as Text
    node = walker.nextNode()
  }
  return last ? { node: last, offset: last.textContent?.length ?? 0 } : null
}

/** No-op si `root` no tiene ningún nodo de texto (campo vacío). */
export function setSelectionOffsets(root: HTMLElement, start: number, end: number): void {
  const startPoint = findPoint(root, start)
  const endPoint = findPoint(root, end)
  if (!startPoint || !endPoint) return
  const range = document.createRange()
  range.setStart(startPoint.node, startPoint.offset)
  range.setEnd(endPoint.node, endPoint.offset)
  const selection = window.getSelection()
  selection?.removeAllRanges()
  selection?.addRange(range)
}
