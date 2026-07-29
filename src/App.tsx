import { useEffect, useState } from 'react'
import './App.css'
import { useBuilder, useTemporal } from './store/store'
import type { SlotName } from './model'
import { defaultHeaderFields } from './components/header/schema'
import { LibraryPanel } from './ui/LibraryPanel'
import { Viewport } from './ui/Viewport'
import { InspectorPanel } from './ui/InspectorPanel'
import { ToolbarGlobals } from './ui/ToolbarGlobals'

function App() {
  const doc = useBuilder((s) => s.document)
  const saveStatus = useBuilder((s) => s.saveStatus)
  const saveError = useBuilder((s) => s.saveError)
  const setSlotFields = useBuilder((s) => s.setSlotFields)
  const setGlobalFields = useBuilder((s) => s.setGlobalFields)
  const { canUndo, canRedo, undo, redo } = useTemporal()

  // Qué componente del email está abierto en el panel derecho. Es estado de UI,
  // no del documento: no entra al historial de undo/redo ni se persiste.
  const [selected, setSelected] = useState<SlotName | null>(null)

  // Si el tema general pasa a Pro/ProBlack y la marca del header sigue en su
  // valor por defecto ('rappi', nunca tocada a mano), la cambiamos a la marca
  // Pro equivalente — deja de aplicar en cuanto el usuario elige una marca
  // distinta. Ver plan del componente Header, punto 1 ("si el usuario
  // selecciona el tema general Pro, la app puede cargar por defecto el logo
  // correspondiente a Pro").
  useEffect(() => {
    if (doc.header.brand !== defaultHeaderFields.brand) return
    if (doc.global.tema === 'pro') {
      setSlotFields('header', { ...doc.header, brand: 'rappi-pro' })
    } else if (doc.global.tema === 'problack') {
      setSlotFields('header', { ...doc.header, brand: 'rappi-pro-black' })
    }
    // Deliberadamente solo depende del tema: si el usuario edita header.brand
    // (o cualquier otro campo del header) no debe re-disparar esta lógica.
  }, [doc.global.tema])

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
        <div className="toolbar-brand">
          <h1>Email Builder — Braze / Liquid</h1>
          <span className="toolbar-divider" aria-hidden="true" />
          <ToolbarGlobals value={doc.global} onChange={setGlobalFields} />
        </div>
        <span className={`save-status${saveStatus === 'error' ? ' error' : ''}`}>{saveStatusLabel}</span>
        <button type="button" onClick={undo} disabled={!canUndo}>
          Deshacer
        </button>
        <button type="button" onClick={redo} disabled={!canRedo}>
          Rehacer
        </button>
      </header>

      <div className="app-body">
        <LibraryPanel selected={selected} onSelect={setSelected} />
        <Viewport document={doc} selected={selected} onSelect={setSelected} />
        <InspectorPanel document={doc} selected={selected} onChange={setSlotFields} />
      </div>
    </div>
  )
}

export default App
