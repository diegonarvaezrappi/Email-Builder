// ============================================================================
// Panel central: el email en construcción, renderizado como UN SOLO documento
// — el HTML real exportado, resuelto (ver preview/liquidPreview.ts). Se ve
// igual que en Gmail: el fondo del tema a todo lo ancho y el contenido
// centrado a 600px, porque esos valores salen del maestro y no de la app.
//
// Los slots todavía sin implementar no se dibujan: el maestro deja sus
// marcadores como comentarios HTML, así que simplemente no ocupan espacio —
// el mail se ve tal cual saldría hoy. Qué falta por implementar se lee en la
// librería de la izquierda.
//
// Para seleccionar un componente NO se toca el HTML del mail (debe quedar byte
// a byte igual al exportado): se mide dónde cayó cada slot dentro del iframe
// —el header es el div `#HEADERn`, el footer es todo lo que va después del
// `role="paddedcontainer"`— y se dibujan capas clickeables encima, del lado de
// la app. Medir requiere `allow-same-origin`; los scripts siguen bloqueados.
//
// La pestaña "Código" muestra el HTML ensamblado (con el Liquid intacto), que
// es lo que se copia/descarga — nunca pasa por LiquidJS.
// ============================================================================
import { useCallback, useEffect, useRef, useState } from 'react'
import type { EmailDocument, SlotName } from '../model'
import { registry, SLOT_LABELS } from '../registry'
import { assembleEmailHtml } from '../template/assemble'
import { copyHtmlToClipboard, downloadHtml } from '../export/exporters'
import { CodeView } from './CodeView'
import {
  PREVIEW_COUNTRIES,
  PREVIEW_COUNTRY_LABELS,
  renderEmailPreview,
  type PreviewCountry,
} from '../preview/liquidPreview'

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
 * undo/redo, no se persiste, y jamás toca el HTML exportado — se inyecta como
 * un <style> en el DOM del iframe en tiempo de ejecución (ver DARK_SIM_CSS).
 */
type EmailClientScheme = 'light' | 'dark'

/** Filtro de auto-oscurecido. Se usa dos veces; ver DARK_SIM_CSS. */
const DARK_SIM_FILTER = 'invert(1) hue-rotate(180deg)'

const DARK_SIM_STYLE_ID = 'email-builder-dark-sim'

/**
 * La simulación de "cliente con dark mode": se invierte el documento entero y
 * se vuelve a invertir SOLO el contenido multimedia, con lo que las imágenes
 * quedan a color normal. Es lo que hacen Gmail/Outlook/Apple Mail y los
 * simuladores de dark mode: oscurecen fondos y textos, pero no tocan las fotos
 * ni los logos.
 *
 * Por qué `invert(1) hue-rotate(180deg)` y no `invert(1)` a secas: sin el
 * hue-rotate los tonos se van al color complementario (un link azul sale
 * amarillo y el naranja de marca sale cian). Con él los matices se conservan.
 * El precio es que el hue-rotate recorta los valores fuera de gama, así que la
 * doble inversión de las imágenes no es exactamente idéntica al original
 * (los colores muy saturados pierden algo de saturación) — se comparó contra
 * `invert(1)` puro, que devuelve la imagen exacta pero rompe todos los tonos
 * del resto, y esta es la mejor de las dos.
 *
 * Va DENTRO del documento del iframe: es la única forma de exceptuar las
 * imágenes, porque un filtro puesto en el elemento <iframe> se aplica al
 * resultado ya rasterizado y no distingue su contenido.
 *
 * El `background-color` explícito en `html` evita depender de la propagación
 * del fondo de `body` al canvas, que no queda cubierta por el filtro.
 */
const DARK_SIM_CSS = [
  `html{filter:${DARK_SIM_FILTER};background-color:#ffffff}`,
  `img,picture,video,svg{filter:${DARK_SIM_FILTER}}`,
].join('')

/** Prende o apaga la simulación en el documento del iframe (sin recargarlo). */
function applyClientScheme(root: Document, scheme: EmailClientScheme): void {
  const existing = root.getElementById(DARK_SIM_STYLE_ID)
  if (scheme === 'light') {
    existing?.remove()
    return
  }
  if (existing) return
  const style = root.createElement('style')
  style.id = DARK_SIM_STYLE_ID
  style.textContent = DARK_SIM_CSS
  ;(root.head ?? root.documentElement).appendChild(style)
}

/**
 * Ancho del preview — Escritorio (todo el ancho del panel, como la ventana de
 * Gmail) o Móvil (375px, el ancho lógico estándar de iPhone que usan Litmus /
 * Email on Acid). Al angostar el <iframe> a ese ancho se disparan de verdad
 * los `@media (max-width:480px/620px)` que ya trae el maestro, así que la
 * vista Móvil es el mismo responsive real del mail, no una maqueta aparte.
 *
 * Es un ajuste de VISTA, igual que EmailClientScheme.
 */
type PreviewDevice = 'desktop' | 'mobile'

const MOBILE_WIDTH = 375

/** Cómo se ubica cada slot implementado dentro del documento del mail. */
const SLOT_LOCATORS: Record<'HEADER' | 'FOOTER', string> = {
  // El div que envuelve la tabla del header — HEADER1..HEADER4 según la marca
  // (ver 01-foundations/global-styles/global-styles.html).
  HEADER: '[id^="HEADER"]',
  // El footer no trae id ni role propios: es el hermano que sigue al
  // contenedor con padding donde viven header/banner/contenidos/cierre.
  FOOTER: 'table[role="paddedcontainer"]',
}

export function Viewport({ document: doc, selected, onSelect }: ViewportProps) {
  const [tab, setTab] = useState<Tab>('preview')
  const [country, setCountry] = useState<PreviewCountry>('CO')
  const [device, setDevice] = useState<PreviewDevice>('desktop')
  // Simula el color-scheme del CLIENTE de correo (Gmail/Outlook/Apple Mail con
  // dark mode activado), no de la app. Es un ajuste de vista, no del email:
  // arranca en 'light' cada carga y nunca toca el HTML exportado.
  const [clientScheme, setClientScheme] = useState<EmailClientScheme>('light')
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewError, setPreviewError] = useState<string | undefined>()
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')

  useEffect(() => {
    let cancelled = false
    renderEmailPreview(doc, country).then((result) => {
      if (cancelled) return
      setPreviewHtml(result.html)
      setPreviewError(result.error)
    })
    return () => {
      cancelled = true
    }
  }, [doc, country])

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
        previewError ? (
          <div className="viewport-canvas">
            <div className="preview-error">{previewError}</div>
          </div>
        ) : (
          <EmailFrame
            html={previewHtml}
            device={device}
            clientScheme={clientScheme}
            selected={selected}
            onSelect={onSelect}
          />
        )
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

interface EmailFrameProps {
  html: string
  device: PreviewDevice
  clientScheme: EmailClientScheme
  selected: SlotName | null
  onSelect: (slot: SlotName) => void
}

/** Dónde cayó un slot dentro del documento del iframe. */
interface SlotRect {
  slot: SlotName
  top: number
  left: number
  width: number
  height: number
}

/** Los slots que hoy se pueden seleccionar, en el orden en que van en el mail. */
const SELECTABLE_SLOTS = ['HEADER', 'FOOTER'] as const

/**
 * Mide dónde quedó cada slot implementado dentro del documento ya renderizado.
 * El iframe se estira a su alto completo (no scrollea por dentro), así que
 * getBoundingClientRect ya devuelve coordenadas del contenido y no hace falta
 * corregir por scroll.
 */
function measureSlots(root: Document): SlotRect[] {
  const rects: SlotRect[] = []
  const padded = root.querySelector(SLOT_LOCATORS.FOOTER)

  for (const slot of SELECTABLE_SLOTS) {
    if (!registry[slot]) continue

    if (slot === 'HEADER') {
      const el = root.querySelector(SLOT_LOCATORS.HEADER)
      if (!el) continue
      const r = el.getBoundingClientRect()
      rects.push({ slot, top: r.top, left: r.left, width: r.width, height: r.height })
    } else if (slot === 'FOOTER') {
      // El footer no tiene contenedor propio: es todo lo que sigue al
      // paddedcontainer, hasta el final del documento.
      if (!padded || !root.body) continue
      const top = padded.getBoundingClientRect().bottom
      const body = root.body.getBoundingClientRect()
      const height = Math.max(body.bottom - top, 0)
      if (height === 0) continue
      rects.push({ slot, top, left: body.left, width: body.width, height })
    }
  }
  return rects
}

/**
 * El email completo en un iframe. Va con `allow-same-origin` (sin
 * `allow-scripts`, así que el HTML del mail no ejecuta nada) para poder medir
 * desde acá su alto real y la posición de cada slot.
 */
function EmailFrame({ html, device, clientScheme, selected, onSelect }: EmailFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(600)
  const [slotRects, setSlotRects] = useState<SlotRect[]>([])

  const syncFrame = useCallback(() => {
    const root = iframeRef.current?.contentDocument
    if (!root?.body) return
    applyClientScheme(root, clientScheme)
    setHeight(Math.max(root.body.scrollHeight, 200))
    setSlotRects(measureSlots(root))
  }, [clientScheme])

  // Re-sincronizar cuando cambia el HTML, el ancho o el esquema de cliente: el
  // srcDoc puede terminar de cargar después de este efecto (de ahí el onLoad
  // del iframe), y el alto definitivo llega recién cuando cargan las imágenes
  // del mail. `syncFrame` cambia con clientScheme, así que el toggle
  // Claro/Oscuro entra por acá sin recargar el iframe.
  useEffect(() => {
    syncFrame()
    const id = setTimeout(syncFrame, 300)
    const onResize = () => syncFrame()
    window.addEventListener('resize', onResize)
    return () => {
      clearTimeout(id)
      window.removeEventListener('resize', onResize)
    }
  }, [html, device, syncFrame])

  return (
    <div className="viewport-canvas">
      <div className="email-frame" style={device === 'mobile' ? { width: MOBILE_WIDTH } : undefined}>
        <iframe
          ref={iframeRef}
          title="Preview del email"
          srcDoc={html}
          sandbox="allow-same-origin"
          onLoad={syncFrame}
          style={{ height }}
        />
        {slotRects.map(({ slot, top, left, width, height: h }) => (
          <button
            key={slot}
            type="button"
            className={`slot-hit${selected === slot ? ' selected' : ''}`}
            aria-label={`Seleccionar ${SLOT_LABELS[slot]}`}
            aria-pressed={selected === slot}
            onClick={() => onSelect(slot)}
            style={{ top, left, width, height: h }}
          >
            <span className="slot-badge">{SLOT_LABELS[slot]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
