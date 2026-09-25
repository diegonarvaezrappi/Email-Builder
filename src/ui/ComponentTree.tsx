// ============================================================================
// Árbol de componentes de una sección (Hero o Contents), debajo del catálogo
// de la pestaña correspondiente del panel izquierdo (ui/LeftPanel.tsx). Cada
// fila se arrastra para reordenar y trae editar / duplicar / eliminar.
//
// Los contenedores (un bloque de Deals, sus tarjetas, un módulo con moléculas)
// son un acordeón: se despliegan en su sitio y pueden quedar varios abiertos.
//
// Toda la lógica (qué filas, qué se puede desplegar, qué se puede arrastrar)
// vive en ui/componentTreeModel.ts, puro y testeado; acá solo se pinta y se
// conectan los callbacks.
//
// El resaltado es bidireccional SIN mecanismo propio: cada fila carga la
// `Selection` que ya usan Inspector y Viewport, así que clickear en el árbol
// resalta en el lienzo (ambos leen el mismo `selected`), y al revés el árbol
// despliega solo los contenedores de lo que se clickeó en el lienzo — ver
// expandedKeysForSelection, que App.tsx aplica en CADA cambio de selección.
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
  type TreeActionTarget,
  type TreeReorder,
  type TreeRow,
  type TreeSection,
} from './componentTreeModel'
import { TREE_REORDER_DRAG_TYPE } from './dragTypes'

interface ComponentTreeProps {
  document: EmailDocument
  section: TreeSection
  heading: string
  selected: Selection | null
  expanded: ReadonlySet<string>
  onSelect: (next: Selection) => void
  onToggleExpanded: (key: string) => void
  /** `toIndex` se interpreta ANTES de sacar la fila arrastrada — la misma
   *  convención que esperan las 5 acciones de reorden del store. */
  onReorder: (reorder: TreeReorder, toIndex: number) => void
  onDuplicate: (target: TreeActionTarget) => void
  onRemove: (target: TreeActionTarget) => void
}

/** Dónde caería el drop respecto de la fila que está debajo del cursor. */
type DropSide = 'before' | 'after'

export function ComponentTree({
  document: doc,
  section,
  heading,
  selected,
  expanded,
  onSelect,
  onToggleExpanded,
  onReorder,
  onDuplicate,
  onRemove,
}: ComponentTreeProps) {
  const { rows } = buildTreeViewModel(doc, expanded, section)
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
      <h2 className="tree-heading">{heading}</h2>

      <ul className="lib-list tree-list">
        {rows.map((row, index) => (
          <TreeRowItem
            key={rowKey(row, index)}
            row={row}
            selected={selected}
            dragging={dragging}
            dropSide={dropAt?.index === index ? dropAt.side : null}
            onSelect={onSelect}
            onToggleExpanded={onToggleExpanded}
            onDragStartRow={setDragging}
            onDragOverRow={(side) => setDropAt({ index, side })}
            onDropRow={handleDrop}
            onDragEndRow={clearDrag}
            onDuplicate={onDuplicate}
            onRemove={onRemove}
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
  onToggleExpanded,
  onDragStartRow,
  onDragOverRow,
  onDropRow,
  onDragEndRow,
  onDuplicate,
  onRemove,
}: {
  row: TreeRow
  selected: Selection | null
  dragging: TreeReorder | null
  dropSide: DropSide | null
  onSelect: (next: Selection) => void
  onToggleExpanded: (key: string) => void
  onDragStartRow: (reorder: TreeReorder) => void
  onDragOverRow: (side: DropSide) => void
  onDropRow: (target: TreeReorder, side: DropSide) => void
  onDragEndRow: () => void
  onDuplicate: (target: TreeActionTarget) => void
  onRemove: (target: TreeActionTarget) => void
}) {
  if (row.kind === 'group') {
    return (
      <li className={`tree-depth-${row.depth}`}>
        <span className="lib-group-label tree-group-label">{row.label}</span>
      </li>
    )
  }

  if (row.kind === 'hint') {
    return (
      <li className={`tree-depth-${row.depth}`}>
        <span className="tree-hint">{row.label}</span>
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

  const expandKey = row.expandKey
  const select = () => {
    onSelect(row.selection)
    // En un contenedor, clickear el nombre lo abre (el usuario clickea
    // "Deals" y espera ver sus deals); clickearlo de nuevo ya seleccionado lo
    // pliega. El chevron pliega/despliega sin tocar la selección.
    if (expandKey && (!row.expanded || active)) onToggleExpanded(expandKey)
  }
  const target = row.actionTarget

  return (
    <li className={`tree-row tree-depth-${row.depth}`}>
      {expandKey ? (
        <button
          type="button"
          className={`tree-toggle${row.expanded ? ' expanded' : ''}`}
          aria-expanded={row.expanded}
          aria-label={`${row.expanded ? 'Plegar' : 'Desplegar'} ${row.label}`}
          title={row.expanded ? 'Plegar' : 'Desplegar'}
          onClick={() => onToggleExpanded(expandKey)}
        >
          <ChevronIcon />
        </button>
      ) : (
        <span className="tree-toggle-spacer" aria-hidden="true" />
      )}
      <button
        type="button"
        className={[
          'lib-item',
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
        onClick={select}
      >
        <span className="lib-item-name">{row.label}</span>
        {row.tag && <span className="lib-item-tag">{row.tag}</span>}
        {row.childCount !== undefined && <span className="tree-count">{row.childCount}</span>}
      </button>
      <span className="tree-actions">
        <button type="button" className="tree-action tree-action-edit" aria-label={`Editar ${row.label}`} title="Editar" onClick={() => onSelect(row.selection)}>
          <PencilIcon />
        </button>
        {target && (
          <>
            <button
              type="button"
              className="tree-action tree-action-duplicate"
              aria-label={`Duplicar ${row.label}`}
              title={row.duplicateBlockedReason ?? 'Duplicar'}
              disabled={row.duplicateBlockedReason !== undefined}
              onClick={() => onDuplicate(target)}
            >
              <CopyIcon />
            </button>
            <button type="button" className="tree-action tree-action-remove" aria-label={`Eliminar ${row.label}`} title="Eliminar" onClick={() => onRemove(target)}>
              <TrashIcon />
            </button>
          </>
        )}
      </span>
    </li>
  )
}

const svgProps = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const

const ChevronIcon = () => (
  <svg {...svgProps}>
    <path d="m9 6 6 6-6 6" />
  </svg>
)

const PencilIcon = () => (
  <svg {...svgProps}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
)

const CopyIcon = () => (
  <svg {...svgProps}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
  </svg>
)

const TrashIcon = () => (
  <svg {...svgProps}>
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M19 6l-1 14H6L5 6" />
  </svg>
)
