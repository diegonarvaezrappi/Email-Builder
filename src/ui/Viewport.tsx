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
import { CodeView } from './CodeView'
import { PREVIEW_COUNTRIES, PREVIEW_COUNTRY_LABELS, renderFooterPreview, type PreviewCountry } from '../preview/liquidPreview'

interface ViewportProps {
  document: EmailDocument
  selected: SlotName | null
  onSelect: (slot: SlotName) => void
}

type Tab = 'preview' | 'code'

/**
 * Cómo se ve el email en el "cliente de correo" simulado — Claro (el mail tal
 * cual, sin tocar) u Oscuro (como lo dejaría un cliente con dark mode
 * activado: el repo no trae NINGÚN soporte nativo de dark mode para el email
 * — sin `prefers-color-scheme`, sin `color-scheme`, sin los selectores que usa
 * Gmail — así que un cliente con dark mode encendido no "respeta" nada del
 * mail, lo auto-oscurece él mismo con su propio algoritmo, como hacen Gmail,
 * Outlook y Apple Mail con cualquier correo sin soporte explícito).
 *
 * Es un ajuste de VISTA, nunca del documento: no entra al historial de
 * undo/redo, no se persiste, y jamás toca el HTML exportado — se aplica como
 * filtro CSS al <iframe> del preview, ver SlotBlock más abajo.
 */
type EmailClientScheme = 'light' | 'dark'

/**
 * Ancho del canvas de preview — Escritorio (sin límite práctico, como se ve
 * hoy) o Móvil (375px, el ancho lógico estándar de iPhone que usan Litmus /
 * Email on Acid para simular "mobile"). Al angostar el <iframe> a ese ancho
 * se disparan de verdad los `@media (max-width:480px/620px)` que ya trae el
 * template maestro, así que la vista Móvil es el mismo responsive real del
 * mail, no una maqueta aparte.
 *
 * Es un ajuste de VISTA, igual que EmailClientScheme: no entra al historial
 * de undo/redo, no se persiste, y nunca toca el HTML exportado.
 */
type PreviewDevice = 'desktop' | 'mobile'

export function Viewport({ document: doc, selected, onSelect }: ViewportProps) {
  const [tab, setTab] = useState<Tab>('preview')
  const [country, setCountry] = useState<PreviewCountry>('CO')
  const [device, setDevice] = useState<PreviewDevice>('desktop')
  // Simula el color-scheme del CLIENTE de correo (Gmail/Outlook/Apple Mail con
  // dark mode activado), no de la app. Es un ajuste de vista, no del email:
  // arranca en 'light' cada carga y nunca toca el HTML exportado — ver
  // preview/liquidPreview.ts.
  const [clientScheme, setClientScheme] = useState<EmailClientScheme>('light')
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewError, setPreviewError] = useState<string | undefined>()
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')

  useEffect(() => {
    let cancelled = false
    renderFooterPreview(doc.footer, country, doc.global).then((result) => {
      if (cancelled) return
      setPreviewHtml(result.html)
      setPreviewError(result.error)
    })
    return () => {
      cancelled = true
    }
  }, [doc.footer, country, doc.global])

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
          <>
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

            <div className="client-scheme" role="group" aria-label="Simular cliente de correo (solo preview)">
              <span>Cliente (solo preview)</span>
              <button
                type="button"
                className={clientScheme === 'light' ? 'active' : ''}
                aria-pressed={clientScheme === 'light'}
                onClick={() => setClientScheme('light')}
              >
                ☀️ Claro
              </button>
              <button
                type="button"
                className={clientScheme === 'dark' ? 'active' : ''}
                aria-pressed={clientScheme === 'dark'}
                onClick={() => setClientScheme('dark')}
              >
                🌙 Oscuro
              </button>
            </div>

            <div className="device-scheme" role="group" aria-label="Tamaño de preview (solo vista)">
              <span>Vista</span>
              <button
                type="button"
                className={device === 'desktop' ? 'active' : ''}
                aria-pressed={device === 'desktop'}
                onClick={() => setDevice('desktop')}
              >
                🖥️ Escritorio
              </button>
              <button
                type="button"
                className={device === 'mobile' ? 'active' : ''}
                aria-pressed={device === 'mobile'}
                onClick={() => setDevice('mobile')}
              >
                📱 Móvil
              </button>
            </div>
          </>
        )}
      </div>

      {tab === 'preview' ? (
        <div className="viewport-canvas">
          <div className={`email-doc${device === 'mobile' ? ' email-doc-mobile' : ''}`}>
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
                  clientScheme={clientScheme}
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
          <CodeView code={assembleEmailHtml(doc)} />
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
  clientScheme: EmailClientScheme
  onSelect: () => void
}

/**
 * Un bloque seleccionable del email. El HTML va en un iframe (para que su CSS
 * no se filtre a la app ni al revés) con una capa transparente encima que
 * captura el click: dentro del iframe no corre JS, así que no puede escuchar
 * eventos por sí mismo.
 *
 * La simulación de cliente oscuro es un `filter: invert() hue-rotate()` en
 * el <iframe> MISMO (no en su contenido interno): se probó ponerlo dentro del
 * srcDoc y Chromium simplemente no lo pinta, aunque el computed style lo
 * reporte aplicado — es un límite real del navegador con filtros dentro de un
 * documento de iframe, verificado con capturas. La consecuencia es que las
 * imágenes/logos también se invierten (no hay forma de cancelarlo solo en
 * ellas desde acá): es una aproximación, no una réplica exacta de cómo Gmail
 * distingue fotos del resto.
 */
function SlotBlock({ label, html, error, selected, clientScheme, onSelect }: SlotBlockProps) {
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
      <iframe
        ref={iframeRef}
        title={`${label} preview`}
        srcDoc={html}
        sandbox="allow-same-origin"
        onLoad={measure}
        className={clientScheme === 'dark' ? 'client-dark-sim' : undefined}
        style={{ height }}
      />
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
