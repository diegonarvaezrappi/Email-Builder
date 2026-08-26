// ============================================================================
// Edición pura del modelo de runs: dado un rango [start, end) de caracteres
// (offsets sobre el texto plano concatenado) y una marca, parte los runs que
// caen a mitad del rango, prende/apaga la marca en los runs cubiertos, y
// fusiona runs adyacentes que quedaron con el mismo set de marcas. Sin DOM —
// las coordenadas de selección se resuelven en richText/selection.ts.
// ============================================================================
import { COLOR_MARKS, SIZE_MARKS, type RichText, type RichTextRun, type TextMark } from './model'

function splitRunsAtOffset(runs: RichText, offset: number): RichText {
  let pos = 0
  const out: RichTextRun[] = []
  for (const run of runs) {
    const len = run.text.length
    if (offset > pos && offset < pos + len) {
      const cut = offset - pos
      out.push({ text: run.text.slice(0, cut), marks: run.marks })
      out.push({ text: run.text.slice(cut), marks: run.marks })
    } else {
      out.push(run)
    }
    pos += len
  }
  return out
}

function splitRunsAtOffsets(runs: RichText, offsets: number[]): RichText {
  let result = runs
  for (const offset of [...new Set(offsets)].sort((a, b) => a - b)) {
    result = splitRunsAtOffset(result, offset)
  }
  return result
}

function runsInRange(runs: RichText, start: number, end: number): number[] {
  const indices: number[] = []
  let pos = 0
  runs.forEach((run, i) => {
    const runStart = pos
    const runEnd = pos + run.text.length
    if (runEnd > runStart && runStart >= start && runEnd <= end) indices.push(i)
    pos = runEnd
  })
  return indices
}

function sameMarks(a: TextMark[], b: TextMark[]): boolean {
  if (a.length !== b.length) return false
  const setB = new Set(b)
  return a.every((m) => setB.has(m))
}

export function mergeAdjacentRuns(runs: RichText): RichText {
  const out: RichTextRun[] = []
  for (const run of runs) {
    if (run.text === '') continue
    const last = out[out.length - 1]
    if (last && sameMarks(last.marks, run.marks)) {
      last.text += run.text
    } else {
      out.push({ text: run.text, marks: [...run.marks] })
    }
  }
  return out
}

/** Prende la marca si algún fragmento del rango no la tiene todavía; la apaga
 *  (en todo el rango) si TODO el rango ya la tenía — comportamiento estándar
 *  de toggle de un editor de texto enriquecido. No-op si el rango está vacío
 *  o no cubre ningún run real. */
export function toggleMark(runs: RichText, start: number, end: number, mark: TextMark): RichText {
  if (end <= start) return runs
  const split = splitRunsAtOffsets(runs, [start, end])
  const indices = runsInRange(split, start, end)
  if (indices.length === 0) return runs
  const allHaveMark = indices.every((i) => split[i].marks.includes(mark))
  const next = split.map((run, i) => {
    if (!indices.includes(i)) return run
    const marks = allHaveMark ? run.marks.filter((m) => m !== mark) : run.marks.includes(mark) ? run.marks : [...run.marks, mark]
    return { ...run, marks }
  })
  return mergeAdjacentRuns(next)
}

/** Fija una marca de un grupo mutuamente excluyente (colores o tamaños): la
 *  agrega reemplazando cualquier otra del mismo grupo que hubiera en el
 *  rango, o la quita sin tocar las demás marcas (bold/italic/etc.) si `mark`
 *  es `null`. Compartido por setColorMark y setSizeMark. */
function setExclusiveMark(runs: RichText, start: number, end: number, group: readonly TextMark[], mark: TextMark | null): RichText {
  if (end <= start) return runs
  const split = splitRunsAtOffsets(runs, [start, end])
  const indices = runsInRange(split, start, end)
  if (indices.length === 0) return runs
  const next = split.map((run, i) => {
    if (!indices.includes(i)) return run
    const withoutGroup = run.marks.filter((m) => !group.includes(m))
    return { ...run, marks: mark ? [...withoutGroup, mark] : withoutGroup }
  })
  return mergeAdjacentRuns(next)
}

/** Los 3 marks de color son excluyentes: fijar uno reemplaza cualquier otro
 *  color que hubiera en el rango. `colorMark: null` limpia el color del rango
 *  sin tocar las demás marcas (bold/italic/etc.). */
export function setColorMark(runs: RichText, start: number, end: number, colorMark: TextMark | null): RichText {
  return setExclusiveMark(runs, start, end, COLOR_MARKS, colorMark)
}

/** Los 6 marks de tamaño (h1-h5 + legal) son excluyentes entre sí, mismo
 *  criterio que los colores. `sizeMark: null` vuelve al tamaño normal (sin
 *  override) sin tocar las demás marcas. */
export function setSizeMark(runs: RichText, start: number, end: number, sizeMark: TextMark | null): RichText {
  return setExclusiveMark(runs, start, end, SIZE_MARKS, sizeMark)
}

/** Quita TODAS las marcas del rango (bold/italic/tachado/subrayado/
 *  superíndice/color/tamaño) de una — "resetear formato". No-op si el rango
 *  está vacío o no cubre ningún run real. */
export function clearMarks(runs: RichText, start: number, end: number): RichText {
  if (end <= start) return runs
  const split = splitRunsAtOffsets(runs, [start, end])
  const indices = runsInRange(split, start, end)
  if (indices.length === 0) return runs
  const next = split.map((run, i) => (indices.includes(i) ? { ...run, marks: [] } : run))
  return mergeAdjacentRuns(next)
}

/** true si TODO el rango [start,end) ya tiene la marca — usado por la UI para
 *  decidir si un botón de la toolbar debe mostrarse "activo", y si aplicar
 *  vuelve a prender/apagar en el próximo click. Rango vacío = false. */
export function rangeHasMark(runs: RichText, start: number, end: number, mark: TextMark): boolean {
  if (end <= start) return false
  const split = splitRunsAtOffsets(runs, [start, end])
  const indices = runsInRange(split, start, end)
  return indices.length > 0 && indices.every((i) => split[i].marks.includes(mark))
}
