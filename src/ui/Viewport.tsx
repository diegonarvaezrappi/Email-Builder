// ============================================================================
// Panel central: el email en construcción. El footer va siempre cargado; al
// hacer click sobre él queda seleccionado y sus opciones aparecen en el panel
// derecho. Los slots todavía sin implementar se dibujan como placeholders para
// que se lea el orden real del mail.
//
// La pestaña "Código" muestra el HTML ensamblado (con el Liquid intacto), que
// es lo que se copia/descarga — nunca pasa por LiquidJS.
// ============================================================================
import { useEffect, useRef, useState } from 'react'
import type { EmailDocument, SlotName } from '../model'
import { SLOT_ORDER } from '../model'
import { registry, SLOT_LABELS } from '../registry'
import { assembleEmailHtml } from '../template/assemble'
import { copyHtmlToClipboard, downloadHtml } from '../export/exporters'
import {
  PREVIEW_COUNTRIES,
  PREVIEW_COUNTRY_LABELS,
  renderFooterPreview,
  type PreviewCountry,
} from '../preview/liquidPreview'

interface ViewportProps {
  document: EmailDocument
  selected: SlotName | null
  onSelect: (slot: SlotName) => void
}

type Tab = 'preview' | 'code'

export function Viewport({ document: doc, selected, onSelect }: ViewportProps) {
  const [tab, setTab] = useState<Tab>('preview')
  const [country, setCountry] = useState<PreviewCountry>('CO')
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewError, setPreviewError] = useState<string | undefined>()
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')

  useEffect(() => {
    let cancelled = false
    renderFooterPreview(doc.footer, country, doc.global.tema).then((result) => {
      if (cancelled) return
      setPreviewHtml(result.html)
      setPreviewError(result.error)
    })
    return () => {
      cancelled = true
    }
  }, [doc.footer, country, doc.global.tema])

  const handleCopy = async () => {
    try {
      await copyHtmlToClipboard(doc)
      setCopyStatus('copied')
    } catch {
      setCopyStatus('error')
    } finally {
      setTimeout(() => setCopyStatus('idle'), 2000)
    }
  }

  return (
    <div className="panel-viewport">
      <div className="viewport-bar">
        <button type="button" className={tab === 'preview' ? 'active' : ''} onClick={() => setTab('preview')}>
          Preview
        </button>
        <button type="button" className={tab === 'code' ? 'active' : ''} onClick={() => setTab('code')}>
          Código
        </button>
        {tab === 'preview' && (
          <label className="country-select">
            <span>País (solo preview)</span>
            <select value={country} onChange={(e) => setCountry(e.target.value as PreviewCountry)}>
              {PREVIEW_COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {PREVIEW_COUNTRY_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {tab === 'preview' ? (
        <div className="viewport-canvas">
          <div className="email-doc">
            {SLOT_ORDER.map((slot) =>
              registry[slot] === undefined ? (
                <div key={slot} className="slot-pending">
                  {SLOT_LABELS[slot]} · pendiente
                </div>
              ) : (
                <SlotBlock
                  key={slot}
                  label={SLOT_LABELS[slot]}
                  html={previewHtml}
                  error={previewError}
                  selected={selected === slot}
                  onSelect={() => onSelect(slot)}
                />
              ),
            )}
          </div>
        </div>
      ) : (
        <div className="code-view">
          <div className="code-actions">
            <button type="button" className="primary" onClick={handleCopy}>
              {copyStatus === 'copied' ? 'Copiado ✓' : copyStatus === 'error' ? 'Error al copiar' : 'Copiar HTML'}
            </button>
            <button type="button" onClick={() => downloadHtml(doc, 'email-footer')}>
              Descargar .html
            </button>
          </div>
          <pre>{assembleEmailHtml(doc)}</pre>
        </div>
      )}
    </div>
  )
}

interface SlotBlockProps {
  label: string
  html: string
  error?: string
  selected: boolean
  onSelect: () => void
}

/**
 * Un bloque seleccionable del email. El HTML va en un iframe (para que su CSS
 * no se filtre a la app ni al revés) con una capa transparente encima que
 * captura el click: dentro del iframe no corre JS, así que no puede escuchar
 * eventos por sí mismo.
 */
function SlotBlock({ label, html, error, selected, onSelect }: SlotBlockProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(240)

  // Ajusta el alto al del contenido real para que el bloque se vea como la
  // sección del mail y no como una ventana con scroll. Requiere
  // allow-same-origin para poder leer el documento; los scripts siguen
  // deshabilitados (no se pasa allow-scripts), así que el HTML no ejecuta nada.
  const measure = () => {
    const body = iframeRef.current?.contentDocument?.body
    if (body) setHeight(Math.max(body.scrollHeight, 40))
  }

  if (error) {
    return (
      <div className="slot-block error">
        <span className="slot-badge">{label}</span>
        <div className="preview-error">{error}</div>
      </div>
    )
  }

  return (
    <div className={`slot-block${selected ? ' selected' : ''}`}>
      <span className="slot-badge">{label}</span>
      <iframe ref={iframeRef} title={`${label} preview`} srcDoc={html} sandbox="allow-same-origin" onLoad={measure} style={{ height }} />
      <div
        className="slot-hit"
        role="button"
        tabIndex={0}
        aria-label={`Seleccionar ${label}`}
        aria-pressed={selected}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onSelect()
          }
        }}
      />
    </div>
  )
}
