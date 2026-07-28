// ============================================================================
// Panel derecho: las opciones del componente seleccionado en el viewport.
// Cada slot trae su propio formulario (SlotDef.PropertiesPanel del registry),
// así que este panel no sabe nada de footers en particular.
// ============================================================================
import type { EmailDocument, SlotName } from '../model'
import { registry, SLOT_LABELS } from '../registry'

interface InspectorPanelProps {
  document: EmailDocument
  selected: SlotName | null
  onChange: (docKey: keyof EmailDocument, fields: unknown) => void
}

export function InspectorPanel({ document: doc, selected, onChange }: InspectorPanelProps) {
  const def = selected ? registry[selected] : undefined

  if (!selected || !def) {
    return (
      <aside className="panel-inspector empty">
        <p className="inspector-hint">Toca un componente del email para ver sus opciones.</p>
      </aside>
    )
  }

  const { PropertiesPanel } = def
  return (
    <aside className="panel-inspector">
      <h2>{SLOT_LABELS[selected]}</h2>
      <PropertiesPanel value={doc[def.docKey]} onChange={(next) => onChange(def.docKey, next)} />
    </aside>
  )
}
