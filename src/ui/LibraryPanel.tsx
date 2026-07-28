// ============================================================================
// Panel izquierdo: la librería de componentes del mail + los ajustes globales.
//
// "Componentes" lista los slots del maestro. Solo los que tienen entrada en el
// registry son seleccionables; el resto se muestra deshabilitado para que se
// vea qué falta por implementar (y en qué orden va dentro del mail).
// ============================================================================
import type { SlotName } from '../model'
import { SLOT_ORDER, type EmailDocument } from '../model'
import { registry, SLOT_LABELS } from '../registry'
import type { GlobalFields } from '../global/schema'
import { groupedThemes, themeLabel } from '../themes/themes'

interface LibraryPanelProps {
  document: EmailDocument
  selected: SlotName | null
  onSelect: (slot: SlotName) => void
  onGlobalChange: (next: GlobalFields) => void
}

export function LibraryPanel({ document: doc, selected, onSelect, onGlobalChange }: LibraryPanelProps) {
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

      <section className="lib-section">
        <h2>Global</h2>
        <p className="lib-hint">Afecta a todo el email.</p>

        <label className="field">
          <span>Tema</span>
          <select value={doc.global.tema} onChange={(e) => onGlobalChange({ ...doc.global, tema: e.target.value })}>
            {groupedThemes().map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.themes.map((t) => (
                  <option key={t.slug} value={t.slug}>
                    {themeLabel(t.slug)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      </section>
    </aside>
  )
}
