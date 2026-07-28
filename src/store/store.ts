// ============================================================================
// Store principal (zustand + zundo). Mantiene el documento activo con
// undo/redo temporal y autosave (debounced) a localStorage.
// ============================================================================
import { create, useStore as useZustandStore } from 'zustand'
import { temporal } from 'zundo'
import type { EmailDocument } from '../model'
import type { GlobalFields } from '../global/schema'
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
