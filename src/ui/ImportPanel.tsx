// ============================================================================
// Pestaña "Importar" del Viewport: subir un .json exportado antes con
// "Descargar JSON" (pestaña Exportar) y reemplazar TODO el documento actual
// por esa plantilla. Mismo shape que ya usa store/persistence.ts para leer de
// localStorage (emailDocumentSchema) — se valida acá con el mismo schema
// antes de tocar el store, así un archivo corrupto o de otra cosa nunca llega
// a pisar el documento.
// ============================================================================
import { useRef, useState, type ChangeEvent } from 'react'
import { emailDocumentSchema, type EmailDocument } from '../model'

interface ImportPanelProps {
  onImport: (doc: EmailDocument) => void
}

type ImportStatus = { kind: 'idle' } | { kind: 'error'; message: string } | { kind: 'success'; filename: string }

export function ImportPanel({ onImport }: ImportPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<ImportStatus>({ kind: 'idle' })

  const handleFile = async (file: File) => {
    let json: unknown
    try {
      json = JSON.parse(await file.text())
    } catch {
      setStatus({ kind: 'error', message: 'No se pudo leer el archivo — ¿es un JSON válido?' })
      return
    }

    const parsed = emailDocumentSchema.safeParse(json)
    if (!parsed.success) {
      setStatus({ kind: 'error', message: 'El archivo no tiene el formato de una plantilla de este editor.' })
      return
    }

    onImport(parsed.data)
    setStatus({ kind: 'success', filename: file.name })
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // Se limpia siempre, incluso si no hay archivo: permite volver a elegir el
    // MISMO archivo dos veces seguidas (si no, el navegador no dispara
    // "change" la segunda vez porque el value no cambió).
    e.target.value = ''
    if (file) void handleFile(file)
  }

  return (
    <div className="import-panel">
      <p className="inspector-hint">
        Subí un archivo <code>.json</code> exportado antes con "Descargar JSON" (pestaña Exportar) para reemplazar TODO
        el mail actual por esa plantilla. Si te equivocás, "Deshacer" también revierte un import.
      </p>
      <input ref={inputRef} type="file" accept="application/json,.json" onChange={handleChange} />
      {status.kind === 'error' && <p className="import-status import-status-error">{status.message}</p>}
      {status.kind === 'success' && (
        <p className="import-status import-status-ok">"{status.filename}" importado ✓ — ya está en el lienzo.</p>
      )}
    </div>
  )
}
