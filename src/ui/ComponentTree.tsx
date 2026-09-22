// ============================================================================
// Árbol de componentes del mail, debajo del catálogo en el panel izquierdo —
// pedido explícito del usuario (2026-09-21).
//
// Toda la lógica (qué filas, qué se puede abrir, a dónde vuelve el botón de
// atrás, qué se puede arrastrar) vive en ui/componentTreeModel.ts, puro y
// testeado; acá solo se pinta y se conectan los callbacks.
//
// El resaltado es bidireccional SIN mecanismo propio: cada fila carga la
// `Selection` que ya usan Inspector y Viewport, así que clickear en el árbol
// resalta en el lienzo (ambos leen el mismo `selected`), y al revés el árbol
// baja solo al contenedor de lo que se clickeó en el lienzo — ver
// focusForSelection, que App.tsx aplica en CADA cambio de selección.
//
// DRAG & DROP: la fila arrastrada se guarda en estado local en vez de en el
// `dataTransfer` porque `getData` no se puede leer durante `dragover` (solo
// `types`), y hace falta saber de qué LISTA viene para aceptar o no el drop —
// ver TreeReorder.group. El dataTransfer igual se setea: sin eso el navegador
// no arranca el arrastre.
// ============================================================================
import { useState, type DragEvent } from 'react'
import type { EmailDocument } from '../model'
import type { Selection } from './selection'
import {
  buildTreeViewModel,
  isSameSelection,
  type TreeFocus,
  type TreeReorder,
  type TreeRow,
} from './componentTreeModel'
import { TREE_REORDER_DRAG_TYPE } from './dragTypes'

interface ComponentTreeProps {
  document: EmailDocument
  selected: Selection | null
  focus: TreeFocus | null
  onSelect: (next: Selection) => void
  onChangeFocus: (next: TreeFocus | null) => void
  /** `toIndex` se interpreta ANTES de sacar la fila arrastrada — la misma
   *  convención que esperan las 5 acciones de reorden del store. */
  onReorder: (reorder: TreeReorder, toIndex: number) => void
}

/** Dónde caería el drop respecto de la fila que está debajo del cursor. */
type DropSide = 'before' | 'after'

export function ComponentTree({
  document: doc,
  selected,
  focus,
  onSelect,
  onChangeFocus,
  onReorder,
}: ComponentTreeProps) {
  const { title, back, rows } = buildTreeViewModel(doc, focus)
  const [dragging, setDragging] = useState<TreeReorder | null>(null)
  const [dropAt, setDropAt] = useState<{ index: number; side: DropSide } | null>(null)

  const clearDrag = () => {
    setDragging(null)
    setDropAt(null)
  }

  const handleDrop = (target: TreeReorder, side: DropSide) => {
    // El índice que espera el store es el de la lista ANTES de sacar la fila
    // arrastrada, así que soltar "después" de la fila i es el índice i+1.
    if (dragging && dragging.group === target.group) {
      onReorder(dragging, side === 'before' ? target.index : target.index + 1)
    }
    clearDrag()
  }

  return (
    <section className="lib-section tree-section">
      <h2>Estructura</h2>

      {back && (
        <button type="button" className="tree-back" onClick={() => onChangeFocus(back.to)}>
          ← {back.label}
        </button>
      )}
      {title && <span className="lib-group-label tree-title">{title}</span>}

      <ul className="lib-list">
        {rows.map((row, index) => (
          <TreeRowItem
            key={rowKey(row, index)}
            row={row}
            selected={selected}
            dragging={dragging}
            dropSide={dropAt?.index === index ? dropAt.side : null}
            onSelect={onSelect}
            onChangeFocus={onChangeFocus}
            onDragStartRow={setDragging}
            onDragOverRow={(side) => setDropAt({ index, side })}
            onDropRow={handleDrop}
            onDragEndRow={clearDrag}
          />
        ))}
      </ul>
    </section>
  )
}

/** El índice entra en la clave a propósito: un grupo/hint no tiene id, y 2
 *  áreas vacías del mismo módulo darían la misma clave. */
function rowKey(row: TreeRow, index: number): string {
  if (row.kind !== 'node') return `${row.kind}-${index}-${row.label}`
  const s = row.selection
  return `node-${index}-${s.slot}-${s.blockId ?? ''}-${s.bannerItemId ?? ''}-${s.dealCardId ?? ''}-${s.dealCardPieceType ?? ''}-${s.moduleItemId ?? ''}`
}

function TreeRowItem({
  row,
  selected,
  dragging,
  dropSide,
  onSelect,
  onChangeFocus,
  onDragStartRow,
  onDragOverRow,
  onDropRow,
  onDragEndRow,
}: {
  row: TreeRow
  selected: Selection | null
  dragging: TreeReorder | null
  dropSide: DropSide | null
  onSelect: (next: Selection) => void
  onChangeFocus: (next: TreeFocus | null) => void
  onDragStartRow: (reorder: TreeReorder) => void
  onDragOverRow: (side: DropSide) => void
  onDropRow: (target: TreeReorder, side: DropSide) => void
  onDragEndRow: () => void
}) {
  if (row.kind === 'group') {
    return (
      <li>
        <span className={`lib-group-label tree-depth-${row.depth}`}>{row.label}</span>
      </li>
    )
  }

  if (row.kind === 'hint') {
    return (
      <li>
        <span className={`tree-hint tree-depth-${row.depth}`}>{row.label}</span>
      </li>
    )
  }

  const active = isSameSelection(selected, row.selection)
  const reorder = row.reorder
  // Solo se acepta el drop de una fila de la MISMA lista (ver TreeReorder.group).
  const acceptsDrop = reorder !== undefined && dragging !== null && dragging.group === reorder.group
  const sideFromEvent = (e: DragEvent<HTMLButtonElement>): DropSide => {
    const box = e.currentTarget.getBoundingClientRect()
    return e.clientY < box.top + box.height / 2 ? 'before' : 'after'
  }

  return (
    <li>
      <button
        type="button"
        className={[
          'lib-item',
          `tree-depth-${row.depth}`,
          active ? 'active' : '',
          reorder ? 'tree-draggable' : '',
          acceptsDrop && dropSide ? `tree-drop-${dropSide}` : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-pressed={active}
        draggable={reorder !== undefined}
        onDragStart={(e) => {
          if (!reorder) return
          // El payload real viaja por estado (ver la nota de arriba); esto es
          // solo para que el navegador considere válido el arrastre y para que
          // ningún otro destino de la app lo acepte.
          e.dataTransfer.setData(TREE_REORDER_DRAG_TYPE, reorder.group)
          e.dataTransfer.effectAllowed = 'move'
          onDragStartRow(reorder)
        }}
        onDragOver={(e) => {
          if (!acceptsDrop) return
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
          onDragOverRow(sideFromEvent(e))
        }}
        onDrop={(e) => {
          if (!acceptsDrop || !reorder) return
          e.preventDefault()
          onDropRow(reorder, sideFromEvent(e))
        }}
        onDragEnd={onDragEndRow}
        onClick={() => {
          // Seleccionar y abrir son el MISMO gesto en un contenedor: el
          // usuario clickea "Deals" y espera ver sus deals. App.tsx recalcula
          // el foco en cada selección (focusForSelection), así que el
          // onChangeFocus de acá tiene que ir DESPUÉS para ganar.
          onSelect(row.selection)
          if (row.drillTo) onChangeFocus(row.drillTo)
        }}
      >
        <span className="lib-item-name">{row.label}</span>
        {row.tag && <span className="lib-item-tag">{row.tag}</span>}
        {row.childCount !== undefined && <span className="tree-count">{row.childCount}</span>}
        {row.drillTo && (
          <span className="tree-chevron" aria-hidden="true">
            ›
          </span>
        )}
      </button>
    </li>
  )
}
