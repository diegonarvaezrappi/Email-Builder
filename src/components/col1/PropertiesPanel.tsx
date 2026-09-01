import type { ChangeEvent } from 'react'
import type { EmailDocument } from '../../model'
import type { GlobalFields } from '../../global/schema'
import { GeneralFieldsPanel } from '../contentModules/GeneralFieldsPanel'
import type { Col1Fields } from './schema'

interface Col1PropertiesPanelProps {
  value: Col1Fields
  onChange: (next: Col1Fields) => void
  doc: EmailDocument
  onChangeGlobal: (next: GlobalFields) => void
}

/**
 * Panel del bloque COL1 cuando está seleccionado el módulo entero (no una
 * molécula puntual de una de sus 2 áreas libres — mismo criterio que
 * TitlePropertiesPanel). Los catálogos "+ Agregar molécula" de las áreas
 * "arriba"/"abajo" viven en ui/InspectorPanel.tsx, no acá — mismo motivo que
 * Título: insertar necesita `onInsertModuleItem`, una acción del store que
 * este componente no recibe.
 *
 * `hidden={{ align: true }}`: el maestro de este módulo no trae ningún token
 * de alineado (ver la nota grande en render.ts) — mostrar el select sería un
 * control que no cambia nada visible.
 */
export function Col1PropertiesPanel({ value, onChange }: Col1PropertiesPanelProps) {
  return (
    <div className="properties-panel">
      <p className="field-group-label">Imagen</p>
      <label className="field">
        <span>URL de la imagen</span>
        <input
          type="text"
          value={value.image.imageUrl}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, image: { ...value.image, imageUrl: e.target.value } })}
        />
      </label>
      <label className="field field-checkbox">
        <input
          type="checkbox"
          checked={value.image.borderRadiusEnabled}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onChange({ ...value, image: { ...value.image, borderRadiusEnabled: e.target.checked } })
          }
        />
        <span>Esquinas redondeadas</span>
      </label>
      <GeneralFieldsPanel value={value} onChange={onChange} hidden={{ align: true }} />
    </div>
  )
}
