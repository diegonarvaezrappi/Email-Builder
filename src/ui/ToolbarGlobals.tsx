// ============================================================================
// Ajustes globales del email, en la barra superior junto a la marca. Afectan al
// mail entero (tema, imagen de fondo), no son propiedades de un componente, así
// que no compiten por espacio con el panel del componente seleccionado.
// ============================================================================
import type { GlobalFields } from '../global/schema'
import { groupedThemes, themeLabel } from '../themes/themes'
import { Popover } from './Popover'
import { BackgroundSizePositionRepeatFields } from './BackgroundFields'

interface ToolbarGlobalsProps {
  value: GlobalFields
  onChange: (next: GlobalFields) => void
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
          del fondo), así que este popover solo trae los 3 campos nuevos.
          Hero/Contenidos YA NO viven acá — pedido explícito del usuario
          (2026-09-21): se seleccionan desde el panel izquierdo, como
          Header/Banner/Footer (ver ui/LibraryPanel.tsx +
          ui/InspectorPanel.tsx). Solo General se queda en el toolbar: no
          tiene un componente propio en el lienzo al cual anclarse. */}
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
    </>
  )
}
