// ============================================================================
// Modelo de texto enriquecido para TEXTOXL/TEXTOM/TEXTO_COMPLEMENTARIO del
// banner — los únicos 3 tipos de pieza a los que el usuario pidió poder
// aplicarles "cualquier modificador de texto" por selección (bold, italic,
// tachado, subrayado, superíndice, color base/subtono1/subtono2), tomados de
// la referencia del propio maestro: 02-components/04_content-modules/
// content_moleculas/modificadores-texto.html (ver memoria
// project_content_modules_text_modifiers_2026-08-04). A propósito se excluyen
// los modificadores de TAMAÑO (h1-h5/.legal) — pedido explícito del usuario.
//
// Representación = lista de "runs" (fragmentos de texto + el set de marcas
// activas en ese fragmento), no HTML crudo: evita tener que sanitizar HTML
// arbitrario pegado por el usuario, y hace que aplicar/quitar una marca sobre
// una selección sea partir/fusionar runs (lógica pura, testeable sin DOM) en
// vez de cirugía de Range.
// ============================================================================
import { z } from 'zod'

export const TEXT_MARK_VALUES = [
  'bold',
  'italic',
  'strike',
  'underline',
  'superscript',
  'colorBase',
  'colorAcento1',
  'colorAcento2',
] as const
export type TextMark = (typeof TEXT_MARK_VALUES)[number]

/** Los 3 marks de color son mutuamente excluyentes entre sí (un fragmento no
 *  puede ser "color base" y "subtono 1" a la vez) — ver setColorMark en edit.ts. */
export const COLOR_MARKS: readonly TextMark[] = ['colorBase', 'colorAcento1', 'colorAcento2']

export const TEXT_MARK_LABELS: Record<TextMark, string> = {
  bold: 'Negrita',
  italic: 'Cursiva',
  strike: 'Tachado',
  underline: 'Subrayado',
  superscript: 'Superíndice',
  colorBase: 'Color base',
  colorAcento1: 'Subtono 1',
  colorAcento2: 'Subtono 2',
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
