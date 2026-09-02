import type { ChangeEvent } from 'react'
import {
  BULLET_ICONO_SIZE_LABELS,
  BULLET_ICONO_SIZE_VALUES,
  ICONO_SIZE_LABELS,
  ICONO_SIZE_VALUES,
  type BeneficiosTextoFields,
  type BeneficiosTituloFields,
  type BulletIconoFields,
  type BulletIconoSimpleFields,
  type BulletNumeradoFields,
  type ColumnaTextoFields,
  type CuponMontoFields,
  type IconoFields,
  type SeparadorLineaFields,
  type SubtituloTextoFields,
  type TituloTextoFields,
} from './schemas'

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

export function BulletIconoPropertiesPanel({ value, onChange }: { value: BulletIconoFields; onChange: (next: BulletIconoFields) => void }) {
  return (
    <div className="properties-panel">
      <label className="field">
        <span>Tamaño del ícono</span>
        <select
          value={value.size}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange({ ...value, size: e.target.value as BulletIconoFields['size'] })}
        >
          {BULLET_ICONO_SIZE_VALUES.map((s) => (
            <option key={s} value={s}>
              {BULLET_ICONO_SIZE_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Título</span>
        <input type="text" value={value.titulo} onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, titulo: e.target.value })} />
      </label>
      <label className="field">
        <span>Texto</span>
        <input type="text" value={value.texto} onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, texto: e.target.value })} />
      </label>
    </div>
  )
}

export function BulletNumeradoPropertiesPanel({
  value,
  onChange,
}: {
  value: BulletNumeradoFields
  onChange: (next: BulletNumeradoFields) => void
}) {
  return (
    <div className="properties-panel">
      <label className="field">
        <span>Número</span>
        <input type="text" value={value.numero} onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, numero: e.target.value })} />
      </label>
      <label className="field">
        <span>Título</span>
        <input type="text" value={value.titulo} onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, titulo: e.target.value })} />
      </label>
      <label className="field">
        <span>Texto</span>
        <input type="text" value={value.texto} onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, texto: e.target.value })} />
      </label>
    </div>
  )
}

export function IconoPropertiesPanel({ value, onChange }: { value: IconoFields; onChange: (next: IconoFields) => void }) {
  return (
    <div className="properties-panel">
      <label className="field">
        <span>URL de la imagen</span>
        <input type="text" value={value.imageUrl} onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, imageUrl: e.target.value })} />
      </label>
      <label className="field">
        <span>Tamaño</span>
        <select value={value.size} onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange({ ...value, size: e.target.value as IconoFields['size'] })}>
          {ICONO_SIZE_VALUES.map((s) => (
            <option key={s} value={s}>
              {ICONO_SIZE_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      <label className="field field-checkbox">
        <input
          type="checkbox"
          checked={value.borderRadiusEnabled}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, borderRadiusEnabled: e.target.checked })}
        />
        <span>Esquinas redondeadas</span>
      </label>
    </div>
  )
}

export function BeneficiosTituloPropertiesPanel({
  value,
  onChange,
}: {
  value: BeneficiosTituloFields
  onChange: (next: BeneficiosTituloFields) => void
}) {
  return (
    <div className="properties-panel">
      <label className="field">
        <span>Título</span>
        <input type="text" value={value.text} onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ text: e.target.value })} />
      </label>
    </div>
  )
}

export function BeneficiosTextoPropertiesPanel({
  value,
  onChange,
}: {
  value: BeneficiosTextoFields
  onChange: (next: BeneficiosTextoFields) => void
}) {
  return (
    <div className="properties-panel">
      <label className="field">
        <span>Texto</span>
        <input type="text" value={value.text} onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ text: e.target.value })} />
      </label>
    </div>
  )
}

export function ColumnaTextoPropertiesPanel({
  value,
  onChange,
}: {
  value: ColumnaTextoFields
  onChange: (next: ColumnaTextoFields) => void
}) {
  return (
    <div className="properties-panel">
      <label className="field">
        <span>Texto</span>
        <input type="text" value={value.text} onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ text: e.target.value })} />
      </label>
    </div>
  )
}

/** Sin control de tamaño (a diferencia de BulletIconoPropertiesPanel) y sin
 *  campo de título — ver bulletIconoSimpleFieldsSchema. URL en blanco quita el
 *  ícono ENTERO (comentario del maestro), mismo criterio visual que el resto
 *  de los campos de imagen de la app. */
export function BulletIconoSimplePropertiesPanel({
  value,
  onChange,
}: {
  value: BulletIconoSimpleFields
  onChange: (next: BulletIconoSimpleFields) => void
}) {
  return (
    <div className="properties-panel">
      <label className="field">
        <span>URL del ícono</span>
        <input type="text" value={value.imageUrl} onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, imageUrl: e.target.value })} />
      </label>
      <label className="field">
        <span>Texto</span>
        <input type="text" value={value.text} onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, text: e.target.value })} />
      </label>
    </div>
  )
}

export function CuponMontoPropertiesPanel({ value, onChange }: { value: CuponMontoFields; onChange: (next: CuponMontoFields) => void }) {
  return (
    <div className="properties-panel">
      <label className="field">
        <span>Texto destacado</span>
        <input type="text" value={value.text} onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ text: e.target.value })} />
      </label>
    </div>
  )
}
