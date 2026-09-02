import type { ChangeEvent } from 'react'
import type { EmailDocument } from '../../model'
import type { GlobalFields } from '../../global/schema'
import { GeneralFieldsPanel } from '../contentModules/GeneralFieldsPanel'
import {
  LOGOS_CELL_ORDER_LABELS,
  LOGOS_CELL_ORDER_VALUES,
  LOGOS_GRID_SIZE_LABELS,
  LOGOS_GRID_SIZE_VALUES,
  type LogoFields,
  type LogosFields,
} from './schema'

interface LogosPropertiesPanelProps {
  value: LogosFields
  onChange: (next: LogosFields) => void
  doc: EmailDocument
  onChangeGlobal: (next: GlobalFields) => void
}

/**
 * Panel del bloque LOGOS cuando está seleccionado el módulo entero. Mismo
 * criterio que Col2PropertiesPanel: SÍ reusa GeneralFieldsPanel tal cual
 * (fondo/click/alineado son variables de módulo únicas, no por logo). Los
 * campos de cada logo se muestran solo hasta `gridSize` — los que quedan
 * "de más" en el tuple de 6 se conservan pero no se ven, para no perder lo
 * cargado si el usuario vuelve a agrandar la grilla (ver la nota grande de
 * schema.ts).
 */
export function LogosPropertiesPanel({ value, onChange }: LogosPropertiesPanelProps) {
  const updateLogo = (index: number, patch: Partial<LogoFields>) => {
    const logos = [...value.logos] as LogosFields['logos']
    logos[index] = { ...logos[index], ...patch }
    onChange({ ...value, logos })
  }

  const visibleCount = Number(value.gridSize)

  return (
    <div className="properties-panel">
      <label className="field">
        <span>Cantidad de logos</span>
        <select
          value={value.gridSize}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange({ ...value, gridSize: e.target.value as LogosFields['gridSize'] })}
        >
          {LOGOS_GRID_SIZE_VALUES.map((s) => (
            <option key={s} value={s}>
              {LOGOS_GRID_SIZE_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Orden de celdas</span>
        <select
          value={value.cellOrder}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange({ ...value, cellOrder: e.target.value as LogosFields['cellOrder'] })}
        >
          {LOGOS_CELL_ORDER_VALUES.map((o) => (
            <option key={o} value={o}>
              {LOGOS_CELL_ORDER_LABELS[o]}
            </option>
          ))}
        </select>
      </label>
      <label className="field field-checkbox">
        <input
          type="checkbox"
          checked={value.logosBorderRadiusEnabled}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, logosBorderRadiusEnabled: e.target.checked })}
        />
        <span>Esquinas redondeadas (todos los logos)</span>
      </label>

      {value.logos.slice(0, visibleCount).map((logo, index) => (
        <div key={index} className="module-area-catalog">
          <p className="field-group-label">Logo {index + 1}</p>
          <label className="field">
            <span>URL de la imagen</span>
            <input
              type="text"
              value={logo.imageUrl}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateLogo(index, { imageUrl: e.target.value })}
            />
          </label>
          <label className="field field-checkbox">
            <input
              type="checkbox"
              checked={logo.linkEnabled}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateLogo(index, { linkEnabled: e.target.checked })}
            />
            <span>Logo clickeable</span>
          </label>
          <label className="field">
            <span>Enlace del logo</span>
            <input
              type="text"
              placeholder="https://..."
              disabled={!logo.linkEnabled}
              value={logo.link}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateLogo(index, { link: e.target.value })}
            />
          </label>
        </div>
      ))}

      <GeneralFieldsPanel value={value} onChange={onChange} />
    </div>
  )
}
