import type { ChangeEvent } from 'react'
import type { EmailDocument } from '../../model'
import type { GlobalFields } from '../../global/schema'
import { MODULE_ALIGN_LABELS, MODULE_ALIGN_VALUES } from '../contentModules/generalFields'
import { COL3_CELL_AREAS, type Col3CellFields, type Col3Fields } from './schema'

interface Col3PropertiesPanelProps {
  value: Col3Fields
  onChange: (next: Col3Fields) => void
  doc: EmailDocument
  onChangeGlobal: (next: GlobalFields) => void
}

const CELL_LABELS = ['Celda 1', 'Celda 2', 'Celda 3']

/**
 * Panel del bloque COL3 cuando está seleccionado el módulo entero. A
 * diferencia de TITLE/BULLET/BENEFICIOS/COL1, NO reusa GeneralFieldsPanel: el
 * maestro dice explícito que fondo/click son "celda por celda" (ver la nota
 * grande de schema.ts), así que esos 2 toggles se repiten 3 veces acá, uno
 * por celda — solo `align` es una única variable de módulo (arriba de todo).
 * El catálogo "+ Agregar molécula" de cada celda vive en ui/InspectorPanel.tsx,
 * mismo criterio que el resto de los módulos con área libre.
 */
export function Col3PropertiesPanel({ value, onChange }: Col3PropertiesPanelProps) {
  const updateCell = (index: number, patch: Partial<Col3CellFields>) => {
    const cells = [...value.cells] as Col3Fields['cells']
    cells[index] = { ...cells[index], ...patch }
    onChange({ ...value, cells })
  }

  return (
    <div className="properties-panel">
      <label className="field">
        <span>Alineado</span>
        <select
          value={value.align}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange({ ...value, align: e.target.value as Col3Fields['align'] })}
        >
          {MODULE_ALIGN_VALUES.map((a) => (
            <option key={a} value={a}>
              {MODULE_ALIGN_LABELS[a]}
            </option>
          ))}
        </select>
      </label>

      {COL3_CELL_AREAS.map((_areaKey, index) => {
        const cell = value.cells[index]
        return (
          <div key={index} className="module-area-catalog">
            <p className="field-group-label">{CELL_LABELS[index]}</p>
            <label className="field">
              <span>URL de la imagen</span>
              <input
                type="text"
                value={cell.image.imageUrl}
                onChange={(e: ChangeEvent<HTMLInputElement>) => updateCell(index, { image: { ...cell.image, imageUrl: e.target.value } })}
              />
            </label>
            <label className="field field-checkbox">
              <input
                type="checkbox"
                checked={cell.image.borderRadiusEnabled}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  updateCell(index, { image: { ...cell.image, borderRadiusEnabled: e.target.checked } })
                }
              />
              <span>Esquinas redondeadas</span>
            </label>
            <label className="field field-checkbox">
              <input
                type="checkbox"
                checked={cell.backgroundEnabled}
                onChange={(e: ChangeEvent<HTMLInputElement>) => updateCell(index, { backgroundEnabled: e.target.checked })}
              />
              <span>Fondo de la celda</span>
            </label>
            <label className="field field-checkbox">
              <input
                type="checkbox"
                checked={cell.linkEnabled}
                onChange={(e: ChangeEvent<HTMLInputElement>) => updateCell(index, { linkEnabled: e.target.checked })}
              />
              <span>Celda clickeable</span>
            </label>
            <label className="field">
              <span>Enlace de la celda</span>
              <input
                type="text"
                placeholder="https://..."
                disabled={!cell.linkEnabled}
                value={cell.link}
                onChange={(e: ChangeEvent<HTMLInputElement>) => updateCell(index, { link: e.target.value })}
              />
            </label>
          </div>
        )
      })}
    </div>
  )
}
