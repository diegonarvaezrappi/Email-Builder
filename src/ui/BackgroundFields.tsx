// ============================================================================
// Campos de tamaño/posición/repeat compartidos por los 3 fondos del mail
// (General, HERO-SECTION, CONTENTS-SECTION) — pedido explícito del usuario
// (2026-09-16). El repeat se expone como 3 checkboxes (horizontal / vertical /
// no repetir), no un select con los 4 valores crudos de CSS — ver
// global/background.ts para la traducción entre ambas representaciones.
// ============================================================================
import type { ChangeEvent } from 'react'
import {
  BACKGROUND_POSITION_LABELS,
  BACKGROUND_POSITION_VALUES,
  BACKGROUND_SIZE_LABELS,
  BACKGROUND_SIZE_VALUES,
  isNoRepeat,
  repeatsX,
  repeatsY,
  withNoRepeat,
  withRepeatX,
  withRepeatY,
} from '../global/background'
import type { BackgroundPosition, BackgroundRepeat, BackgroundSize } from '../global/background'
import type { GlobalFields } from '../global/schema'

interface BackgroundSizePositionRepeatFieldsProps {
  size: BackgroundSize
  position: BackgroundPosition
  repeat: BackgroundRepeat
  onChangeSize: (next: BackgroundSize) => void
  onChangePosition: (next: BackgroundPosition) => void
  onChangeRepeat: (next: BackgroundRepeat) => void
}

export function BackgroundSizePositionRepeatFields({
  size,
  position,
  repeat,
  onChangeSize,
  onChangePosition,
  onChangeRepeat,
}: BackgroundSizePositionRepeatFieldsProps) {
  return (
    <>
      <label className="field">
        <span>Tamaño</span>
        <select value={size} onChange={(e: ChangeEvent<HTMLSelectElement>) => onChangeSize(e.target.value as BackgroundSize)}>
          {BACKGROUND_SIZE_VALUES.map((v) => (
            <option key={v} value={v}>
              {BACKGROUND_SIZE_LABELS[v]}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Posición</span>
        <select
          value={position}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => onChangePosition(e.target.value as BackgroundPosition)}
        >
          {BACKGROUND_POSITION_VALUES.map((v) => (
            <option key={v} value={v}>
              {BACKGROUND_POSITION_LABELS[v]}
            </option>
          ))}
        </select>
      </label>

      <label className="field field-checkbox">
        <input
          type="checkbox"
          checked={repeatsX(repeat)}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChangeRepeat(withRepeatX(repeat, e.target.checked))}
        />
        <span>Repetir horizontal</span>
      </label>

      <label className="field field-checkbox">
        <input
          type="checkbox"
          checked={repeatsY(repeat)}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChangeRepeat(withRepeatY(repeat, e.target.checked))}
        />
        <span>Repetir vertical</span>
      </label>

      <label className="field field-checkbox">
        <input
          type="checkbox"
          checked={isNoRepeat(repeat)}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChangeRepeat(withNoRepeat(e.target.checked))}
        />
        <span>No repetir</span>
      </label>
    </>
  )
}

interface HeroContentsBackgroundPanelProps {
  /** 'hero' → heroBgUrl/heroBgAlt/heroBgSize/…; 'contents' → contentsBg*. */
  prefix: 'hero' | 'contents'
  value: GlobalFields
  onChange: (next: GlobalFields) => void
}

/**
 * URL + Alt + tamaño/posición/repeat de HERO-SECTION o CONTENTS-SECTION —
 * pedido explícito del usuario (2026-09-21): antes vivía en un popover del
 * toolbar (ver ToolbarGlobals.tsx, que ahora solo conserva el de General),
 * ahora se selecciona desde el panel izquierdo como Header/Banner/Footer (ver
 * ui/selection.ts#GlobalBackgroundTarget) y este es su PropertiesPanel.
 */
export function HeroContentsBackgroundPanel({ prefix, value, onChange }: HeroContentsBackgroundPanelProps) {
  const urlKey = `${prefix}BgUrl` as const
  const altKey = `${prefix}BgAlt` as const
  const sizeKey = `${prefix}BgSize` as const
  const positionKey = `${prefix}BgPosition` as const
  const repeatKey = `${prefix}BgRepeat` as const

  return (
    <div className="properties-panel">
      <label className="field">
        <span>URL de la imagen</span>
        <input
          type="text"
          placeholder="URL de la imagen de fondo"
          value={value[urlKey]}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, [urlKey]: e.target.value })}
        />
      </label>

      <label className="field">
        <span>Alt de la imagen</span>
        <input
          type="text"
          disabled={value[urlKey].trim() === ''}
          value={value[altKey]}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, [altKey]: e.target.value })}
        />
      </label>

      <BackgroundSizePositionRepeatFields
        size={value[sizeKey]}
        position={value[positionKey]}
        repeat={value[repeatKey]}
        onChangeSize={(next) => onChange({ ...value, [sizeKey]: next })}
        onChangePosition={(next) => onChange({ ...value, [positionKey]: next })}
        onChangeRepeat={(next) => onChange({ ...value, [repeatKey]: next })}
      />
    </div>
  )
}
