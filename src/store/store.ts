// ============================================================================
// Store principal (zustand + zundo). Mantiene el documento activo con
// undo/redo temporal y autosave (debounced) a localStorage.
// ============================================================================
import { create, useStore as useZustandStore } from 'zustand'
import { temporal } from 'zundo'
import type { BannerItem, ContentBlock, ContentBlockType, DealCard, DealsBlock, EmailDocument } from '../model'
import type { BannerItemType } from '../components/banner/items/schemas'
import type { GlobalFields } from '../global/schema'
import { DEALS_MAX_CARDS, defaultDealCardFields, type DealCardFields, type DealCardPieceType } from '../components/deals/schema'
import { findDealsBlockByCard } from '../components/deals/blocks'
import { findModuleBlockByItem } from '../components/contentModules/blocks'
import { contentBlockRegistry } from '../contentBlockRegistry'
import { getBannerItemDef } from '../bannerItemRegistry'
import { getModuleItemDef } from '../bodyMoleculeRegistry'
import type { ModuleItem, ModuleItemType } from '../moduleItems/schemas'
import { applyImageModuleExclusivity, findImageModuleIndex, type ImageModuleType } from '../components/banner/exclusivity'
import { enforceHorizontalItemOrder } from '../components/banner/horizontalOrder'
import { newId } from '../ids'
import { loadDocument, saveDocument } from './persistence'

interface BuilderState {
  document: EmailDocument
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  saveError: string | null
  /**
   * Escribe los campos de un slot por su `docKey` del registry. Genérico a
   * propósito: el panel de propiedades sale del registry, así que no puede
   * conocer un setter por slot. `unknown` porque el registry es dinámico —
   * lo que entra ya fue validado por el schema del slot.
   */
  setSlotFields: (docKey: keyof EmailDocument, fields: unknown) => void
  setGlobalFields: (fields: GlobalFields) => void

  /**
   * Operaciones sobre doc.contenidos (el array de bloques de CONTENIDOS, hoy
   * solo CTA). A diferencia de setSlotFields (un reemplazo de campo completo,
   * perfecto para el `removed` booleano de Cierre), acá hay aritmética real de
   * índices — vale una acción dedicada por operación, testeable sola.
   */
  insertContentBlock: (type: ContentBlockType, atIndex: number) => void
  duplicateContentBlock: (id: string) => void
  reorderContentBlock: (id: string, toIndex: number) => void
  removeContentBlock: (id: string) => void
  updateContentBlockFields: (id: string, fields: unknown) => void

  /**
   * Mismo espíritu que las acciones de contenidos, un nivel más adentro
   * (doc.banner.items). `insertBannerItem`/`duplicateBannerItem` aplican
   * además la única regla de exclusión dura del maestro (imagen fija vs.
   * automática, ver components/banner/exclusivity.ts) ANTES de calcular el
   * índice de inserción, para que `atIndex` se interprete contra la lista ya
   * filtrada.
   */
  insertBannerItem: (type: BannerItemType, atIndex: number) => void
  duplicateBannerItem: (id: string) => void
  reorderBannerItem: (id: string, toIndex: number) => void
  removeBannerItem: (id: string) => void
  updateBannerItemFields: (id: string, fields: unknown) => void

  /**
   * Cambia (o agrega) el módulo de imagen del banner horizontal — IMG_FIJA e
   * IMG_AUTOMATICA_MODULO son mutuamente excluyentes (ver exclusivity.ts). A
   * diferencia de insertBannerItem, reemplaza en el MISMO índice si ya había
   * un módulo de imagen, en vez de sacarlo y agregar el nuevo al final — así
   * el selector de tipo de imagen del panel derecho no reordena el resto de
   * las piezas del banner.
   */
  setBannerImageModule: (type: ImageModuleType) => void

  /**
   * Operaciones sobre las tarjetas de un bloque DEALS (doc.contenidos → el
   * bloque de tipo DEALS → fields.items). Mismo espíritu que las de banner, dos
   * niveles adentro, con 2 diferencias:
   *  - Solo `insert` recibe el id del bloque: los ids de tarjeta son únicos en
   *    todo el documento (newId()), así que las demás ubican su bloque dueño
   *    buscando quién contiene esa tarjeta. Es lo que permite que Viewport pase
   *    solo el cardId que leyó del marcador DCARD.
   *  - `insert`/`duplicate` no hacen nada si el bloque ya llegó a
   *    DEALS_MAX_CARDS. El tope va acá (no solo deshabilitando el botón) por el
   *    mismo motivo que la exclusividad de imagen del banner vive en el store:
   *    es una regla del maestro, no una decoración de la UI.
   */
  insertDealCard: (blockId: string, atIndex: number) => void
  duplicateDealCard: (cardId: string) => void
  reorderDealCard: (cardId: string, toIndex: number) => void
  removeDealCard: (cardId: string) => void
  updateDealCardFields: (cardId: string, fields: unknown) => void

  /**
   * Reordena las 7 piezas fijas de UNA tarjeta (fields.pieceOrder) — mismo
   * espíritu que reorderDealCard, un nivel más adentro. `pieceType` identifica
   * la pieza arrastrada (no tiene id propio, a diferencia de una tarjeta o de
   * una pieza de banner: son 7 tipos fijos, uno de cada por tarjeta).
   */
  reorderDealCardPiece: (cardId: string, pieceType: DealCardPieceType, toIndex: number) => void

  /**
   * Operaciones sobre las moléculas del ÁREA LIBRE de un módulo de body (hoy
   * TITLE, ver components/contentModules/blocks.ts) — mismo espíritu que las
   * de banner/deals, pero el bloque dueño se busca en vez de recibirse (mismo
   * criterio que las de tarjeta de deal: los ids de item son únicos en todo el
   * documento). `insertModuleItem` sí recibe `blockId` + `areaKey` porque para
   * INSERTAR hace falta saber DÓNDE — no hay ningún item existente del que
   * deducirlo. `atIndex`/`toIndex` se interpretan contra los items de esa
   * MISMA área (no contra la lista completa del bloque, que puede tener más de
   * un área en un módulo futuro).
   */
  insertModuleItem: (blockId: string, areaKey: string, type: ModuleItemType, atIndex: number) => void
  duplicateModuleItem: (itemId: string) => void
  reorderModuleItem: (itemId: string, toIndex: number) => void
  removeModuleItem: (itemId: string) => void
  updateModuleItemFields: (itemId: string, fields: unknown) => void

  /**
   * Reemplaza el documento ENTERO — usado por la pestaña "Importar" (subir un
   * .json exportado antes con "Descargar JSON", ver ui/ImportPanel.tsx). El
   * JSON ya llega VALIDADO por `emailDocumentSchema.safeParse` antes de
   * llamar acá (misma validación que loadDocument usa al leer localStorage);
   * esta acción no vuelve a parsear, solo pisa `document`. Un `set` más, así
   * que entra al historial de undo/redo igual que cualquier otro cambio — un
   * import accidental se deshace con "Deshacer", no hace falta un diálogo de
   * confirmación aparte.
   */
  setDocument: (doc: EmailDocument) => void
}

/** Reescribe la lista de tarjetas de un bloque DEALS dejando el resto del
 *  documento intacto — el patrón se repite en las 5 acciones. */
function withDealCards(document: EmailDocument, blockIndex: number, items: DealCard[]): EmailDocument {
  const block = document.contenidos[blockIndex] as DealsBlock
  const contenidos = [...document.contenidos]
  contenidos[blockIndex] = { ...block, fields: { ...block.fields, items } }
  return { ...document, contenidos }
}

/** Mismo patrón que withDealCards, un nivel más arriba: el bloque dueño puede
 *  ser cualquier tipo que marque `usesModuleItems` (hoy solo TITLE), no un
 *  único tipo fijo — por eso castea contra `ContentBlock` genérico en vez de
 *  un tipo de bloque puntual. */
function withModuleItems(document: EmailDocument, blockIndex: number, items: ModuleItem[]): EmailDocument {
  const block = document.contenidos[blockIndex]
  const contenidos = [...document.contenidos]
  contenidos[blockIndex] = { ...block, fields: { ...block.fields, items } } as ContentBlock
  return { ...document, contenidos }
}

export const useBuilder = create<BuilderState>()(
  temporal(
    (set) => ({
      document: loadDocument(),
      saveStatus: 'idle',
      saveError: null,
      setSlotFields: (docKey, fields) =>
        set((s) => ({ document: { ...s.document, [docKey]: fields } as EmailDocument })),
      setGlobalFields: (fields) => set((s) => ({ document: { ...s.document, global: fields } })),

      insertContentBlock: (type, atIndex) =>
        set((s) => {
          const def = contentBlockRegistry[type]
          if (!def) return s
          // createDefaultFields (si el tipo lo define, ver DEALS en
          // contentBlockRegistry.ts) fabrica un `fields` fresco por instancia
          // — necesario para tipos con ids propios adentro de `fields`, donde
          // reusar el mismo `defaultFields` en 2 inserciones haría que ambas
          // instancias compartieran esos ids.
          const fields = def.createDefaultFields ? def.createDefaultFields() : def.defaultFields
          const block = { id: newId(), type, fields } as ContentBlock
          const next = [...s.document.contenidos]
          next.splice(Math.max(0, Math.min(atIndex, next.length)), 0, block)
          return { document: { ...s.document, contenidos: next } }
        }),

      duplicateContentBlock: (id) =>
        set((s) => {
          const idx = s.document.contenidos.findIndex((b) => b.id === id)
          if (idx === -1) return s
          const original = s.document.contenidos[idx]
          const def = contentBlockRegistry[original.type]
          // cloneFields (ver nota de arriba) preserva los valores del usuario
          // pero regenera cualquier id propio adentro de `fields` — mismo
          // motivo que createDefaultFields, la copia no puede compartirlos
          // con el original.
          const fields = def?.cloneFields ? def.cloneFields(original.fields) : original.fields
          const copy = { ...original, id: newId(), fields } as ContentBlock
          const next = [...s.document.contenidos]
          next.splice(idx + 1, 0, copy)
          return { document: { ...s.document, contenidos: next } }
        }),

      /**
       * `toIndex` se interpreta contra el array ANTES de sacar el bloque
       * arrastrado (misma convención que produce resolveDropIndex en
       * ui/Viewport.tsx) — quien llama no tiene que restarle 1 por sí mismo.
       * El ajuste vive acá porque es el único lugar donde hace falta
       * acertarlo, y así se puede testear con un array fijo.
       */
      reorderContentBlock: (id, toIndex) =>
        set((s) => {
          const from = s.document.contenidos.findIndex((b) => b.id === id)
          if (from === -1) return s
          const adjusted = toIndex > from ? toIndex - 1 : toIndex
          const next = [...s.document.contenidos]
          const [moved] = next.splice(from, 1)
          next.splice(Math.max(0, Math.min(adjusted, next.length)), 0, moved)
          return { document: { ...s.document, contenidos: next } }
        }),

      removeContentBlock: (id) =>
        set((s) => ({ document: { ...s.document, contenidos: s.document.contenidos.filter((b) => b.id !== id) } })),

      updateContentBlockFields: (id, fields) =>
        set((s) => ({
          document: {
            ...s.document,
            contenidos: s.document.contenidos.map((b) => (b.id === id ? ({ ...b, fields } as ContentBlock) : b)),
          },
        })),

      insertBannerItem: (type, atIndex) =>
        set((s) => {
          const def = getBannerItemDef(type)
          if (!def) return s
          const item = { id: newId(), type, fields: def.defaultFields } as BannerItem
          const filtered = applyImageModuleExclusivity(s.document.banner.items, type)
          const next = [...filtered]
          next.splice(Math.max(0, Math.min(atIndex, next.length)), 0, item)
          const ordered = enforceHorizontalItemOrder(next, s.document.banner.bannerType)
          return { document: { ...s.document, banner: { ...s.document.banner, items: ordered } } }
        }),

      duplicateBannerItem: (id) =>
        set((s) => {
          const idx = s.document.banner.items.findIndex((it) => it.id === id)
          if (idx === -1) return s
          const original = s.document.banner.items[idx]
          const copy = { ...original, id: newId() } as BannerItem
          // Si el propio original es un módulo de imagen, applyImageModuleExclusivity
          // lo saca de `filtered` (no puede convivir con su propia copia) — por
          // eso la posición de inserción se calcula contando cuántos items
          // ANTES del original sobrevivieron el filtro, no buscando el id del
          // original (que puede haber desaparecido). Si el original SÍ
          // sobrevive (caso normal, no es un módulo de imagen), la copia va
          // justo DESPUÉS de él (+1); si no sobrevive, la copia toma su lugar.
          const filtered = applyImageModuleExclusivity(s.document.banner.items, original.type)
          const originalSurvives = filtered.includes(original)
          const survivingBefore = s.document.banner.items.slice(0, idx).filter((it) => filtered.includes(it)).length
          const insertAt = survivingBefore + (originalSurvives ? 1 : 0)
          const next = [...filtered]
          next.splice(insertAt, 0, copy)
          const ordered = enforceHorizontalItemOrder(next, s.document.banner.bannerType)
          return { document: { ...s.document, banner: { ...s.document.banner, items: ordered } } }
        }),

      reorderBannerItem: (id, toIndex) =>
        set((s) => {
          const from = s.document.banner.items.findIndex((it) => it.id === id)
          if (from === -1) return s
          const adjusted = toIndex > from ? toIndex - 1 : toIndex
          const next = [...s.document.banner.items]
          const [moved] = next.splice(from, 1)
          next.splice(Math.max(0, Math.min(adjusted, next.length)), 0, moved)
          const ordered = enforceHorizontalItemOrder(next, s.document.banner.bannerType)
          return { document: { ...s.document, banner: { ...s.document.banner, items: ordered } } }
        }),

      removeBannerItem: (id) =>
        set((s) => ({
          document: { ...s.document, banner: { ...s.document.banner, items: s.document.banner.items.filter((it) => it.id !== id) } },
        })),

      updateBannerItemFields: (id, fields) =>
        set((s) => ({
          document: {
            ...s.document,
            banner: {
              ...s.document.banner,
              items: s.document.banner.items.map((it) => (it.id === id ? ({ ...it, fields } as BannerItem) : it)),
            },
          },
        })),

      setBannerImageModule: (type) =>
        set((s) => {
          const def = getBannerItemDef(type)
          if (!def) return s
          const items = s.document.banner.items
          const idx = findImageModuleIndex(items)
          const newItem = { id: newId(), type, fields: def.defaultFields } as BannerItem
          const next = [...items]
          if (idx === -1) next.push(newItem)
          else next[idx] = newItem
          const ordered = enforceHorizontalItemOrder(next, s.document.banner.bannerType)
          return { document: { ...s.document, banner: { ...s.document.banner, items: ordered } } }
        }),

      insertDealCard: (blockId, atIndex) =>
        set((s) => {
          const index = s.document.contenidos.findIndex((b) => b.id === blockId && b.type === 'DEALS')
          if (index === -1) return s
          const block = s.document.contenidos[index] as DealsBlock
          if (block.fields.items.length >= DEALS_MAX_CARDS) return s
          const items = [...block.fields.items]
          items.splice(Math.max(0, Math.min(atIndex, items.length)), 0, { id: newId(), fields: defaultDealCardFields })
          return { document: withDealCards(s.document, index, items) }
        }),

      duplicateDealCard: (cardId) =>
        set((s) => {
          const found = findDealsBlockByCard(s.document.contenidos, cardId)
          if (!found) return s
          if (found.block.fields.items.length >= DEALS_MAX_CARDS) return s
          const cardIndex = found.block.fields.items.findIndex((c) => c.id === cardId)
          const items = [...found.block.fields.items]
          items.splice(cardIndex + 1, 0, { ...items[cardIndex], id: newId() })
          return { document: withDealCards(s.document, found.index, items) }
        }),

      /** `toIndex` se interpreta contra el array ANTES de sacar la tarjeta
       *  arrastrada — misma convención que reorderContentBlock/reorderBannerItem. */
      reorderDealCard: (cardId, toIndex) =>
        set((s) => {
          const found = findDealsBlockByCard(s.document.contenidos, cardId)
          if (!found) return s
          const from = found.block.fields.items.findIndex((c) => c.id === cardId)
          const adjusted = toIndex > from ? toIndex - 1 : toIndex
          const items = [...found.block.fields.items]
          const [moved] = items.splice(from, 1)
          items.splice(Math.max(0, Math.min(adjusted, items.length)), 0, moved)
          return { document: withDealCards(s.document, found.index, items) }
        }),

      removeDealCard: (cardId) =>
        set((s) => {
          const found = findDealsBlockByCard(s.document.contenidos, cardId)
          if (!found) return s
          const items = found.block.fields.items.filter((c) => c.id !== cardId)
          return { document: withDealCards(s.document, found.index, items) }
        }),

      updateDealCardFields: (cardId, fields) =>
        set((s) => {
          const found = findDealsBlockByCard(s.document.contenidos, cardId)
          if (!found) return s
          const items = found.block.fields.items.map((c) => (c.id === cardId ? { ...c, fields: fields as DealCardFields } : c))
          return { document: withDealCards(s.document, found.index, items) }
        }),

      /** `toIndex` se interpreta contra `pieceOrder` ANTES de sacar la pieza
       *  arrastrada — misma convención que reorderDealCard/reorderBannerItem. */
      reorderDealCardPiece: (cardId, pieceType, toIndex) =>
        set((s) => {
          const found = findDealsBlockByCard(s.document.contenidos, cardId)
          if (!found) return s
          const card = found.block.fields.items.find((c) => c.id === cardId)
          if (!card) return s
          const order = card.fields.pieceOrder
          const from = order.indexOf(pieceType)
          if (from === -1) return s
          const adjusted = toIndex > from ? toIndex - 1 : toIndex
          const nextOrder = [...order]
          const [moved] = nextOrder.splice(from, 1)
          nextOrder.splice(Math.max(0, Math.min(adjusted, nextOrder.length)), 0, moved)
          const items = found.block.fields.items.map((c) =>
            c.id === cardId ? { ...c, fields: { ...c.fields, pieceOrder: nextOrder } } : c,
          )
          return { document: withDealCards(s.document, found.index, items) }
        }),

      insertModuleItem: (blockId, areaKey, type, atIndex) =>
        set((s) => {
          const index = s.document.contenidos.findIndex((b) => b.id === blockId && contentBlockRegistry[b.type]?.usesModuleItems)
          if (index === -1) return s
          const def = getModuleItemDef(type)
          if (!def) return s
          const allItems = (s.document.contenidos[index].fields as { items: ModuleItem[] }).items
          const areaItems = allItems.filter((it) => it.areaKey === areaKey)
          const otherItems = allItems.filter((it) => it.areaKey !== areaKey)
          const newItem = { id: newId(), areaKey, type, fields: def.defaultFields } as ModuleItem
          const nextAreaItems = [...areaItems]
          nextAreaItems.splice(Math.max(0, Math.min(atIndex, nextAreaItems.length)), 0, newItem)
          return { document: withModuleItems(s.document, index, [...otherItems, ...nextAreaItems]) }
        }),

      duplicateModuleItem: (itemId) =>
        set((s) => {
          const found = findModuleBlockByItem(s.document.contenidos, itemId)
          if (!found) return s
          const itemIndex = found.items.findIndex((it) => it.id === itemId)
          const copy = { ...found.items[itemIndex], id: newId() } as ModuleItem
          const items = [...found.items]
          items.splice(itemIndex + 1, 0, copy)
          return { document: withModuleItems(s.document, found.index, items) }
        }),

      /** `toIndex` se interpreta contra los items de la MISMA área que el item
       *  arrastrado (no toda la lista del bloque) — misma convención que
       *  reorderDealCardPiece acotado a las 7 piezas de su propia tarjeta. */
      reorderModuleItem: (itemId, toIndex) =>
        set((s) => {
          const found = findModuleBlockByItem(s.document.contenidos, itemId)
          if (!found) return s
          const item = found.items.find((it) => it.id === itemId)
          if (!item) return s
          const areaItems = found.items.filter((it) => it.areaKey === item.areaKey)
          const otherItems = found.items.filter((it) => it.areaKey !== item.areaKey)
          const from = areaItems.findIndex((it) => it.id === itemId)
          const adjusted = toIndex > from ? toIndex - 1 : toIndex
          const nextAreaItems = [...areaItems]
          const [moved] = nextAreaItems.splice(from, 1)
          nextAreaItems.splice(Math.max(0, Math.min(adjusted, nextAreaItems.length)), 0, moved)
          return { document: withModuleItems(s.document, found.index, [...otherItems, ...nextAreaItems]) }
        }),

      removeModuleItem: (itemId) =>
        set((s) => {
          const found = findModuleBlockByItem(s.document.contenidos, itemId)
          if (!found) return s
          return { document: withModuleItems(s.document, found.index, found.items.filter((it) => it.id !== itemId)) }
        }),

      updateModuleItemFields: (itemId, fields) =>
        set((s) => {
          const found = findModuleBlockByItem(s.document.contenidos, itemId)
          if (!found) return s
          const items = found.items.map((it) => (it.id === itemId ? ({ ...it, fields } as ModuleItem) : it))
          return { document: withModuleItems(s.document, found.index, items) }
        }),

      setDocument: (doc) => set(() => ({ document: doc })),
    }),
    {
      limit: 100,
      // Solo el documento entra al historial de undo/redo (no el saveStatus).
      partialize: (s) => ({ document: s.document }),
      // Agrupa ráfagas de tipeo (ej. el textarea de "Legales adicionales") en menos entradas de historial.
      handleSet: (handleSet) => {
        let t: ReturnType<typeof setTimeout> | undefined
        return (pastState, replace) => {
          clearTimeout(t)
          t = setTimeout(() => handleSet(pastState, replace), 400)
        }
      },
    },
  ),
)

// --- Autosave (debounced) ----------------------------------------------------
let saveTimer: ReturnType<typeof setTimeout> | undefined
useBuilder.subscribe((state, prev) => {
  if (state.document === prev.document) return
  useBuilder.setState({ saveStatus: 'saving' })
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    const res = saveDocument(useBuilder.getState().document)
    useBuilder.setState(
      res.ok ? { saveStatus: 'saved', saveError: null } : { saveStatus: 'error', saveError: res.error },
    )
  }, 800)
})

// --- Hook reactivo para el estado de undo/redo -------------------------------
export function useTemporal() {
  const past = useZustandStore(useBuilder.temporal, (s) => s.pastStates.length)
  const future = useZustandStore(useBuilder.temporal, (s) => s.futureStates.length)
  return {
    canUndo: past > 0,
    canRedo: future > 0,
    undo: () => useBuilder.temporal.getState().undo(),
    redo: () => useBuilder.temporal.getState().redo(),
  }
}
