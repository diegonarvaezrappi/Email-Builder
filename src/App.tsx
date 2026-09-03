import { useEffect, useRef, useState } from 'react'
import './App.css'
import { useBuilder, useTemporal } from './store/store'
import { headerPatchForTheme, bannerBackgroundEnabledForTheme, moduleBackgroundEnabledForTheme } from './themeDefaults'
import { contentBlockRegistry } from './contentBlockRegistry'
import type { Col3Fields } from './components/col3/schema'
import type { ContentBlock } from './model'
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
  const insertBannerItem = useBuilder((s) => s.insertBannerItem)
  const duplicateBannerItem = useBuilder((s) => s.duplicateBannerItem)
  const reorderBannerItem = useBuilder((s) => s.reorderBannerItem)
  const removeBannerItem = useBuilder((s) => s.removeBannerItem)
  const updateBannerItemFields = useBuilder((s) => s.updateBannerItemFields)
  const setBannerImageModule = useBuilder((s) => s.setBannerImageModule)
  const insertDealCard = useBuilder((s) => s.insertDealCard)
  const duplicateDealCard = useBuilder((s) => s.duplicateDealCard)
  const reorderDealCard = useBuilder((s) => s.reorderDealCard)
  const removeDealCard = useBuilder((s) => s.removeDealCard)
  const updateDealCardFields = useBuilder((s) => s.updateDealCardFields)
  const reorderDealCardPiece = useBuilder((s) => s.reorderDealCardPiece)
  const insertModuleItem = useBuilder((s) => s.insertModuleItem)
  const duplicateModuleItem = useBuilder((s) => s.duplicateModuleItem)
  const reorderModuleItem = useBuilder((s) => s.reorderModuleItem)
  const removeModuleItem = useBuilder((s) => s.removeModuleItem)
  const updateModuleItemFields = useBuilder((s) => s.updateModuleItemFields)
  const setDocument = useBuilder((s) => s.setDocument)
  const { canUndo, canRedo, undo, redo } = useTemporal()

  // Qué componente del email está abierto en el panel derecho. Es estado de UI,
  // no del documento: no entra al historial de undo/redo ni se persiste.
  const [selected, setSelected] = useState<Selection | null>(null)

  // Ajustes por defecto del header/banner al cambiar el TEMA GENERAL — ver
  // themeDefaults.ts para las reglas (Pro/ProBlack/Dark Turbo/Verde 100 cambian
  // la marca del header; pastel/oscuros fuerzan la versión del logo; pastel
  // apaga el fondo del banner por defecto). El estilo de CTA NO vive acá desde
  // el pull del 2026-09-02 — global.ctaStyle usa su propio sentinel 'default'
  // resuelto al renderizar (themeDefaults.ts#resolveCtaStyle), no un efecto de
  // tema. Un solo patch por header, no 2
  // escrituras sueltas: si header.brand y header.logoBackground cambian a la
  // vez (ej. tema Dark Turbo), 2 llamadas a setSlotFields seguidas se pisarían
  // entre sí porque ambas partirían del mismo `doc.header` ya obsoleto tras la
  // primera.
  //
  // prevTemaRef trackea el tema ANTERIOR (no el actual, que ya está en
  // doc.global.tema) para poder distinguir "el usuario no tocó la marca desde
  // el último cambio de tema" (seguro reemplazarla) de "el usuario la fijó a
  // mano" (respetarla) — sin esto, en cuanto este mismo efecto cambia la marca
  // una vez, se queda anclada en cualquier tema siguiente (ver themeDefaults.ts).
  const prevTemaRef = useRef<string | null>(null)
  useEffect(() => {
    const prevTema = prevTemaRef.current

    const headerPatch = headerPatchForTheme(doc.header, doc.global.tema, prevTema)
    if (headerPatch) setSlotFields('header', { ...doc.header, ...headerPatch })

    const backgroundEnabled = bannerBackgroundEnabledForTheme(doc.banner, doc.global.tema, prevTema)
    if (backgroundEnabled !== null) setSlotFields('banner', { ...doc.banner, backgroundEnabled })

    // Mismo ajuste, un nivel más adentro: cada bloque de CONTENIDOS que
    // spreadee generalModuleFieldsSchema (ver contentBlockRegistry.ts,
    // hasGeneralModuleFields) tiene su PROPIO backgroundEnabled independiente
    // — no hay un solo campo que pisar como banner.backgroundEnabled, así que
    // se arma un solo `contenidos` nuevo con todos los patches a la vez (un
    // único setSlotFields, no uno por bloque: igual motivo que headerPatch de
    // arriba junta brand+logoBackground en un solo patch).
    let contenidosChanged = false
    const nextContenidos = doc.contenidos.map((block): ContentBlock => {
      if (contentBlockRegistry[block.type]?.hasGeneralModuleFields) {
        const fields = block.fields as { backgroundEnabled: boolean }
        const backgroundEnabled = moduleBackgroundEnabledForTheme(fields.backgroundEnabled, doc.global.tema, prevTema)
        if (backgroundEnabled === null) return block
        contenidosChanged = true
        return { ...block, fields: { ...fields, backgroundEnabled } } as ContentBlock
      }

      // COL3 (fase 5): NO marca hasGeneralModuleFields — su backgroundEnabled
      // vive POR CELDA (fields.cells[i], ver contentBlockRegistry.ts), no en
      // la raíz de `fields`, así que el caso genérico de arriba no aplica.
      // Mismo criterio de "no tocado desde el tema anterior" por celda.
      if (block.type === 'COL3') {
        let cellsChanged = false
        const nextCells = block.fields.cells.map((cell) => {
          const backgroundEnabled = moduleBackgroundEnabledForTheme(cell.backgroundEnabled, doc.global.tema, prevTema)
          if (backgroundEnabled === null) return cell
          cellsChanged = true
          return { ...cell, backgroundEnabled }
        }) as Col3Fields['cells']
        if (!cellsChanged) return block
        contenidosChanged = true
        return { ...block, fields: { ...block.fields, cells: nextCells } }
      }

      return block
    })
    if (contenidosChanged) setSlotFields('contenidos', nextContenidos)

    prevTemaRef.current = doc.global.tema
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
        <LibraryPanel document={doc} selected={selected} onSelect={setSelected} onChangeSlot={setSlotFields} />
        <Viewport
          document={doc}
          selected={selected}
          onSelect={setSelected}
          onChangeSlot={setSlotFields}
          onInsertBlock={insertContentBlock}
          onDuplicateBlock={duplicateContentBlock}
          onReorderBlock={reorderContentBlock}
          onRemoveBlock={removeContentBlock}
          onInsertBannerItem={insertBannerItem}
          onDuplicateBannerItem={duplicateBannerItem}
          onReorderBannerItem={reorderBannerItem}
          onRemoveBannerItem={removeBannerItem}
          onDuplicateDealCard={duplicateDealCard}
          onReorderDealCard={reorderDealCard}
          onRemoveDealCard={removeDealCard}
          onReorderDealCardPiece={reorderDealCardPiece}
          onChangeDealCard={updateDealCardFields}
          onInsertModuleItem={insertModuleItem}
          onDuplicateModuleItem={duplicateModuleItem}
          onReorderModuleItem={reorderModuleItem}
          onRemoveModuleItem={removeModuleItem}
          onImportDocument={setDocument}
        />
        <InspectorPanel
          document={doc}
          selected={selected}
          onSelect={setSelected}
          onChange={setSlotFields}
          onChangeBlock={updateContentBlockFields}
          onChangeBannerItem={updateBannerItemFields}
          onChangeGlobal={setGlobalFields}
          onInsertBannerItem={insertBannerItem}
          onSetBannerImageModule={setBannerImageModule}
          onChangeDealCard={updateDealCardFields}
          onInsertDealCard={insertDealCard}
          onChangeModuleItem={updateModuleItemFields}
          onInsertModuleItem={insertModuleItem}
        />
      </div>
    </div>
  )
}

export default App
