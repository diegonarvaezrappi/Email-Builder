import type { ChangeEvent } from 'react'
import type { EmailDocument } from '../model'
import type { GlobalFields } from '../global/schema'
import { CTA_SIZE_LABELS, CTA_SIZE_VALUES, type CtaSize } from '../components/cta/schema'
import { CtaInternoPropertiesPanel } from '../components/banner/items/panels'
import { RichTextInput } from '../richText/RichTextInput'
import { richTextColorsForTema } from '../richText/themeColors'
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
  type ModuleCtaFields,
  type SeparadorLineaFields,
  type SubtituloTextoFields,
  type TituloTextoFields,
} from './schemas'

export function TituloTextoPropertiesPanel({
  value,
  onChange,
  doc,
}: {
  value: TituloTextoFields
  onChange: (next: TituloTextoFields) => void
  doc: EmailDocument
}) {
  return (
    <div className="properties-panel">
      <label className="field">
        <span>Título</span>
        <RichTextInput value={value.text} onChange={(text) => onChange({ text })} colors={richTextColorsForTema(doc.global.tema)} />
      </label>
    </div>
  )
}

export function SubtituloTextoPropertiesPanel({
  value,
  onChange,
  doc,
}: {
  value: SubtituloTextoFields
  onChange: (next: SubtituloTextoFields) => void
  doc: EmailDocument
}) {
  return (
    <div className="properties-panel">
      <label className="field">
        <span>Subtítulo</span>
        <RichTextInput value={value.text} onChange={(text) => onChange({ text })} colors={richTextColorsForTema(doc.global.tema)} />
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

export function BulletIconoPropertiesPanel({
  value,
  onChange,
  doc,
}: {
  value: BulletIconoFields
  onChange: (next: BulletIconoFields) => void
  doc: EmailDocument
}) {
  return (
    <div className="properties-panel">
      <label className="field">
        <span>Tamaño del ícono</span>
        <select
          value={value.size}
          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
            onChange({
              ...value,
              size: e.target.value as BulletIconoFields['size'],
            })
          }
        >
          {BULLET_ICONO_SIZE_VALUES.map((s) => (
            <option key={s} value={s}>
              {BULLET_ICONO_SIZE_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>URL del ícono</span>
        <input type="text" value={value.imageUrl} onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, imageUrl: e.target.value })} />
        <span className="field-hint">Vacío = el bullet se muestra sin ícono.</span>
      </label>
      <label className="field">
        <span>Alt del ícono</span>
        <input type="text" value={value.imageAlt} onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, imageAlt: e.target.value })} />
      </label>
      <label className="field">
        <span>Título</span>
        <RichTextInput
          value={value.titulo}
          onChange={(titulo) => onChange({ ...value, titulo })}
          colors={richTextColorsForTema(doc.global.tema)}
        />
      </label>
      <label className="field">
        <span>Texto</span>
        <RichTextInput
          value={value.texto}
          onChange={(texto) => onChange({ ...value, texto })}
          colors={richTextColorsForTema(doc.global.tema)}
        />
      </label>
    </div>
  )
}

export function BulletNumeradoPropertiesPanel({
  value,
  onChange,
  doc,
}: {
  value: BulletNumeradoFields
  onChange: (next: BulletNumeradoFields) => void
  doc: EmailDocument
}) {
  return (
    <div className="properties-panel">
      <label className="field">
        <span>Número</span>
        <RichTextInput
          value={value.numero}
          onChange={(numero) => onChange({ ...value, numero })}
          colors={richTextColorsForTema(doc.global.tema)}
        />
      </label>
      <label className="field">
        <span>Título</span>
        <RichTextInput
          value={value.titulo}
          onChange={(titulo) => onChange({ ...value, titulo })}
          colors={richTextColorsForTema(doc.global.tema)}
        />
      </label>
      <label className="field">
        <span>Texto</span>
        <RichTextInput
          value={value.texto}
          onChange={(texto) => onChange({ ...value, texto })}
          colors={richTextColorsForTema(doc.global.tema)}
        />
      </label>
    </div>
  )
}

export function IconoPropertiesPanel({ value, onChange }: { value: IconoFields; onChange: (next: IconoFields) => void }) {
  return (
    <div className="properties-panel">
      <label className="field">
        <span>URL de la imagen</span>
        <input
          type="text"
          value={value.imageUrl}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, imageUrl: e.target.value })}
        />
      </label>
      <label className="field">
        <span>Alt de la imagen</span>
        <input
          type="text"
          value={value.imageAlt}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, imageAlt: e.target.value })}
        />
      </label>
      <label className="field">
        <span>Tamaño</span>
        <select
          value={value.size}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange({ ...value, size: e.target.value as IconoFields['size'] })}
        >
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
  doc,
}: {
  value: BeneficiosTituloFields
  onChange: (next: BeneficiosTituloFields) => void
  doc: EmailDocument
}) {
  return (
    <div className="properties-panel">
      <label className="field">
        <span>Título</span>
        <RichTextInput value={value.text} onChange={(text) => onChange({ text })} colors={richTextColorsForTema(doc.global.tema)} />
      </label>
    </div>
  )
}

export function BeneficiosTextoPropertiesPanel({
  value,
  onChange,
  doc,
}: {
  value: BeneficiosTextoFields
  onChange: (next: BeneficiosTextoFields) => void
  doc: EmailDocument
}) {
  return (
    <div className="properties-panel">
      <label className="field">
        <span>Texto</span>
        <RichTextInput value={value.text} onChange={(text) => onChange({ text })} colors={richTextColorsForTema(doc.global.tema)} />
      </label>
    </div>
  )
}

export function ColumnaTextoPropertiesPanel({
  value,
  onChange,
  doc,
}: {
  value: ColumnaTextoFields
  onChange: (next: ColumnaTextoFields) => void
  doc: EmailDocument
}) {
  return (
    <div className="properties-panel">
      <label className="field">
        <span>Texto</span>
        <RichTextInput value={value.text} onChange={(text) => onChange({ text })} colors={richTextColorsForTema(doc.global.tema)} />
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
  doc,
}: {
  value: BulletIconoSimpleFields
  onChange: (next: BulletIconoSimpleFields) => void
  doc: EmailDocument
}) {
  return (
    <div className="properties-panel">
      <label className="field">
        <span>URL del ícono</span>
        <input
          type="text"
          value={value.imageUrl}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, imageUrl: e.target.value })}
        />
      </label>
      <label className="field">
        <span>Alt del ícono</span>
        <input
          type="text"
          value={value.imageAlt}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, imageAlt: e.target.value })}
        />
      </label>
      <label className="field">
        <span>Texto</span>
        <RichTextInput
          value={value.text}
          onChange={(text) => onChange({ ...value, text })}
          colors={richTextColorsForTema(doc.global.tema)}
        />
      </label>
    </div>
  )
}

export function CuponMontoPropertiesPanel({
  value,
  onChange,
  doc,
}: {
  value: CuponMontoFields
  onChange: (next: CuponMontoFields) => void
  doc: EmailDocument
}) {
  return (
    <div className="properties-panel">
      <label className="field">
        <span>Texto destacado</span>
        <RichTextInput value={value.text} onChange={(text) => onChange({ text })} colors={richTextColorsForTema(doc.global.tema)} />
      </label>
    </div>
  )
}

/** El CTA de un módulo: el mismo panel del CTA interno del banner (texto,
 *  enlace, estilo global) más el tamaño, que en el banner no se elige. */
export function ModuleCtaPropertiesPanel({
  value,
  onChange,
  doc,
  onChangeGlobal,
}: {
  value: ModuleCtaFields
  onChange: (next: ModuleCtaFields) => void
  doc: EmailDocument
  onChangeGlobal: (next: GlobalFields) => void
}) {
  return (
    <>
      <CtaInternoPropertiesPanel
        value={value}
        onChange={(next) => onChange({ ...value, ...next })}
        doc={doc}
        onChangeGlobal={onChangeGlobal}
      />
      <div className="properties-panel">
        <label className="field">
          <span>Tamaño</span>
          <select
            value={value.size}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange({ ...value, size: e.target.value as CtaSize })}
          >
            {CTA_SIZE_VALUES.map((s) => (
              <option key={s} value={s}>
                {CTA_SIZE_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
      </div>
    </>
  )
}
