import type { ChangeEvent } from 'react'
import type { SeparadorLineaFields, SubtituloTextoFields, TituloTextoFields } from './schemas'

export function TituloTextoPropertiesPanel({ value, onChange }: { value: TituloTextoFields; onChange: (next: TituloTextoFields) => void }) {
  return (
    <div className="properties-panel">
      <label className="field">
        <span>Título</span>
        <input type="text" value={value.text} onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ text: e.target.value })} />
      </label>
    </div>
  )
}

export function SubtituloTextoPropertiesPanel({
  value,
  onChange,
}: {
  value: SubtituloTextoFields
  onChange: (next: SubtituloTextoFields) => void
}) {
  return (
    <div className="properties-panel">
      <label className="field">
        <span>Subtítulo</span>
        <input type="text" value={value.text} onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ text: e.target.value })} />
      </label>
    </div>
  )
}

/** Sin campos propios (ver moduleItems/schemas.ts) — el panel solo lo dice,
 *  no queda vacío y sin explicación. */
export function SeparadorLineaPropertiesPanel(_props: { value: SeparadorLineaFields; onChange: (next: SeparadorLineaFields) => void }) {
  return (
    <div className="properties-panel">
      <p className="field-hint">Línea decorativa fija, sin opciones.</p>
    </div>
  )
}
