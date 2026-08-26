// ============================================================================
// Un solo renderer de runs -> HTML, parametrizado por de dónde sale el color:
// - LIQUID_COLOR_TOKENS (salida final del banner): dejan {{color_x_mail_general}}
//   intacto para que components/banner/render.ts los resuelva en su pasada de
//   tema, mismo criterio que el resto de items/render.ts (ningún render de
//   pieza conoce el tema).
// - un RichTextColorMap con hex reales (preview del editor, ver RichTextInput):
//   así el usuario ve el color de verdad del tema activo mientras escribe.
//
// Estilo inline (no <b>/<i> tags, salvo <sup>) para calzar exactamente con
// cómo el propio maestro documenta cada modificador en
// 02-components/04_content-modules/content_moleculas/modificadores-texto.html
// ("BOLD: se agrega font-weight: bold; en el style", etc.).
// ============================================================================
import { escapeHtmlText } from '../template/htmlText'
import { SIZE_MARK_PX, SIZE_MARKS, type RichText, type RichTextColorMap, type RichTextRun, type SizeMark } from './model'

export const LIQUID_COLOR_TOKENS: RichTextColorMap = {
  colorBase: '{{color_texto_mail_general}}',
  colorAcento1: '{{color_acento1_mail_general}}',
  colorAcento2: '{{color_acento2_mail_general}}',
}

function runStyle(run: RichTextRun, colors: RichTextColorMap): string {
  const styles: string[] = []
  const decorations: string[] = []
  if (run.marks.includes('underline')) decorations.push('underline')
  if (run.marks.includes('strike')) decorations.push('line-through')
  if (decorations.length > 0) styles.push(`text-decoration: ${decorations.join(' ')};`)
  if (run.marks.includes('colorBase')) styles.push(`color: ${colors.colorBase};`)
  else if (run.marks.includes('colorAcento1')) styles.push(`color: ${colors.colorAcento1};`)
  else if (run.marks.includes('colorAcento2')) styles.push(`color: ${colors.colorAcento2};`)
  if (run.marks.includes('bold')) styles.push('font-weight: bold;')
  if (run.marks.includes('italic')) styles.push('font-style: italic;')
  const sizeMark = SIZE_MARKS.find((m) => run.marks.includes(m)) as SizeMark | undefined
  if (sizeMark) styles.push(`font-size: ${SIZE_MARK_PX[sizeMark]}px;`)
  return styles.join(' ')
}

function renderRun(run: RichTextRun, colors: RichTextColorMap): string {
  let html = escapeHtmlText(run.text)
  const style = runStyle(run, colors)
  if (style) html = `<span style="${style}">${html}</span>`
  if (run.marks.includes('superscript')) html = `<sup>${html}</sup>`
  return html
}

export function renderRichText(runs: RichText, colors: RichTextColorMap): string {
  return runs.map((run) => renderRun(run, colors)).join('')
}
