import { useState } from 'react'
import './App.css'
import { useBuilder, useTemporal } from './store/store'
import { FooterPropertiesPanel } from './components/footer/PropertiesPanel'
import { PreviewTabs } from './ui/PreviewTabs'
import { applyTheme, getEffectiveTheme, type Theme } from './ui/theme'

function App() {
  const doc = useBuilder((s) => s.document)
  const saveStatus = useBuilder((s) => s.saveStatus)
  const saveError = useBuilder((s) => s.saveError)
  const setFooterFields = useBuilder((s) => s.setFooterFields)
  const { canUndo, canRedo, undo, redo } = useTemporal()
  const [theme, setTheme] = useState<Theme>(() => getEffectiveTheme())

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
        <button type="button" onClick={toggleTheme} aria-label="Cambiar tema claro/oscuro">
          {theme === 'dark' ? '☀️ Claro' : '🌙 Oscuro'}
        </button>
      </header>

      <div className="app-body">
        <aside className="panel-form">
          <FooterPropertiesPanel value={doc.footer} onChange={setFooterFields} />
        </aside>
        <PreviewTabs document={doc} />
      </div>
    </div>
  )
}

export default App
