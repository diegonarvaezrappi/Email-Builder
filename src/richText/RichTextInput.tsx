// ============================================================================
// Input de texto enriquecido para TEXTOXL/TEXTOM/TEXTO_COMPLEMENTARIO: el
// usuario selecciona cualquier palabra/frase dentro del contentEditable y le
// aplica cualquier modificador de texto (bold/italic/tachado/subrayado/
// superíndice/color) desde la toolbar — ver richText/model.ts.
//
// El contentEditable es la fuente de verdad MIENTRAS se escribe (el navegador
// maneja tipeo/cursor/IME nativamente); `value` solo se usa para pintar el
// innerHTML cuando el cambio es EXTERNO (se seleccionó otra pieza, undo) o
// cuando cambian los colores del tema activo — nunca en el eco del propio
// onChange de este componente, para no pelear con el cursor nativo en cada
// tecla (bug clásico de contentEditable "controlado"). Ver
// richText/selection.ts para por qué esta pieza no tiene tests unitarios: usa
// window.getSelection()/Range de verdad, se verifica a mano vía CDP.
// ============================================================================
import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, ClipboardEvent, CSSProperties, KeyboardEvent, MouseEvent as ReactMouseEvent } from 'react'
import { clearMarks, rangeHasMark, setColorMark, setSizeMark, toggleMark } from './edit'
import { domToRichText } from './dom'
import { renderRichText } from './render'
import { getSelectionOffsets, setSelectionOffsets, type SelectionOffsets } from './selection'
import { SIZE_MARK_LABELS, type RichText, type RichTextColorMap, type SizeMark, type TextMark } from './model'

const SIZE_MARK_OPTIONS = Object.keys(SIZE_MARK_LABELS) as SizeMark[]

interface RichTextInputProps {
  value: RichText
  onChange: (next: RichText) => void
  colors: RichTextColorMap
  /** Igual que `disabled` en un `<input>` — el valor se conserva (y sigue
   *  pintado) pero no se puede editar ni seleccionar marcas. Usado por PROMO
   *  para el texto de "Ahora" cuando su checkbox está apagado. */
  disabled?: boolean
  /** Oculta el separador + los 3 swatches de color de la toolbar — pedido
   *  explícito del usuario para los 2 textos de PROMO (monto y "Ahora"), a
   *  diferencia de TEXTOXL/TEXTOM/TEXTO_COMPLEMENTARIO que sí los traen.
   *  Default true (comportamiento sin cambios para esos 3). */
  showColors?: boolean
}

function colorsEqual(a: RichTextColorMap, b: RichTextColorMap): boolean {
  return a.colorBase === b.colorBase && a.colorAcento1 === b.colorAcento1 && a.colorAcento2 === b.colorAcento2
}

const COLOR_SWATCHES: { mark: 'colorBase' | 'colorAcento1' | 'colorAcento2'; label: string }[] = [
  { mark: 'colorBase', label: 'Color base' },
  { mark: 'colorAcento1', label: 'Subtono 1' },
  { mark: 'colorAcento2', label: 'Subtono 2' },
]

export function RichTextInput({ value, onChange, colors, disabled = false, showColors = true }: RichTextInputProps) {
  const ref = useRef<HTMLDivElement>(null)
  const lastValueRef = useRef<RichText | null>(null)
  const lastColorsRef = useRef<RichTextColorMap | null>(null)
  const [selection, setSelection] = useState<SelectionOffsets | null>(null)

  // Repinta el innerHTML SOLO cuando `value` cambió por afuera (otra pieza
  // seleccionada, undo) o cuando cambió el color del tema activo — comparado
  // por VALOR, no por referencia: `colors` llega recalculado desde
  // themeVars() en cada render del panel, así que su referencia cambia aunque
  // el tema sea el mismo; si comparáramos por referencia, se pintaría de
  // nuevo (y saltaría el cursor) en cada tecla.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const isExternalValueChange = lastValueRef.current !== value
    const isColorsChange = !lastColorsRef.current || !colorsEqual(lastColorsRef.current, colors)
    if (!isExternalValueChange && !isColorsChange) return
    const preservedSelection = isColorsChange && !isExternalValueChange ? getSelectionOffsets(el) : null
    el.innerHTML = renderRichText(value, colors)
    lastValueRef.current = value
    lastColorsRef.current = colors
    if (preservedSelection) setSelectionOffsets(el, preservedSelection.start, preservedSelection.end)
  }, [value, colors])

  const emit = (next: RichText) => {
    lastValueRef.current = next
    onChange(next)
  }

  const refreshSelection = () => {
    const el = ref.current
    setSelection(el ? getSelectionOffsets(el) : null)
  }

  const handleInput = () => {
    const el = ref.current
    if (!el) return
    emit(domToRichText(el, colors))
    refreshSelection()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // Estos 3 campos son de una sola línea (mismo criterio que el <input
    // type="text"> que reemplazan) — Enter insertaría un <div>/<br> que
    // domToRichText no sabe interpretar.
    if (e.key === 'Enter') e.preventDefault()
  }

  const handlePaste = (e: ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain').replace(/[\r\n]+/g, ' ')
    const selectionApi = window.getSelection()
    if (!selectionApi || selectionApi.rangeCount === 0) return
    const range = selectionApi.getRangeAt(0)
    range.deleteContents()
    const node = document.createTextNode(text)
    range.insertNode(node)
    range.setStartAfter(node)
    range.setEndAfter(node)
    selectionApi.removeAllRanges()
    selectionApi.addRange(range)
    handleInput()
  }

  const withSelection = (compute: (runs: RichText, sel: SelectionOffsets) => RichText) => {
    const el = ref.current
    const sel = el ? getSelectionOffsets(el) : null
    if (!el || !sel || sel.start === sel.end) return
    const nextRuns = compute(domToRichText(el, colors), sel)
    el.innerHTML = renderRichText(nextRuns, colors)
    el.focus()
    setSelectionOffsets(el, sel.start, sel.end)
    emit(nextRuns)
    setSelection(sel)
  }

  const applyMark = (mark: TextMark) => withSelection((runs, sel) => toggleMark(runs, sel.start, sel.end, mark))
  const applyColor = (mark: TextMark) =>
    withSelection((runs, sel) => setColorMark(runs, sel.start, sel.end, rangeHasMark(runs, sel.start, sel.end, mark) ? null : mark))
  const applySize = (mark: SizeMark | '') => withSelection((runs, sel) => setSizeMark(runs, sel.start, sel.end, mark || null))
  const clearFormatting = () => withSelection((runs, sel) => clearMarks(runs, sel.start, sel.end))

  const hasSelection = !!selection && selection.start < selection.end
  const selectedRuns = hasSelection && ref.current ? domToRichText(ref.current, colors) : null
  const isActive = (mark: TextMark) => !!selectedRuns && !!selection && rangeHasMark(selectedRuns, selection.start, selection.end, mark)
  const activeSize = SIZE_MARK_OPTIONS.find((mark) => isActive(mark)) ?? ''

  // Double-clicking a word to select it can, in Chrome, make the native
  // 'click' that's part of that same gesture land on a toolbar button
  // instead of the text — the button was `disabled` when the mousedown
  // happened (no selection yet) and only became clickable once the mouseup
  // handler (refreshSelection, above) re-rendered the toolbar mid-gesture.
  // Confirmed live via CDP: a real double-click on plain text produced a
  // genuine 'click' event targeting the "Negrita" button with no mousedown
  // of its own. A toolbar button should only ever fire from a deliberate
  // press-then-release ON that same toolbar — not a click that materializes
  // out of an unrelated text selection — so we arm on a real mousedown
  // anywhere in the toolbar and swallow any click that shows up unarmed.
  // `e.detail === 0` exempts keyboard-activated clicks (Enter/Space on a
  // focused button never fire a mousedown at all).
  const toolbarArmedRef = useRef(false)
  const armToolbar = () => {
    toolbarArmedRef.current = true
  }
  const guardToolbarClick = (e: ReactMouseEvent) => {
    const armed = toolbarArmedRef.current
    toolbarArmedRef.current = false
    if (!armed && e.detail !== 0) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  const markButton = (mark: TextMark, label: string, content: React.ReactNode) => (
    <button
      type="button"
      className={isActive(mark) ? 'active' : ''}
      disabled={disabled || !hasSelection}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => applyMark(mark)}
      aria-label={label}
      title={label}
    >
      {content}
    </button>
  )

  return (
    <div className={`rich-text-input${disabled ? ' rich-text-input-disabled' : ''}`}>
      <div
        className="rich-text-toolbar"
        role="toolbar"
        aria-label="Modificadores de texto"
        onMouseDownCapture={armToolbar}
        onClickCapture={guardToolbarClick}
      >
        {markButton('bold', 'Negrita', <b>B</b>)}
        {markButton('italic', 'Cursiva', <i>I</i>)}
        {markButton('strike', 'Tachado', <span style={{ textDecoration: 'line-through' }}>S</span>)}
        {markButton('underline', 'Subrayado', <span style={{ textDecoration: 'underline' }}>U</span>)}
        {markButton(
          'superscript',
          'Superíndice',
          <span>
            X<sup>2</sup>
          </span>,
        )}
        <span className="rich-text-toolbar-sep" />
        <select
          className="rich-text-size-select"
          value={activeSize}
          disabled={disabled || !hasSelection}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => applySize(e.target.value as SizeMark | '')}
          aria-label="Tamaño de texto"
          title="Tamaño de texto"
        >
          <option value="">Normal</option>
          {SIZE_MARK_OPTIONS.map((mark) => (
            <option key={mark} value={mark}>
              {SIZE_MARK_LABELS[mark]}
            </option>
          ))}
        </select>
        {showColors && <span className="rich-text-toolbar-sep" />}
        {showColors &&
          COLOR_SWATCHES.map(({ mark, label }) => (
            <button
              key={mark}
              type="button"
              className={`rich-text-swatch${isActive(mark) ? ' active' : ''}`}
              disabled={disabled || !hasSelection}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyColor(mark)}
              aria-label={label}
              title={label}
              style={{ '--swatch-color': colors[mark] } as CSSProperties}
            />
          ))}
        <span className="rich-text-toolbar-sep" />
        <button
          type="button"
          className="rich-text-clear-btn"
          disabled={disabled || !hasSelection}
          onMouseDown={(e) => e.preventDefault()}
          onClick={clearFormatting}
        >
          Quitar formato
        </button>
      </div>
      <div
        ref={ref}
        className="rich-text-editable"
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onMouseUp={refreshSelection}
        onKeyUp={refreshSelection}
        onBlur={refreshSelection}
      />
      {!disabled && !hasSelection && <span className="field-hint">Seleccioná una palabra o frase para aplicarle un modificador.</span>}
    </div>
  )
}
