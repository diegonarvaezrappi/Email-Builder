// ============================================================================
// Selector de Tema. Vive en la barra superior, junto a la marca — es un
// ajuste global del email, no una propiedad de un componente puntual, así que
// no compite por espacio con el panel de propiedades del componente seleccionado.
// ============================================================================
import type { GlobalFields } from '../global/schema'
import { groupedThemes, themeLabel } from '../themes/themes'

interface ThemeSelectProps {
  value: GlobalFields
  onChange: (next: GlobalFields) => void
}

export function ThemeSelect({ value, onChange }: ThemeSelectProps) {
  return (
    <label className="toolbar-theme">
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
  )
}
