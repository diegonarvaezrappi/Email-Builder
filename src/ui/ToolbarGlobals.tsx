// ============================================================================
// Ajustes globales del email, en la barra superior junto a la marca. Afectan al
// mail entero (tema, imagen de fondo), no son propiedades de un componente, así
// que no compiten por espacio con el panel del componente seleccionado.
// ============================================================================
import type { ChangeEvent } from 'react'
import type { GlobalFields } from '../global/schema'
import { groupedThemes, themeLabel } from '../themes/themes'
import { Popover } from './Popover'
import { BackgroundSizePositionRepeatFields } from './BackgroundFields'

interface ToolbarGlobalsProps {
  value: GlobalFields
  onChange: (next: GlobalFields) => void
}

/**
 * Fondo de HERO-SECTION o CONTENTS-SECTION — mismos 5 campos (url, alt,
 * tamaño, posición, repeat), solo cambia el prefijo de la clave en
 * GlobalFields ('hero' | 'contents'). Pedido explícito del usuario
 * (2026-09-16): además de General (fondoUrl, ya en el toolbar), estas 2
 * secciones también deben poder reemplazar su imagen y ajustar tamaño/
 * posición/repeat — hasta ahora era una imagen fija del maestro, sin ningún
 * campo editable en la app.
 */
function SectionBackgroundPopover({
  label,
  prefix,
  value,
  onChange,
}: {
  label: string
  prefix: 'hero' | 'contents'
  value: GlobalFields
  onChange: (next: GlobalFields) => void
}) {
  const urlKey = `${prefix}BgUrl` as const
  const altKey = `${prefix}BgAlt` as const
  const sizeKey = `${prefix}BgSize` as const
  const positionKey = `${prefix}BgPosition` as const
  const repeatKey = `${prefix}BgRepeat` as const

  return (
    <Popover label={label}>
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
    </Popover>
  )
}

export function ToolbarGlobals({ value, onChange }: ToolbarGlobalsProps) {
  return (
    <>
      <label className="toolbar-field">
        <span>Tema</span>
        <select value={value.tema} onChange={(e) => onChange({ ...value, tema: e.target.value })}>
          {groupedThemes().map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.themes.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {themeLabel(t.slug)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      <label className="toolbar-field toolbar-field-fondo">
        <span>Fondo</span>
        {/* type="text" y no "url": el campo también admite Liquid
            (`{{content_blocks.${...}}}`), que la validación nativa rechazaría. */}
        <input
          type="text"
          placeholder="URL de la imagen de fondo"
          value={value.fondoUrl}
          onChange={(e) => onChange({ ...value, fondoUrl: e.target.value })}
        />
        {value.fondoUrl !== '' && (
          <button
            type="button"
            className="toolbar-clear"
            aria-label="Quitar la imagen de fondo"
            title="Quitar la imagen de fondo"
            onClick={() => onChange({ ...value, fondoUrl: '' })}
          >
            ×
          </button>
        )}
      </label>

      <label className="toolbar-field">
        <span>Alt del fondo</span>
        <input
          type="text"
          disabled={value.fondoUrl.trim() === ''}
          value={value.fondoAlt}
          onChange={(e) => onChange({ ...value, fondoAlt: e.target.value })}
        />
      </label>

      {/* Tamaño/posición/repeat de General — url/alt ya están arriba (Fondo/Alt
          del fondo), así que este popover solo trae los 3 campos nuevos. */}
      <Popover label="Ajustes de fondo ⚙">
        <BackgroundSizePositionRepeatFields
          size={value.fondoSize}
          position={value.fondoPosition}
          repeat={value.fondoRepeat}
          onChangeSize={(next) => onChange({ ...value, fondoSize: next })}
          onChangePosition={(next) => onChange({ ...value, fondoPosition: next })}
          onChangeRepeat={(next) => onChange({ ...value, fondoRepeat: next })}
        />
      </Popover>

      <SectionBackgroundPopover label="Fondo Hero" prefix="hero" value={value} onChange={onChange} />
      <SectionBackgroundPopover label="Fondo Contenidos" prefix="contents" value={value} onChange={onChange} />
    </>
  )
}
