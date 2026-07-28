import { useState } from 'react'
import './App.css'
import { useBuilder, useTemporal } from './store/store'
import type { SlotName } from './model'
import { LibraryPanel } from './ui/LibraryPanel'
import { Viewport } from './ui/Viewport'
import { InspectorPanel } from './ui/InspectorPanel'
import { applyTheme, getEffectiveTheme, type Theme } from './ui/theme'

function App() {
  const doc = useBuilder((s) => s.document)
  const saveStatus = useBuilder((s) => s.saveStatus)
  const saveError = useBuilder((s) => s.saveError)
  const setSlotFields = useBuilder((s) => s.setSlotFields)
  const setGlobalFields = useBuilder((s) => s.setGlobalFields)
  const { canUndo, canRedo, undo, redo } = useTemporal()
  const [theme, setTheme] = useState<Theme>(() => getEffectiveTheme())

  // Qué componente del email está abierto en el panel derecho. Es estado de UI,
  // no del documento: no entra al historial de undo/redo ni se persiste.
  const [selected, setSelected] = useState<SlotName | null>(null)

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    setTheme(next)
  }

  const saveStatusLabel =
    saveStatus === 'saving'
      ? 'Guardando…'
      : saveStatus === 'saved'
        ? 'Guardado'
        : saveStatus === 'error'
          ? (saveError ?? 'Error al guardar')
          : ''

  return (
    <div className="app-shell">
      <header className="toolbar">
        <h1>Email Builder — Braze / Liquid</h1>
        <span className={`save-status${saveStatus === 'error' ? ' error' : ''}`}>{saveStatusLabel}</span>
        <button type="button" onClick={undo} disabled={!canUndo}>
          Deshacer
        </button>
        <button type="button" onClick={redo} disabled={!canRedo}>
          Rehacer
        </button>
        <button type="button" onClick={toggleTheme} aria-label="Cambiar tema claro/oscuro de la app">
          {theme === 'dark' ? '☀️ Claro' : '🌙 Oscuro'}
        </button>
      </header>

      <div className="app-body">
        <LibraryPanel document={doc} selected={selected} onSelect={setSelected} onGlobalChange={setGlobalFields} />
        <Viewport document={doc} selected={selected} onSelect={setSelected} />
        <InspectorPanel document={doc} selected={selected} onChange={setSlotFields} />
      </div>
    </div>
  )
}

export default App
