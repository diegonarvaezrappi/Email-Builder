import type { ChangeEvent } from 'react'
import { TIPO_FOOTER_VALUES, TIPO_FOOTER_LABELS } from './schema'
import type { FooterFields } from './schema'

interface FooterPropertiesPanelProps {
  value: FooterFields
  onChange: (next: FooterFields) => void
}

export function FooterPropertiesPanel({ value, onChange }: FooterPropertiesPanelProps) {
  const set = <K extends keyof FooterFields>(key: K, next: FooterFields[K]) => {
    onChange({ ...value, [key]: next })
  }

  return (
    <div className="properties-panel">
      <label className="field">
        <span>Tipo de Footer</span>
        <select
          value={value.tipoFooter}
          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
            set('tipoFooter', e.target.value as FooterFields['tipoFooter'])
          }
        >
          {TIPO_FOOTER_VALUES.map((tf) => (
            <option key={tf} value={tf}>
              {TIPO_FOOTER_LABELS[tf]}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Legales adicionales</span>
        <textarea
          rows={3}
          placeholder="Texto legal adicional (puede incluir una URL)"
          value={value.legalesAdicionales}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => set('legalesAdicionales', e.target.value)}
        />
      </label>

      {value.tipoFooter !== 'RTS' && (
        <>
          <label className="field field-checkbox">
            <input
              type="checkbox"
              checked={value.legalPromos}
              onChange={(e: ChangeEvent<HTMLInputElement>) => set('legalPromos', e.target.checked)}
            />
            <span>Legal promos</span>
          </label>

          <label className="field field-checkbox">
            <input
              type="checkbox"
              checked={value.legalTurbo}
              onChange={(e: ChangeEvent<HTMLInputElement>) => set('legalTurbo', e.target.checked)}
            />
            <span>Legal turbo</span>
          </label>

          <label className="field field-checkbox">
            <input
              type="checkbox"
              checked={value.legalLicores}
              onChange={(e: ChangeEvent<HTMLInputElement>) => set('legalLicores', e.target.checked)}
            />
            <span>Legal licores</span>
          </label>
        </>
      )}
    </div>
  )
}
