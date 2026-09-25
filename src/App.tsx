import { useEffect, useRef, useState } from 'react'
import './App.css'
import { useBuilder } from './store/store'
import { headerPatchForTheme, bannerBackgroundEnabledForTheme, moduleBackgroundEnabledForTheme, footerFirmaForTheme } from './themeDefaults'
import { contentBlockRegistry } from './contentBlockRegistry'
import type { Col3Fields } from './components/col3/schema'
import type { ContentBlock, ContentBlockType } from './model'
import { LeftPanel } from './ui/LeftPanel'
import { Viewport } from './ui/Viewport'
import { InspectorPanel } from './ui/InspectorPanel'
import { normalizeTropicalizationTarget, selectBlock, type Selection } from './ui/selection'
import { expandedKeysForSelection, type TreeActionTarget, type TreeReorder } from './ui/componentTreeModel'
import { leftTabForSelection, type LeftTab } from './ui/leftTab'
import type { ViewportTab } from './ui/viewportTab'
import type { PreviewCountry } from './preview/countries'
import { TropicalizationPanel } from './ui/tropicalize/TropicalizationPanel'
import { TropicalizationIndexPanel } from './ui/tropicalize/TropicalizationIndexPanel'

function App() {
  const doc = useBuilder((s) => s.document)
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
  const addTropicalizeBranch = useBuilder((s) => s.addTropicalizeBranch)
  const setTropicalizeBranchCountries = useBuilder((s) => s.setTropicalizeBranchCountries)
  const setTropicalizeBranchHidden = useBuilder((s) => s.setTropicalizeBranchHidden)
  const setTropicalizeBranchFields = useBuilder((s) => s.setTropicalizeBranchFields)
  const removeTropicalizeBranch = useBuilder((s) => s.removeTropicalizeBranch)
  const reorderTropicalizeBranch = useBuilder((s) => s.reorderTropicalizeBranch)
  const clearTropicalization = useBuilder((s) => s.clearTropicalization)

  // Qué componente del email está abierto en el panel derecho. Es estado de UI,
  // no del documento: no entra al historial de undo/redo ni se persiste.
  const [selected, setSelected] = useState<Selection | null>(null)

  // Qué contenedores están desplegados en el árbol de Contents (acordeón, ver
  // ui/ComponentTree.tsx). Vive acá y no dentro del árbol porque una selección
  // hecha en el LIENZO también abre los suyos: es la mitad "lienzo → árbol"
  // del resaltado bidireccional.
  const [treeExpanded, setTreeExpanded] = useState<ReadonlySet<string>>(() => new Set())

  const toggleTreeExpanded = (key: string) =>
    setTreeExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  // Pestaña del panel izquierdo (ui/LeftPanel.tsx). Una selección hecha en el
  // lienzo también la mueve, a la sección donde vive lo clickeado.
  const [leftTab, setLeftTab] = useState<LeftTab>('general')

  /**
   * Cada cambio de selección pasa por acá (lienzo, catálogo, árbol, inspector):
   * además de guardarla, despliega en el árbol los contenedores donde esa
   * selección vive (sin plegar los que ya estaban abiertos), así lo
   * seleccionado siempre se ve, y lleva el panel izquierdo a su pestaña.
   *
   * Acepta `null` (más ancho que la prop `onSelect` de los paneles) para poder
   * reusarlo desde handleChangeTab, donde la normalización puede limpiar la
   * selección.
   */
  const applySelection = (next: Selection | null) => {
    setSelected(next)
    const reveal = expandedKeysForSelection(doc, next)
    if (reveal.length > 0) setTreeExpanded((prev) => new Set([...prev, ...reveal]))
    const nextTab = leftTabForSelection(next)
    if (nextTab) setLeftTab(nextTab)
  }

  /** Un click en el grid de módulos agrega el módulo al final y lo deja
   *  seleccionado, listo para editar en el panel derecho. */
  const handleAddBlock = (type: ContentBlockType) => {
    insertContentBlock(type, doc.contenidos.length)
    const added = useBuilder.getState().document.contenidos.at(-1)
    if (added) applySelection(selectBlock(added.id))
  }

  const handleTreeDuplicate = (target: TreeActionTarget) => {
    switch (target.kind) {
      case 'block':
        return duplicateContentBlock(target.id)
      case 'bannerItem':
        return duplicateBannerItem(target.id)
      case 'dealCard':
        return duplicateDealCard(target.id)
      case 'moduleItem':
        return duplicateModuleItem(target.id)
    }
  }

  /** Si lo eliminado era lo seleccionado (o lo contenía), el panel derecho no
   *  debe quedarse mostrando algo que ya no existe. */
  const handleTreeRemove = (target: TreeActionTarget) => {
    const holdsSelection =
      selected !== null &&
      ((target.kind === 'block' && selected.blockId === target.id) ||
        (target.kind === 'bannerItem' && selected.bannerItemId === target.id) ||
        (target.kind === 'dealCard' && selected.dealCardId === target.id) ||
        (target.kind === 'moduleItem' && selected.moduleItemId === target.id))
    switch (target.kind) {
      case 'block':
        removeContentBlock(target.id)
        break
      case 'bannerItem':
        removeBannerItem(target.id)
        break
      case 'dealCard':
        removeDealCard(target.id)
        break
      case 'moduleItem':
        removeModuleItem(target.id)
        break
    }
    if (holdsSelection) setSelected(null)
  }

  /**
   * Reordenar arrastrando una fila del árbol — pedido explícito del usuario
   * (2026-09-21): las moléculas también se reordenan desde ahí, no solo desde
   * el lienzo. Cada tipo de fila cae en la MISMA acción del store que ya usa
   * el arrastre del Viewport, con la misma convención de `toIndex` (se
   * interpreta antes de sacar la fila arrastrada, el ajuste lo hace el store).
   */
  const handleTreeReorder = (reorder: TreeReorder, toIndex: number) => {
    switch (reorder.kind) {
      case 'block':
        return reorderContentBlock(reorder.id, toIndex)
      case 'bannerItem':
        return reorderBannerItem(reorder.id, toIndex)
      case 'dealCard':
        return reorderDealCard(reorder.id, toIndex)
      case 'dealCardPiece':
        return reorderDealCardPiece(reorder.cardId, reorder.pieceType, toIndex)
      case 'moduleItem':
        return reorderModuleItem(reorder.id, toIndex)
    }
  }

  // Pestaña activa del panel central y país "de vista" — antes vivían como
  // useState local de ui/Viewport.tsx; se suben acá porque el panel derecho
  // de Tropicalizar y el aviso de la pestaña Preview también necesitan
  // leerlos/escribirlos (el país en particular: el botón "👁 Ver" de una rama
  // y el "Ver en <país>" del aviso de elemento oculto lo escriben desde el
  // panel derecho, no desde Viewport). Mismo criterio que `selected`: estado
  // de UI, no del documento.
  const [tab, setTab] = useState<ViewportTab>('preview')
  const [country, setCountry] = useState<PreviewCountry>('MX')

  // Al entrar a Tropicalizar, una línea de deal seleccionada (no es objetivo
  // tropicalizable, ver decisión del usuario) sube a la tarjeta dueña — se
  // hace acá, en el único punto que cambia de pestaña, no en un efecto del
  // panel (no reentrante).
  const handleChangeTab = (next: ViewportTab) => {
    // Pasa por applySelection (no setSelected suelto) para que el árbol quede
    // en un foco coherente con la selección ya normalizada.
    if (next === 'tropicalize') applySelection(normalizeTropicalizationTarget(selected))
    setTab(next)
  }

  // Ajustes por defecto del header/banner/footer al cambiar el TEMA GENERAL —
  // ver themeDefaults.ts para las reglas (Pro/ProBlack/Dark Turbo/Verde 100
  // cambian la marca del header; pastel/oscuros fuerzan la versión del logo;
  // pastel apaga el fondo del banner por defecto; pastel fuerza la firma del
  // footer a "Rappi", salvo Verde 100 que la fuerza a "Turbo"). El estilo de
  // CTA NO vive acá desde
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

    const firma = footerFirmaForTheme(doc.footer, doc.global.tema, prevTema)
    if (firma !== null) setSlotFields('footer', { ...doc.footer, firma })

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

    // Los ajustes del primer render no los hizo el usuario: no deben aparecer
    // como un paso para deshacer al abrir la app.
    if (prevTema === null) useBuilder.temporal.getState().clear()

    prevTemaRef.current = doc.global.tema
    // Deliberadamente solo depende del tema: si el usuario edita header.brand
    // (o cualquier otro campo del header/global) no debe re-disparar esta lógica.
  }, [doc.global.tema])

  return (
    <div className="app-shell">
      <div className="app-body">
        {tab === 'tropicalize' ? (
          <TropicalizationIndexPanel document={doc} country={country} onSelect={applySelection} onChangeCountry={setCountry} />
        ) : (
          <LeftPanel
            document={doc}
            tab={leftTab}
            onChangeTab={setLeftTab}
            selected={selected}
            onSelect={applySelection}
            onChangeSlot={setSlotFields}
            onChangeGlobal={setGlobalFields}
            onAddBlock={handleAddBlock}
            treeExpanded={treeExpanded}
            onToggleTreeExpanded={toggleTreeExpanded}
            onTreeReorder={handleTreeReorder}
            onTreeDuplicate={handleTreeDuplicate}
            onTreeRemove={handleTreeRemove}
          />
        )}
        <Viewport
          document={doc}
          selected={selected}
          onSelect={applySelection}
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
          tab={tab}
          onChangeTab={handleChangeTab}
          country={country}
          onChangeCountry={setCountry}
        />
        {tab === 'tropicalize' ? (
          <TropicalizationPanel
            document={doc}
            selected={selected}
            country={country}
            onChangeCountry={setCountry}
            onChangeTab={handleChangeTab}
            onChangeGlobal={setGlobalFields}
            onAddBranch={addTropicalizeBranch}
            onSetBranchCountries={setTropicalizeBranchCountries}
            onSetBranchHidden={setTropicalizeBranchHidden}
            onSetBranchFields={setTropicalizeBranchFields}
            onRemoveBranch={removeTropicalizeBranch}
            onReorderBranch={reorderTropicalizeBranch}
            onClearTropicalization={clearTropicalization}
          />
        ) : (
          <InspectorPanel
            document={doc}
            selected={selected}
            onSelect={applySelection}
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
            country={country}
            onChangeTab={handleChangeTab}
          />
        )}
      </div>
    </div>
  )
}

export default App
