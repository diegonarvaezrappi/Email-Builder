// ============================================================================
// Persistencia en localStorage (sin servidor). Un único documento activo
// (a diferencia de inapps-builder, que maneja una lista de diseños) — acá
// solo existe "el email que se está armando".
// ============================================================================
import { emailDocumentSchema, type EmailDocument } from '../model'
import { defaultEmailDocument } from '../registry'

const STORAGE_KEY = 'email-builder:document'

export function loadDocument(): EmailDocument {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultEmailDocument
    const parsed = emailDocumentSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) {
      console.warn('Documento guardado inválido, se descarta y se usa el valor por defecto', parsed.error)
      return defaultEmailDocument
    }
    return parsed.data
  } catch (e) {
    console.error('No se pudo cargar el documento guardado', e)
    return defaultEmailDocument
  }
}

export type SaveResult = { ok: true } | { ok: false; error: string }

export function saveDocument(doc: EmailDocument): SaveResult {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(doc))
    return { ok: true }
  } catch (e: unknown) {
    const err = e as { name?: string; code?: number; message?: string }
    const quota = err?.name === 'QuotaExceededError' || err?.code === 22
    return {
      ok: false,
      error: quota
        ? 'Se agotó el espacio del navegador para guardar.'
        : `No se pudo guardar: ${err?.message ?? String(e)}`,
    }
  }
}
