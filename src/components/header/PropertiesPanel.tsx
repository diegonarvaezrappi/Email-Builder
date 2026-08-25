import type { ChangeEvent } from 'react'
import {
  HEADER_BRAND_VALUES,
  HEADER_BRAND_LABELS,
  HEADER_LAYOUT_VALUES,
  HEADER_LAYOUT_LABELS,
  HEADER_LOGO_BACKGROUND_VALUES,
  HEADER_LOGO_BACKGROUND_LABELS,
  HEADER_LOGO_SIZE_VALUES,
  HEADER_LOGO_SIZE_LABELS,
  COBRANDING_SIZE_VALUES,
  COBRANDING_SIZE_LABELS,
} from './schema'
import type { HeaderFields } from './schema'

interface HeaderPropertiesPanelProps {
  value: HeaderFields
  onChange: (next: HeaderFields) => void
}

/** Valor especial del <select> de Marca, distinto de cualquier HeaderBrand
 *  real — ver `customLogo` en schema.ts para por qué no se agrega a
 *  HEADER_BRAND_VALUES. */
const CUSTOM_BRAND_OPTION = 'personalizado'

export function HeaderPropertiesPanel({ value, onChange }: HeaderPropertiesPanelProps) {
  const set = <K extends keyof HeaderFields>(key: K, next: HeaderFields[K]) => {
    onChange({ ...value, [key]: next })
  }

  const brandSelectValue = value.customLogo ? CUSTOM_BRAND_OPTION : value.brand

  const handleBrandChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value
    if (next === CUSTOM_BRAND_OPTION) {
      onChange({ ...value, customLogo: true })
      return
    }
    onChange({ ...value, customLogo: false, brand: next as HeaderFields['brand'] })
  }

  return (
    <div className="properties-panel">
      <label className="field">
        <span>Marca</span>
        <select value={brandSelectValue} onChange={handleBrandChange}>
          {HEADER_BRAND_VALUES.map((b) => (
            <option key={b} value={b}>
              {HEADER_BRAND_LABELS[b]}
            </option>
          ))}
          <option value={CUSTOM_BRAND_OPTION}>Personalizado</option>
        </select>
      </label>

      <label className="field">
        <span>Disposición</span>
        <select
          value={value.layout}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => set('layout', e.target.value as HeaderFields['layout'])}
        >
          {HEADER_LAYOUT_VALUES.map((l) => (
            <option key={l} value={l}>
              {HEADER_LAYOUT_LABELS[l]}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Versión del logo</span>
        <select
          value={value.logoBackground}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => set('logoBackground', e.target.value as HeaderFields['logoBackground'])}
        >
          {HEADER_LOGO_BACKGROUND_VALUES.map((bg) => (
            <option key={bg} value={bg}>
              {HEADER_LOGO_BACKGROUND_LABELS[bg]}
            </option>
          ))}
        </select>
      </label>

      {value.customLogo && (
        <>
          <label className="field">
            <span>URL del logo personalizado</span>
            <input
              type="text"
              placeholder="https://..."
              value={value.logoUrl}
              onChange={(e: ChangeEvent<HTMLInputElement>) => set('logoUrl', e.target.value)}
            />
          </label>

          <label className="field">
            <span>Tamaño del logo</span>
            <select
              value={value.logoSize}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => set('logoSize', e.target.value as HeaderFields['logoSize'])}
            >
              {HEADER_LOGO_SIZE_VALUES.map((s) => (
                <option key={s} value={s}>
                  {HEADER_LOGO_SIZE_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      <label className="field field-checkbox">
        <input
          type="checkbox"
          checked={value.cobranding}
          onChange={(e: ChangeEvent<HTMLInputElement>) => set('cobranding', e.target.checked)}
        />
        <span>Cobranding</span>
      </label>

      {value.cobranding && (
        <>
          <label className="field">
            <span>URL de la imagen de cobranding</span>
            <input
              type="text"
              value={value.cobrandingImageUrl}
              onChange={(e: ChangeEvent<HTMLInputElement>) => set('cobrandingImageUrl', e.target.value)}
            />
          </label>

          <label className="field">
            <span>Tamaño del cobranding</span>
            <select
              value={value.cobrandingSize}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => set('cobrandingSize', e.target.value as HeaderFields['cobrandingSize'])}
            >
              {COBRANDING_SIZE_VALUES.map((s) => (
                <option key={s} value={s}>
                  {COBRANDING_SIZE_LABELS[s]}
                </option>
              ))}
            </select>
          </label>

          <label className="field field-checkbox">
            <input
              type="checkbox"
              checked={value.cobrandingRounded}
              onChange={(e: ChangeEvent<HTMLInputElement>) => set('cobrandingRounded', e.target.checked)}
            />
            <span>Esquinas redondeadas</span>
          </label>
        </>
      )}
    </div>
  )
}
