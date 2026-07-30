// ============================================================================
// Store principal (zustand + zundo). Mantiene el documento activo con
// undo/redo temporal y autosave (debounced) a localStorage.
// ============================================================================
import { create, useStore as useZustandStore } from 'zustand'
import { temporal } from 'zundo'
import type { ContentBlock, ContentBlockType, EmailDocument } from '../model'
import type { GlobalFields } from '../global/schema'
import { contentBlockRegistry } from '../contentBlockRegistry'
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
          const block = { id: newId(), type, fields: def.defaultFields } as ContentBlock
          const next = [...s.document.contenidos]
          next.splice(Math.max(0, Math.min(atIndex, next.length)), 0, block)
          return { document: { ...s.document, contenidos: next } }
        }),

      duplicateContentBlock: (id) =>
        set((s) => {
          const idx = s.document.contenidos.findIndex((b) => b.id === id)
          if (idx === -1) return s
          const copy = { ...s.document.contenidos[idx], id: newId() } as ContentBlock
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
