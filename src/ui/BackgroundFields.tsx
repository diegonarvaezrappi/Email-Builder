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
import { Popover } from './Popover'

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

export type BackgroundScope = 'general' | 'hero' | 'contents'

const BACKGROUND_KEYS = {
  general: { url: 'fondoUrl', alt: 'fondoAlt', size: 'fondoSize', position: 'fondoPosition', repeat: 'fondoRepeat' },
  hero: { url: 'heroBgUrl', alt: 'heroBgAlt', size: 'heroBgSize', position: 'heroBgPosition', repeat: 'heroBgRepeat' },
  contents: { url: 'contentsBgUrl', alt: 'contentsBgAlt', size: 'contentsBgSize', position: 'contentsBgPosition', repeat: 'contentsBgRepeat' },
} as const satisfies Record<BackgroundScope, Record<'url' | 'alt' | 'size' | 'position' | 'repeat', keyof GlobalFields>>

interface BackgroundCardProps {
  scope: BackgroundScope
  title: string
  value: GlobalFields
  onChange: (next: GlobalFields) => void
}

/**
 * Tarjeta de fondo del panel izquierdo (ui/LeftPanel.tsx): URL, "Sugerencia
 * para diseño" (el alt) y tamaño/posición/repeat detrás de un popover. La
 * misma para el fondo general y los de HERO-SECTION / CONTENTS-SECTION.
 */
export function BackgroundCard({ scope, title, value, onChange }: BackgroundCardProps) {
  const keys = BACKGROUND_KEYS[scope]
  const url = value[keys.url]
  const set = (key: keyof GlobalFields, next: unknown) => onChange({ ...value, [key]: next })

  return (
    <div className="left-card background-card">
      <div className="background-card-head">
        <span className="left-card-title">{title}</span>
        <Popover label="Ajustes de fondo ⚙">
          <BackgroundSizePositionRepeatFields
            size={value[keys.size]}
            position={value[keys.position]}
            repeat={value[keys.repeat]}
            onChangeSize={(next) => set(keys.size, next)}
            onChangePosition={(next) => set(keys.position, next)}
            onChangeRepeat={(next) => set(keys.repeat, next)}
          />
        </Popover>
      </div>
      {/* type="text" y no "url": el campo también admite Liquid, que la
          validación nativa rechazaría. */}
      <label className="field">
        <span>URL de la imagen</span>
        <div className="input-with-clear">
          <input
            type="text"
            placeholder="URL de la imagen de fondo"
            value={url}
            onChange={(e: ChangeEvent<HTMLInputElement>) => set(keys.url, e.target.value)}
          />
          {url !== '' && (
            <button type="button" className="input-clear" aria-label="Quitar la imagen de fondo" title="Quitar la imagen de fondo" onClick={() => set(keys.url, '')}>
              ×
            </button>
          )}
        </div>
      </label>
      <label className="field">
        <span>Sugerencia para diseño</span>
        <input
          type="text"
          placeholder="Describe la imagen (alt)"
          value={value[keys.alt]}
          onChange={(e: ChangeEvent<HTMLInputElement>) => set(keys.alt, e.target.value)}
        />
      </label>
    </div>
  )
}

interface HeroContentsBackgroundPanelProps {
  /** 'hero' → heroBgUrl/heroBgAlt/heroBgSize/…; 'contents' → contentsBg*. */
  prefix: 'hero' | 'contents'
  value: GlobalFields
  onChange: (next: GlobalFields) => void
}

/**
 * URL + Alt + tamaño/posición/repeat de HERO-SECTION o CONTENTS-SECTION, en el
 * panel derecho — lo que se abre al seleccionar la sección en el lienzo (ver
 * ui/selection.ts#GlobalBackgroundTarget). Los mismos campos viven también en
 * BackgroundCard, en su pestaña del panel izquierdo.
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
        <span>Sugerencia para diseño</span>
        <input
          type="text"
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
