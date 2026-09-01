import type { ChangeEvent } from 'react'
import type { EmailDocument } from '../../model'
import type { GlobalFields } from '../../global/schema'
import { GeneralFieldsPanel } from '../contentModules/GeneralFieldsPanel'
import {
  COL2_CELL_ORDER_LABELS,
  COL2_CELL_ORDER_VALUES,
  COL2_IMAGE_MODE_LABELS,
  COL2_IMAGE_MODE_VALUES,
  type Col2Fields,
} from './schema'

interface Col2PropertiesPanelProps {
  value: Col2Fields
  onChange: (next: Col2Fields) => void
  doc: EmailDocument
  onChangeGlobal: (next: GlobalFields) => void
}

/**
 * Panel del bloque COL2 cuando está seleccionado el módulo entero. A
 * diferencia de COL3, acá SÍ reusa GeneralFieldsPanel tal cual (fondo/click/
 * alineado son variables de módulo únicas, no por celda — ver schema.ts) —
 * los campos propios de este módulo (orden de celdas, imagen, fondo de la
 * imagen) se agregan alrededor. El catálogo "+ Agregar molécula" del área
 * libre vive en ui/InspectorPanel.tsx, mismo criterio que el resto.
 */
export function Col2PropertiesPanel({ value, onChange }: Col2PropertiesPanelProps) {
  return (
    <div className="properties-panel">
      <label className="field">
        <span>Orden de celdas</span>
        <select
          value={value.cellOrder}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange({ ...value, cellOrder: e.target.value as Col2Fields['cellOrder'] })}
        >
          {COL2_CELL_ORDER_VALUES.map((o) => (
            <option key={o} value={o}>
              {COL2_CELL_ORDER_LABELS[o]}
            </option>
          ))}
        </select>
      </label>

      <p className="field-group-label">Imagen</p>
      <label className="field">
        <span>URL de la imagen</span>
        <input
          type="text"
          value={value.image.imageUrl}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, image: { ...value.image, imageUrl: e.target.value } })}
        />
      </label>
      <label className="field">
        <span>Modo</span>
        <select
          value={value.image.mode}
          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
            onChange({ ...value, image: { ...value.image, mode: e.target.value as Col2Fields['image']['mode'] } })
          }
        >
          {COL2_IMAGE_MODE_VALUES.map((m) => (
            <option key={m} value={m}>
              {COL2_IMAGE_MODE_LABELS[m]}
            </option>
          ))}
        </select>
      </label>
      {value.image.mode === 'modificable' && (
        <label className="field">
          <span>Ancho (%)</span>
          <input
            type="text"
            value={value.image.widthPercent}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, image: { ...value.image, widthPercent: e.target.value } })}
          />
        </label>
      )}
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
      <label className="field field-checkbox">
        <input
          type="checkbox"
          checked={value.imageBackgroundEnabled}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, imageBackgroundEnabled: e.target.checked })}
        />
        <span>Fondo de la imagen</span>
      </label>

      <GeneralFieldsPanel value={value} onChange={onChange} />
    </div>
  )
}
