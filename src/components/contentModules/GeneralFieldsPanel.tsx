import type { ChangeEvent } from 'react'
import { MODULE_ALIGN_LABELS, MODULE_ALIGN_VALUES, type GeneralModuleFields } from './generalFields'

interface GeneralFieldsPanelProps<T extends GeneralModuleFields> {
  value: T
  onChange: (next: T) => void
  /** Oculta un toggle puntual para un módulo que no lo soporta (ej. un futuro
   *  campo de fondo propio de una imagen, independiente del fondo general) —
   *  ningún módulo de la fase 2 lo necesita todavía, existe para que el
   *  próximo no tenga que reinventar el fragmento. */
  hidden?: { link?: boolean; background?: boolean; align?: boolean }
}

/**
 * Fragmento compartido por el PropertiesPanel de todo módulo de body que
 * spreadee generalModuleFieldsSchema — ver el comentario grande de
 * generalFields.ts. Cupones (cuando exista) no lo renderiza en absoluto: su
 * schema no trae backgroundEnabled/align, y su link es POR CELDA, no general.
 *
 * Genérico sobre `T` (no fijo a GeneralModuleFields) a propósito: el
 * `value`/`onChange` de cada módulo trae MÁS campos que los 4 generales (ej.
 * TitleFields también tiene `items`) — sin el genérico, `{ ...value, patch }`
 * perdería esos campos extra en el TIPO (aunque no en el valor real), y
 * `onChange` no aceptaría el objeto resultante.
 */
export function GeneralFieldsPanel<T extends GeneralModuleFields>({ value, onChange, hidden }: GeneralFieldsPanelProps<T>) {
  return (
    <>
      {!hidden?.link && (
        <>
          <label className="field field-checkbox">
            <input
              type="checkbox"
              checked={value.linkEnabled}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, linkEnabled: e.target.checked })}
            />
            <span>Módulo clickeable</span>
          </label>
          <label className="field">
            <span>Enlace del módulo</span>
            <input
              type="text"
              placeholder="https://..."
              disabled={!value.linkEnabled}
              value={value.link}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, link: e.target.value })}
            />
          </label>
        </>
      )}
      {!hidden?.background && (
        <label className="field field-checkbox">
          <input
            type="checkbox"
            checked={value.backgroundEnabled}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, backgroundEnabled: e.target.checked })}
          />
          <span>Fondo del módulo</span>
        </label>
      )}
      {!hidden?.align && (
        <label className="field">
          <span>Alineado</span>
          <select
            value={value.align}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange({ ...value, align: e.target.value as GeneralModuleFields['align'] })}
          >
            {MODULE_ALIGN_VALUES.map((a) => (
              <option key={a} value={a}>
                {MODULE_ALIGN_LABELS[a]}
              </option>
            ))}
          </select>
        </label>
      )}
    </>
  )
}
