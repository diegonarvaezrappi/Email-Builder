// ============================================================================
// Lee el DOM del editor (ver RichTextInput) y lo convierte de vuelta al
// modelo de runs. Es la mitad inversa de render.ts: reconoce ÚNICAMENTE las
// marcas que nosotros mismos generamos (<sup>, <span style="...">) — el
// contentEditable nunca recibe HTML pegado sin sanitizar (RichTextInput
// intercepta paste e inserta solo texto plano), así que no hace falta un
// sanitizador de HTML arbitrario.
// ============================================================================
import { mergeAdjacentRuns } from './edit'
import { sizeMarkForPx, type RichText, type RichTextColorMap, type RichTextRun, type TextMark } from './model'

/** Delega en el propio parser de color del navegador (vía CSSOM) para que
 *  "#FF441F" y el "rgb(255, 68, 31)" que el DOM devuelve al releer ese mismo
 *  valor se comparen iguales — evita reimplementar a mano el parseo de color. */
function normalizeCssColor(value: string): string {
  const probe = document.createElement('span')
  probe.style.color = value
  return probe.style.color
}

function colorMarkForValue(colors: RichTextColorMap, cssColor: string): TextMark | null {
  const target = normalizeCssColor(cssColor)
  if (!target) return null
  if (normalizeCssColor(colors.colorBase) === target) return 'colorBase'
  if (normalizeCssColor(colors.colorAcento1) === target) return 'colorAcento1'
  if (normalizeCssColor(colors.colorAcento2) === target) return 'colorAcento2'
  return null
}

function marksFromSpanStyle(style: CSSStyleDeclaration, colors: RichTextColorMap): TextMark[] {
  const marks: TextMark[] = []
  if (style.fontWeight === 'bold' || style.fontWeight === '700') marks.push('bold')
  if (style.fontStyle === 'italic') marks.push('italic')
  const decoration = style.textDecorationLine || style.textDecoration || ''
  if (decoration.includes('underline')) marks.push('underline')
  if (decoration.includes('line-through')) marks.push('strike')
  if (style.color) {
    const colorMark = colorMarkForValue(colors, style.color)
    if (colorMark) marks.push(colorMark)
  }
  if (style.fontSize) {
    const sizeMark = sizeMarkForPx(parseFloat(style.fontSize))
    if (sizeMark) marks.push(sizeMark)
  }
  return marks
}

export function domToRichText(root: Node, colors: RichTextColorMap): RichText {
  const runs: RichTextRun[] = []

  function walk(node: Node, marks: TextMark[]) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? ''
      if (text) runs.push({ text, marks })
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const el = node as HTMLElement
    let nextMarks = marks
    if (el.tagName === 'SUP') {
      nextMarks = [...marks, 'superscript']
    } else if (el.tagName === 'SPAN') {
      nextMarks = [...marks, ...marksFromSpanStyle(el.style, colors)]
    } else if (el.tagName === 'BR') {
      return
    }
    el.childNodes.forEach((child) => walk(child, nextMarks))
  }

  root.childNodes.forEach((child) => walk(child, []))
  return mergeAdjacentRuns(runs)
}
