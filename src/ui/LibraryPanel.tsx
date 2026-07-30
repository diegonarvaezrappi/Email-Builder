// ============================================================================
// Panel izquierdo: la librería de componentes del mail.
//
// Lista los slots del maestro. Solo los que tienen entrada en el registry son
// seleccionables; el resto se muestra deshabilitado para que se vea qué falta
// por implementar (y en qué orden va dentro del mail).
//
// Los ajustes globales (el tema) NO viven acá — van en la barra superior, ver
// ui/ThemeSelect.tsx.
// ============================================================================
import type { EmailDocument, SlotName } from '../model'
import { SLOT_ORDER } from '../model'
import { registry, SLOT_LABELS } from '../registry'

/**
 * dataTransfer key para arrastrar un slot eliminado de vuelta al Viewport.
 * Debe quedar sincronizado con SLOT_DRAG_TYPE de ui/Viewport.tsx.
 */
const SLOT_DRAG_TYPE = 'application/x-email-slot'

interface LibraryPanelProps {
  document: EmailDocument
  selected: SlotName | null
  onSelect: (slot: SlotName) => void
}

export function LibraryPanel({ document: doc, selected, onSelect }: LibraryPanelProps) {
  return (
    <aside className="panel-library">
      <section className="lib-section">
        <h2>Componentes</h2>
        <ul className="lib-list">
          {SLOT_ORDER.map((slot) => {
            const def = registry[slot]
            const implemented = def !== undefined
            // Solo tiene sentido arrastrar de vuelta un slot que el usuario
            // sacó a mano desde el Viewport (ver SlotDef.removable) — no
            // arrastra nada un slot que ya está visible en el email.
            const isRemoved = implemented && def.removable && Boolean((doc[def.docKey] as { removed?: boolean }).removed)
            return (
              <li key={slot}>
                <button
                  type="button"
                  className={`lib-item${selected === slot ? ' active' : ''}`}
                  disabled={!implemented}
                  aria-pressed={selected === slot}
                  draggable={isRemoved}
                  onDragStart={(e) => {
                    e.dataTransfer.setData(SLOT_DRAG_TYPE, slot)
                    e.dataTransfer.effectAllowed = 'copy'
                  }}
                  onClick={() => onSelect(slot)}
                >
                  <span className="lib-item-name">{SLOT_LABELS[slot]}</span>
                  {!implemented && <span className="lib-item-tag">pendiente</span>}
                  {isRemoved && <span className="lib-item-tag">eliminado — arrastra para restaurar</span>}
                </button>
              </li>
            )
          })}
        </ul>
      </section>
    </aside>
  )
}
