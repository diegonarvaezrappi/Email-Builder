import type { ChangeEvent } from 'react'
import {
  BANNER_HORIZONTAL_MOLECULE_ALIGN_LABELS,
  BANNER_HORIZONTAL_MOLECULE_ALIGN_VALUES,
  BANNER_MOLECULE_ALIGN_LABELS,
  BANNER_MOLECULE_ALIGN_VALUES,
  BANNER_TYPE_LABELS,
  BANNER_TYPE_TITLES,
  BANNER_TYPE_VALUES,
} from './schema'
import type { BannerFields, BannerType } from './schema'
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
      {/* Antes se elegía en el panel izquierdo; desde que el Hero admite varios
          banners (2026-10-28), cada uno cambia su tipo acá. */}
      <label className="field">
        <span>Tipo de banner</span>
        <select value={value.bannerType} onChange={(e: ChangeEvent<HTMLSelectElement>) => set('bannerType', e.target.value as BannerType)}>
          {BANNER_TYPE_VALUES.map((t) => (
            <option key={t} value={t}>
              {BANNER_TYPE_TITLES[t]}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Enlace del banner</span>
        <input
          type="text"
          placeholder="https://..."
          value={value.link}
          onChange={(e: ChangeEvent<HTMLInputElement>) => set('link', e.target.value)}
        />
        <span className="field-hint">
          Con un solo banner, este enlace envuelve todo el Hero (header incluido). Con varios banners, cada uno lleva el suyo y los
          headers quedan sin enlace. Si agregás un CTA interno o una imagen con enlace propio, dejá este campo vacío para no anidar
          enlaces.
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

      <label className="field field-checkbox">
        <input
          type="checkbox"
          checked={value.bottomSpacing}
          onChange={(e: ChangeEvent<HTMLInputElement>) => set('bottomSpacing', e.target.checked)}
        />
        <span>Espacio inferior del banner (antes de Contents)</span>
      </label>

      {value.bannerType === 'vertical' && (
        <label className="field">
          <span>Alineado de las moléculas</span>
          <select
            value={value.moleculeAlign}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => set('moleculeAlign', e.target.value as BannerFields['moleculeAlign'])}
          >
            {BANNER_MOLECULE_ALIGN_VALUES.map((a) => (
              <option key={a} value={a}>
                {BANNER_MOLECULE_ALIGN_LABELS[a]}
              </option>
            ))}
          </select>
        </label>
      )}

      {value.bannerType === 'horizontal' && (
        <label className="field">
          <span>Alineado de las moléculas</span>
          <select
            value={value.horizontalMoleculeAlign}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              set('horizontalMoleculeAlign', e.target.value as BannerFields['horizontalMoleculeAlign'])
            }
          >
            {BANNER_HORIZONTAL_MOLECULE_ALIGN_VALUES.map((a) => (
              <option key={a} value={a}>
                {BANNER_HORIZONTAL_MOLECULE_ALIGN_LABELS[a]}
              </option>
            ))}
          </select>
        </label>
      )}

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
