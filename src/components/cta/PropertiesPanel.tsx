import type { ChangeEvent } from 'react'
import { CTA_ALIGN_VALUES, CTA_ALIGN_LABELS, CTA_SIZE_VALUES, CTA_SIZE_LABELS } from './schema'
import type { CtaFields } from './schema'
import { CTA_STYLE_SELECT_VALUES, CTA_STYLE_SELECT_LABELS } from '../../global/schema'
import type { EmailDocument } from '../../model'
import type { GlobalFields } from '../../global/schema'

interface CtaPropertiesPanelProps {
  value: CtaFields
  onChange: (next: CtaFields) => void
  doc: EmailDocument
  onChangeGlobal: (next: GlobalFields) => void
}

export function CtaPropertiesPanel({ value, onChange, doc, onChangeGlobal }: CtaPropertiesPanelProps) {
  const set = <K extends keyof CtaFields>(key: K, next: CtaFields[K]) => {
    onChange({ ...value, [key]: next })
  }

  return (
    <div className="properties-panel">
      <label className="field">
        <span>Texto del botón</span>
        <input
          type="text"
          maxLength={60}
          value={value.text}
          onChange={(e: ChangeEvent<HTMLInputElement>) => set('text', e.target.value)}
        />
        <span className="field-hint">{value.text.length}/35 (se trunca automáticamente)</span>
      </label>

      <label className="field">
        <span>Enlace</span>
        <input
          type="text"
          placeholder="https://..."
          value={value.deeplink}
          onChange={(e: ChangeEvent<HTMLInputElement>) => set('deeplink', e.target.value)}
        />
      </label>

      <label className="field">
        <span>Alineación</span>
        <select
          value={value.align}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => set('align', e.target.value as CtaFields['align'])}
        >
          {CTA_ALIGN_VALUES.map((a) => (
            <option key={a} value={a}>
              {CTA_ALIGN_LABELS[a]}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Tamaño</span>
        <select value={value.size} onChange={(e: ChangeEvent<HTMLSelectElement>) => set('size', e.target.value as CtaFields['size'])}>
          {CTA_SIZE_VALUES.map((s) => (
            <option key={s} value={s}>
              {CTA_SIZE_LABELS[s]}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Estilo del botón (aplica a TODOS los CTA del mail)</span>
        <select
          value={doc.global.ctaStyle}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => onChangeGlobal({ ...doc.global, ctaStyle: e.target.value as GlobalFields['ctaStyle'] })}
        >
          {CTA_STYLE_SELECT_VALUES.map((s) => (
            <option key={s} value={s}>
              {CTA_STYLE_SELECT_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
