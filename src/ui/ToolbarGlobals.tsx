// ============================================================================
// Ajustes globales del email, en la barra superior junto a la marca. Afectan al
// mail entero (tema, imagen de fondo), no son propiedades de un componente, así
// que no compiten por espacio con el panel del componente seleccionado.
// ============================================================================
import type { GlobalFields } from '../global/schema'
import { groupedThemes, themeLabel } from '../themes/themes'

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
    </>
  )
}
