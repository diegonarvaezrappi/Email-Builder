import type { ChangeEvent } from 'react'
import type { EmailDocument } from '../../model'
import type { GlobalFields } from '../../global/schema'
import { GeneralFieldsPanel } from '../contentModules/GeneralFieldsPanel'
import type { BeneficiosFields } from './schema'

interface BeneficiosPropertiesPanelProps {
  value: BeneficiosFields
  onChange: (next: BeneficiosFields) => void
  doc: EmailDocument
  onChangeGlobal: (next: GlobalFields) => void
}

/**
 * Panel del bloque BENEFICIOS cuando está seleccionado el módulo entero — los
 * 3 toggles generales (GeneralFieldsPanel, igual que TITLE/BULLET) MÁS los
 * campos propios de la celda 1 fija (imagen no removible: URL + border-radius,
 * mismo criterio que IMG_AUTOMATICA_MOLECULA/MODULO). El catálogo para
 * AGREGAR moléculas a la celda 2 (el área libre) vive en ui/InspectorPanel.tsx,
 * mismo criterio que TITLE/BULLET.
 */
export function BeneficiosPropertiesPanel({ value, onChange }: BeneficiosPropertiesPanelProps) {
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
      <GeneralFieldsPanel value={value} onChange={onChange} />
    </div>
  )
}
