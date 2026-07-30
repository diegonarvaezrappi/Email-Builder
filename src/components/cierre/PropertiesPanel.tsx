import type { ChangeEvent } from 'react'
import { CIERRE_VARIANT_VALUES, CIERRE_VARIANT_LABELS } from './schema'
import type { CierreFields } from './schema'

interface CierrePropertiesPanelProps {
  value: CierreFields
  onChange: (next: CierreFields) => void
}

export function CierrePropertiesPanel({ value, onChange }: CierrePropertiesPanelProps) {
  const set = <K extends keyof CierreFields>(key: K, next: CierreFields[K]) => {
    onChange({ ...value, [key]: next })
  }

  return (
    <div className="properties-panel">
      {value.removed && (
        <p className="inspector-hint">
          Este componente fue eliminado del email. Arrástralo desde el panel de componentes para restaurarlo.
        </p>
      )}

      <label className="field">
        <span>Variante</span>
        <select
          value={value.variant}
          disabled={value.removed}
          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
            set('variant', e.target.value as CierreFields['variant'])
          }
        >
          {CIERRE_VARIANT_VALUES.map((v) => (
            <option key={v} value={v}>
              {CIERRE_VARIANT_LABELS[v]}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
