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
import type { SlotName } from '../model'
import { SLOT_ORDER } from '../model'
import { registry, SLOT_LABELS } from '../registry'

interface LibraryPanelProps {
  selected: SlotName | null
  onSelect: (slot: SlotName) => void
}

export function LibraryPanel({ selected, onSelect }: LibraryPanelProps) {
  return (
    <aside className="panel-library">
      <section className="lib-section">
        <h2>Componentes</h2>
        <ul className="lib-list">
          {SLOT_ORDER.map((slot) => {
            const implemented = registry[slot] !== undefined
            return (
              <li key={slot}>
                <button
                  type="button"
                  className={`lib-item${selected === slot ? ' active' : ''}`}
                  disabled={!implemented}
                  aria-pressed={selected === slot}
                  onClick={() => onSelect(slot)}
                >
                  <span className="lib-item-name">{SLOT_LABELS[slot]}</span>
                  {!implemented && <span className="lib-item-tag">pendiente</span>}
                </button>
              </li>
            )
          })}
        </ul>
      </section>
    </aside>
  )
}
