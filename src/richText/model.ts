// ============================================================================
// Modelo de texto enriquecido — usado en TODO campo que exponga modificadores
// de texto por selección en la app (TEXTOXL/TEXTOM/TEXTO_COMPLEMENTARIO del
// banner, PROMO, CREDITOS, el "Antes" de deals): bold, italic, tachado,
// subrayado, superíndice, color base/subtono1/subtono2 y tamaño. Los primeros
// 7 salen de la referencia del propio maestro: 02-components/04_content-modules/
// content_moleculas/modificadores-texto.html (ver memoria
// project_content_modules_text_modifiers_2026-08-04); tamaño toma la escala
// h1-h5/.legal que ese mismo maestro documenta ahí bajo "TAMAÑO" (valores
// DESKTOP de 01-foundations/global-styles/global-styles.html — el maestro
// además la reduce por @media en mobile, pero eso aplica a las etiquetas
// <h1>-<h5> reales, no al <span> con estilo inline que generamos acá, mismo
// criterio que el resto de los modificadores: se toma el VALOR de estilo que
// documenta el maestro, no su estructura de tags).
//
// Representación = lista de "runs" (fragmentos de texto + el set de marcas
// activas en ese fragmento), no HTML crudo: evita tener que sanitizar HTML
// arbitrario pegado por el usuario, y hace que aplicar/quitar una marca sobre
// una selección sea partir/fusionar runs (lógica pura, testeable sin DOM) en
// vez de cirugía de Range.
// ============================================================================
import { z } from 'zod'

const SIZE_MARK_VALUES = ['sizeH1', 'sizeH2', 'sizeH3', 'sizeH4', 'sizeH5', 'sizeLegal'] as const
export type SizeMark = (typeof SIZE_MARK_VALUES)[number]

export const TEXT_MARK_VALUES = [
  'bold',
  'italic',
  'strike',
  'underline',
  'superscript',
  'colorBase',
  'colorAcento1',
  'colorAcento2',
  ...SIZE_MARK_VALUES,
] as const
export type TextMark = (typeof TEXT_MARK_VALUES)[number]

/** Los 3 marks de color son mutuamente excluyentes entre sí (un fragmento no
 *  puede ser "color base" y "subtono 1" a la vez) — ver setColorMark en edit.ts. */
export const COLOR_MARKS: readonly TextMark[] = ['colorBase', 'colorAcento1', 'colorAcento2']

/** Los 6 marks de tamaño también son mutuamente excluyentes entre sí, mismo
 *  criterio que los colores — ver setSizeMark en edit.ts. */
export const SIZE_MARKS: readonly TextMark[] = SIZE_MARK_VALUES

/** px de cada mark de tamaño — ver la nota de "TAMAÑO" arriba. */
export const SIZE_MARK_PX: Record<SizeMark, number> = {
  sizeH1: 26,
  sizeH2: 21,
  sizeH3: 16,
  sizeH4: 14,
  sizeH5: 12,
  sizeLegal: 8,
}

/** px -> mark, para reconstruir el modelo al releer el DOM (ver dom.ts). */
export function sizeMarkForPx(px: number): SizeMark | null {
  return SIZE_MARK_VALUES.find((mark) => SIZE_MARK_PX[mark] === px) ?? null
}

export const SIZE_MARK_LABELS: Record<SizeMark, string> = {
  sizeH1: 'H1 · 26px',
  sizeH2: 'H2 · 21px',
  sizeH3: 'H3 · 16px',
  sizeH4: 'H4 · 14px',
  sizeH5: 'H5 · 12px',
  sizeLegal: 'Legal · 8px',
}

export const TEXT_MARK_LABELS: Record<TextMark, string> = {
  bold: 'Negrita',
  italic: 'Cursiva',
  strike: 'Tachado',
  underline: 'Subrayado',
  superscript: 'Superíndice',
  colorBase: 'Color base',
  colorAcento1: 'Subtono 1',
  colorAcento2: 'Subtono 2',
  sizeH1: SIZE_MARK_LABELS.sizeH1,
  sizeH2: SIZE_MARK_LABELS.sizeH2,
  sizeH3: SIZE_MARK_LABELS.sizeH3,
  sizeH4: SIZE_MARK_LABELS.sizeH4,
  sizeH5: SIZE_MARK_LABELS.sizeH5,
  sizeLegal: SIZE_MARK_LABELS.sizeLegal,
}

export const richTextRunSchema = z.object({
  text: z.string(),
  marks: z.array(z.enum(TEXT_MARK_VALUES)).default([]),
})
export type RichTextRun = z.infer<typeof richTextRunSchema>

/** `.preprocess` acepta también un string plano (formato viejo de estos 3
 *  campos, antes de este feature) y lo normaliza a un único run sin marcas —
 *  así un documento guardado en localStorage antes de este cambio sigue
 *  cargando en vez de invalidar todo el documento (ver store/persistence.ts:
 *  un solo campo inválido descarta el documento entero). */
export const richTextSchema = z.preprocess(
  (value) => (typeof value === 'string' ? richTextFromPlain(value) : value),
  z.array(richTextRunSchema),
)
export type RichText = RichTextRun[]

export interface RichTextColorMap {
  colorBase: string
  colorAcento1: string
  colorAcento2: string
}

export function plainText(runs: RichText): string {
  return runs.map((run) => run.text).join('')
}

export function richTextFromPlain(text: string): RichText {
  return text ? [{ text, marks: [] }] : []
}

export function defaultRichText(text: string): () => RichText {
  return () => richTextFromPlain(text)
}
