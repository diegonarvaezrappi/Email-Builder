import type { EmailDocument } from '../../model'
import type { GlobalFields } from '../../global/schema'
import { GeneralFieldsPanel } from '../contentModules/GeneralFieldsPanel'
import type { BulletFields } from './schema'

interface BulletPropertiesPanelProps {
  value: BulletFields
  onChange: (next: BulletFields) => void
  doc: EmailDocument
  onChangeGlobal: (next: GlobalFields) => void
}

/**
 * Panel del bloque BULLET cuando está seleccionado el módulo entero (no una
 * molécula puntual de su área libre) — mismo criterio exacto que
 * components/title/PropertiesPanel.tsx: solo los 3 toggles generales, el
 * catálogo para AGREGAR moléculas vive en ui/InspectorPanel.tsx.
 */
export function BulletPropertiesPanel({ value, onChange }: BulletPropertiesPanelProps) {
  return (
    <div className="properties-panel">
      <GeneralFieldsPanel value={value} onChange={onChange} />
    </div>
  )
}
