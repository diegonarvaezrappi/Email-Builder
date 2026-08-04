import type { ChangeEvent } from 'react'
import { BANNER_TYPE_LABELS } from './schema'
import type { BannerFields } from './schema'
import { getBannerItemDef } from '../../bannerItemRegistry'

interface BannerPropertiesPanelProps {
  value: BannerFields
  onChange: (next: BannerFields) => void
}

export function BannerPropertiesPanel({ value, onChange }: BannerPropertiesPanelProps) {
  const set = <K extends keyof BannerFields>(key: K, next: BannerFields[K]) => {
    onChange({ ...value, [key]: next })
  }

  // Piezas que quedaron en el documento pero no tienen archivo/comportamiento
  // para la orientación actual (ej. se agregó "Imagen automática (módulo)" en
  // horizontal y después se cambió a vertical) — no se borran solas (ver
  // components/banner/render.ts), se listan acá para poder eliminarlas a mano.
  const hiddenItems = value.items.filter((item) => {
    const def = getBannerItemDef(item.type)
    return def && !def.orientations.includes(value.bannerType)
  })

  const removeItem = (id: string) => {
    onChange({ ...value, items: value.items.filter((item) => item.id !== id) })
  }

  return (
    <div className="properties-panel">
      <label className="field">
        <span>Enlace del banner</span>
        <input
          type="text"
          placeholder="https://..."
          value={value.link}
          onChange={(e: ChangeEvent<HTMLInputElement>) => set('link', e.target.value)}
        />
        <span className="field-hint">
          Si agregás un CTA interno o una imagen con enlace propio, dejá este campo vacío para no anidar enlaces.
        </span>
      </label>

      <label className="field field-checkbox">
        <input
          type="checkbox"
          checked={value.backgroundEnabled}
          onChange={(e: ChangeEvent<HTMLInputElement>) => set('backgroundEnabled', e.target.checked)}
        />
        <span>Fondo del banner (color/imagen por defecto del tema)</span>
      </label>

      {hiddenItems.length > 0 && (
        <div className="field">
          <span>Piezas ocultas (no aplican al tipo "{BANNER_TYPE_LABELS[value.bannerType]}")</span>
          {hiddenItems.map((item) => (
            <div className="field-row" key={item.id}>
              <span>{getBannerItemDef(item.type)?.label ?? item.type}</span>
              <button type="button" onClick={() => removeItem(item.id)} aria-label={`Eliminar ${item.type}`}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
