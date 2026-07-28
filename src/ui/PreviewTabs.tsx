import { useEffect, useState } from 'react'
import type { EmailDocument } from '../model'
import { assembleEmailHtml } from '../template/assemble'
import { copyHtmlToClipboard, downloadHtml } from '../export/exporters'
import {
  PREVIEW_COUNTRIES,
  PREVIEW_COUNTRY_LABELS,
  renderFooterPreview,
  type PreviewCountry,
} from '../preview/liquidPreview'

interface PreviewTabsProps {
  document: EmailDocument
}

type Tab = 'preview' | 'code'

export function PreviewTabs({ document: doc }: PreviewTabsProps) {
  const [tab, setTab] = useState<Tab>('preview')
  const [country, setCountry] = useState<PreviewCountry>('CO')
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewError, setPreviewError] = useState<string | undefined>()
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')

  useEffect(() => {
    let cancelled = false
    renderFooterPreview(doc.footer, country).then((result) => {
      if (cancelled) return
      setPreviewHtml(result.html)
      setPreviewError(result.error)
    })
    return () => {
      cancelled = true
    }
  }, [doc.footer, country])

  const code = assembleEmailHtml(doc)

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
    <div className="panel-preview">
      <div className="preview-tabs">
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
        <div className="preview-body">
          {previewError ? (
            <div className="preview-error">{previewError}</div>
          ) : (
            <iframe title="Footer preview" srcDoc={previewHtml} sandbox="" />
          )}
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
          <pre>{code}</pre>
        </div>
      )}
    </div>
  )
}
