import { useEffect, useState } from 'react'
import './App.css'
import { useBuilder, useTemporal } from './store/store'
import { defaultHeaderFields } from './components/header/schema'
import { defaultGlobalFields } from './global/schema'
import { LibraryPanel } from './ui/LibraryPanel'
import { Viewport } from './ui/Viewport'
import { InspectorPanel } from './ui/InspectorPanel'
import { ToolbarGlobals } from './ui/ToolbarGlobals'
import type { Selection } from './ui/selection'

function App() {
  const doc = useBuilder((s) => s.document)
  const saveStatus = useBuilder((s) => s.saveStatus)
  const saveError = useBuilder((s) => s.saveError)
  const setSlotFields = useBuilder((s) => s.setSlotFields)
  const setGlobalFields = useBuilder((s) => s.setGlobalFields)
  const insertContentBlock = useBuilder((s) => s.insertContentBlock)
  const duplicateContentBlock = useBuilder((s) => s.duplicateContentBlock)
  const reorderContentBlock = useBuilder((s) => s.reorderContentBlock)
  const removeContentBlock = useBuilder((s) => s.removeContentBlock)
  const updateContentBlockFields = useBuilder((s) => s.updateContentBlockFields)
  const { canUndo, canRedo, undo, redo } = useTemporal()

  // Qué componente del email está abierto en el panel derecho. Es estado de UI,
  // no del documento: no entra al historial de undo/redo ni se persiste.
  const [selected, setSelected] = useState<Selection | null>(null)

  // Si el tema general pasa a Pro/ProBlack: (1) si la marca del header sigue
  // en su valor por defecto ('rappi', nunca tocada a mano), la cambiamos a la
  // marca Pro equivalente — deja de aplicar en cuanto el usuario elige una
  // marca distinta (ver plan del componente Header, punto 1: "si el usuario
  // selecciona el tema general Pro, la app puede cargar por defecto el logo
  // correspondiente a Pro"). (2) mismo criterio para el estilo de CTA:
  // Pro/ProBlack documentan 'pro'/'problack' como el style_Look esperado
  // (USO-DE-CADA-PARTE.md §4) — solo aplica mientras siga en su default sin
  // tocar.
  useEffect(() => {
    if (doc.header.brand === defaultHeaderFields.brand) {
      if (doc.global.tema === 'pro') {
        setSlotFields('header', { ...doc.header, brand: 'rappi-pro' })
      } else if (doc.global.tema === 'problack') {
        setSlotFields('header', { ...doc.header, brand: 'rappi-pro-black' })
      }
    }
    if (doc.global.ctaStyle === defaultGlobalFields.ctaStyle) {
      if (doc.global.tema === 'pro') {
        setGlobalFields({ ...doc.global, ctaStyle: 'pro' })
      } else if (doc.global.tema === 'problack') {
        setGlobalFields({ ...doc.global, ctaStyle: 'problack' })
      }
    }
    // Deliberadamente solo depende del tema: si el usuario edita header.brand
    // (o cualquier otro campo del header/global) no debe re-disparar esta lógica.
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
        <LibraryPanel document={doc} selected={selected} onSelect={setSelected} />
        <Viewport
          document={doc}
          selected={selected}
          onSelect={setSelected}
          onChangeSlot={setSlotFields}
          onInsertBlock={insertContentBlock}
          onDuplicateBlock={duplicateContentBlock}
          onReorderBlock={reorderContentBlock}
          onRemoveBlock={removeContentBlock}
        />
        <InspectorPanel
          document={doc}
          selected={selected}
          onChange={setSlotFields}
          onChangeBlock={updateContentBlockFields}
          onChangeGlobal={setGlobalFields}
        />
      </div>
    </div>
  )
}

export default App
