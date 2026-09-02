import type { ChangeEvent } from 'react'
import type { EmailDocument } from '../../model'
import type { GlobalFields } from '../../global/schema'
import { createDefaultCuponCellFields, createDefaultTituloCellFields, type CuponesCellFields, type CuponesFields } from './schema'

interface CuponesPropertiesPanelProps {
  value: CuponesFields
  onChange: (next: CuponesFields) => void
  doc: EmailDocument
  onChangeGlobal: (next: GlobalFields) => void
}

const CELL_LABELS = ['Celda 1', 'Celda 2']
const CELL_TYPE_LABELS: Record<CuponesCellFields['type'], string> = { cupon: 'Cupón', titulo: 'Título' }

/**
 * Panel del bloque CUPONES cuando está seleccionado el módulo entero — mismo
 * criterio que Col3PropertiesPanel: NO reusa GeneralFieldsPanel (el maestro
 * dice explícito que fondo/alineado no son togglables acá, ver el comentario
 * grande de schema.ts) y muestra los campos de las 2 celdas inline, una
 * debajo de la otra, sin selección por click en el lienzo. El selector de
 * tipo reemplaza los campos de la celda por un default fresco del tipo
 * elegido — no preserva nada de la celda anterior (mismo criterio "sin magia
 * por campo" del resto de la app). El catálogo "+ Agregar molécula" de cada
 * celda (solo tiene efecto visible en celdas tipo 'cupon') vive en
 * ui/InspectorPanel.tsx, mismo criterio que el resto de los módulos con área
 * libre.
 */
export function CuponesPropertiesPanel({ value, onChange }: CuponesPropertiesPanelProps) {
  const updateCell = (index: number, cell: CuponesCellFields) => {
    const cells = [...value.cells] as CuponesFields['cells']
    cells[index] = cell
    onChange({ ...value, cells })
  }

  const setCellType = (index: number, type: CuponesCellFields['type']) => {
    updateCell(index, type === 'cupon' ? createDefaultCuponCellFields() : createDefaultTituloCellFields())
  }

  return (
    <div className="properties-panel">
      {value.cells.map((cell, index) => (
        <div key={index} className="module-area-catalog">
          <p className="field-group-label">{CELL_LABELS[index]}</p>
          <label className="field">
            <span>Tipo de celda</span>
            <select value={cell.type} onChange={(e: ChangeEvent<HTMLSelectElement>) => setCellType(index, e.target.value as CuponesCellFields['type'])}>
              {(Object.keys(CELL_TYPE_LABELS) as CuponesCellFields['type'][]).map((t) => (
                <option key={t} value={t}>
                  {CELL_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>

          {cell.type === 'cupon' ? (
            <>
              <label className="field">
                <span>URL de la imagen</span>
                <input
                  type="text"
                  value={cell.imageUrl}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => updateCell(index, { ...cell, imageUrl: e.target.value })}
                />
              </label>
              <label className="field field-checkbox">
                <input
                  type="checkbox"
                  checked={cell.borderRadiusEnabled}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => updateCell(index, { ...cell, borderRadiusEnabled: e.target.checked })}
                />
                <span>Esquinas redondeadas</span>
              </label>
            </>
          ) : (
            <>
              <label className="field">
                <span>URL del ícono del tag</span>
                <input
                  type="text"
                  value={cell.tagIconUrl}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => updateCell(index, { ...cell, tagIconUrl: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Texto</span>
                <input
                  type="text"
                  value={cell.titleText}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => updateCell(index, { ...cell, titleText: e.target.value })}
                />
              </label>
            </>
          )}

          <label className="field field-checkbox">
            <input
              type="checkbox"
              checked={cell.linkEnabled}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateCell(index, { ...cell, linkEnabled: e.target.checked })}
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
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateCell(index, { ...cell, link: e.target.value })}
            />
          </label>

          <label className="field field-checkbox">
            <input
              type="checkbox"
              checked={cell.legalEnabled}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateCell(index, { ...cell, legalEnabled: e.target.checked })}
            />
            <span>Legales</span>
          </label>
          <label className="field">
            <span>Texto legal</span>
            <input
              type="text"
              disabled={!cell.legalEnabled}
              value={cell.legalText}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateCell(index, { ...cell, legalText: e.target.value })}
            />
          </label>
        </div>
      ))}
    </div>
  )
}
