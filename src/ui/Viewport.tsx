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
// Los bloques de CONTENIDOS (hoy solo CTA) se miden aparte: no tienen ningún
// atributo propio que los distinga entre sí (el contenido real viene de un
// content block sincronizado, intocable) — se ubican caminando los
// comentarios `<!-- BLOCK:tipo:id -->` que la app misma agrega alrededor de
// cada instancia, ver measureContentBlocks() y template/contentBlocks.ts.
//
// La pestaña "Código" muestra el HTML ensamblado (con el Liquid intacto), que
// es lo que se copia/descarga — nunca pasa por LiquidJS.
// ============================================================================
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ContentBlockType, EmailDocument, SlotName } from '../model'
import { registry, SLOT_LABELS } from '../registry'
import { getContentBlockDef } from '../contentBlockRegistry'
import { assembleEmailHtml } from '../template/assemble'
import { BLOCK_CLOSE_RE, BLOCK_OPEN_RE } from '../template/contentBlocks'
import { copyHtmlToClipboard, downloadHtml } from '../export/exporters'
import { CodeView } from './CodeView'
import { isBlockSelected, isSlotSelected, selectBlock, selectSlot, type Selection } from './selection'
import { SLOT_DRAG_TYPE, CONTENT_BLOCK_DRAG_TYPE, CONTENT_BLOCK_REORDER_DRAG_TYPE } from './dragTypes'
import {
  PREVIEW_COUNTRIES,
  PREVIEW_COUNTRY_LABELS,
  renderEmailPreview,
  type PreviewCountry,
} from '../preview/liquidPreview'

interface ViewportProps {
  document: EmailDocument
  selected: Selection | null
  onSelect: (next: Selection) => void
  /** Escribe los campos de un slot por su docKey — igual que InspectorPanel.onChange, reutilizado acá para eliminar/restaurar singletons. */
  onChangeSlot: (docKey: keyof EmailDocument, fields: unknown) => void
  onInsertBlock: (type: ContentBlockType, atIndex: number) => void
  onDuplicateBlock: (id: string) => void
  onReorderBlock: (id: string, toIndex: number) => void
  onRemoveBlock: (id: string) => void
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
const SLOT_LOCATORS: Record<'HEADER' | 'FOOTER' | 'CIERRE', string> = {
  // El div que envuelve la tabla del header — HEADER1..HEADER4 según la marca
  // (ver 01-foundations/global-styles/global-styles.html).
  HEADER: '[id^="HEADER"]',
  // El footer no trae id ni role propios: es el hermano que sigue al
  // contenedor con padding donde viven header/banner/contenidos/cierre.
  FOOTER: 'table[role="paddedcontainer"]',
  // El cierre no trae wrapper propio tampoco (ver 05_closing/cierre.html):
  // se ubica por el único atributo estable que trae la imagen de firma.
  CIERRE: 'img[alt="RappiFirma"]',
}

export function Viewport({
  document: doc,
  selected,
  onSelect,
  onChangeSlot,
  onInsertBlock,
  onDuplicateBlock,
  onReorderBlock,
  onRemoveBlock,
}: ViewportProps) {
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

  // Eliminar/restaurar reutilizan setSlotFields (acá como onChangeSlot): no
  // es una acción nueva del store, solo escribe `removed` en el campo del
  // slot — mismo mecanismo que ya usa InspectorPanel para cualquier otro
  // cambio, así que entra al historial de undo/redo igual que el resto.
  const handleRemove = (slot: SlotName) => {
    const def = registry[slot]
    if (!def) return
    onChangeSlot(def.docKey, { ...doc[def.docKey], removed: true })
  }

  const handleRestore = (slot: SlotName) => {
    const def = registry[slot]
    if (!def) return
    onChangeSlot(def.docKey, { ...doc[def.docKey], removed: false })
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
            onRemove={handleRemove}
            onRestore={handleRestore}
            contenidos={doc.contenidos}
            onInsertBlock={onInsertBlock}
            onDuplicateBlock={onDuplicateBlock}
            onReorderBlock={onReorderBlock}
            onRemoveBlock={onRemoveBlock}
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
  selected: Selection | null
  onSelect: (next: Selection) => void
  onRemove: (slot: SlotName) => void
  onRestore: (slot: SlotName) => void
  contenidos: EmailDocument['contenidos']
  onInsertBlock: (type: ContentBlockType, atIndex: number) => void
  onDuplicateBlock: (id: string) => void
  onReorderBlock: (id: string, toIndex: number) => void
  onRemoveBlock: (id: string) => void
}

/** Dónde cayó un slot dentro del documento del iframe. */
interface SlotRect {
  slot: SlotName
  top: number
  left: number
  width: number
  height: number
}

/** Dónde cayó una instancia de bloque de contenido (ej. un CTA) dentro del documento del iframe. */
interface ContentBlockRect {
  id: string
  type: string
  top: number
  left: number
  width: number
  height: number
}

/** Los slots que hoy se pueden seleccionar, en el orden en que van en el mail. */
const SELECTABLE_SLOTS = ['HEADER', 'FOOTER', 'CIERRE'] as const

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
    } else if (slot === 'CIERRE') {
      // Tampoco tiene wrapper propio: se ubica por la imagen de firma y se
      // mide la tabla que la contiene (si no se encuentra, se usa la imagen
      // sola). No aparece nada acá cuando renderCierreSnippet devolvió '' —
      // eliminado a mano, tema Pro/ProBlack o Footer RTS.
      const img = root.querySelector(SLOT_LOCATORS.CIERRE)
      if (!img) continue
      const el = img.closest('table') ?? img
      const r = el.getBoundingClientRect()
      rects.push({ slot, top: r.top, left: r.left, width: r.width, height: r.height })
    }
  }
  return rects
}

/**
 * Mide dónde quedó cada instancia de bloque de contenido (hoy solo CTA),
 * caminando los comentarios `<!-- BLOCK:tipo:id -->` / `<!-- /BLOCK:tipo:id -->`
 * que la app agrega alrededor de cada una (ver template/contentBlocks.ts) y
 * acumulando el rect unión de todo lo que hay en medio. No asume nada sobre
 * la forma interna del contenido real (puede ser un solo <a> con tablas
 * anidadas, como el CTA, o algo más complejo en un futuro tipo de bloque):
 * un min/max acumulado sobre TODOS los elementos entre los dos comentarios
 * (no solo los de primer nivel) es correcto sin importar cuántos haya ni qué
 * tan anidados estén.
 */
function measureContentBlocks(root: Document): ContentBlockRect[] {
  if (!root.body) return []
  const rects: ContentBlockRect[] = []
  const walker = root.createTreeWalker(root.body, NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_ELEMENT)

  let current: { type: string; id: string; top: number; left: number; right: number; bottom: number } | null = null
  let node: Node | null = walker.nextNode()

  while (node) {
    if (node.nodeType === Node.COMMENT_NODE) {
      const data = (node as Comment).data
      const open = data.match(BLOCK_OPEN_RE)
      const close = data.match(BLOCK_CLOSE_RE)
      if (open) {
        current = { type: open[1], id: open[2], top: Infinity, left: Infinity, right: -Infinity, bottom: -Infinity }
      } else if (close && current && current.type === close[1] && current.id === close[2]) {
        if (current.right > current.left) {
          rects.push({
            id: current.id,
            type: current.type,
            top: current.top,
            left: current.left,
            width: current.right - current.left,
            height: current.bottom - current.top,
          })
        }
        current = null
      }
    } else if (node.nodeType === Node.ELEMENT_NODE && current) {
      const r = (node as Element).getBoundingClientRect()
      if (r.width > 0 || r.height > 0) {
        current.top = Math.min(current.top, r.top)
        current.left = Math.min(current.left, r.left)
        current.right = Math.max(current.right, r.right)
        current.bottom = Math.max(current.bottom, r.bottom)
      }
    }
    node = walker.nextNode()
  }
  return rects
}

/** Y del drop, en el mismo espacio de coordenadas que los rects medidos (el interno del iframe, no el del documento padre). */
function dropYInFrameSpace(e: React.DragEvent, frameEl: HTMLElement): number {
  return e.clientY - frameEl.getBoundingClientRect().top
}

/**
 * Resuelve el índice de destino comparando la Y del drop contra el punto
 * medio vertical de cada bloque medido (en su orden ACTUAL, antes de sacar
 * nada) — el primero cuyo punto medio quede debajo del cursor es donde se
 * inserta; si ninguno, va al final. Sirve tanto para insertar un bloque nuevo
 * como para reordenar uno existente: el ajuste por el propio bloque
 * arrastrado (que corre el índice si se mueve hacia adelante) vive en
 * store/store.ts (reorderContentBlock), no acá.
 */
function resolveDropIndex(order: string[], rectsById: Map<string, ContentBlockRect>, dropY: number): number {
  for (let i = 0; i < order.length; i++) {
    const rect = rectsById.get(order[i])
    if (!rect) continue
    const midY = rect.top + rect.height / 2
    if (dropY < midY) return i
  }
  return order.length
}

/**
 * El email completo en un iframe. Va con `allow-same-origin` (sin
 * `allow-scripts`, así que el HTML del mail no ejecuta nada) para poder medir
 * desde acá su alto real y la posición de cada slot.
 */
function EmailFrame({
  html,
  device,
  clientScheme,
  selected,
  onSelect,
  onRemove,
  onRestore,
  contenidos,
  onInsertBlock,
  onDuplicateBlock,
  onReorderBlock,
  onRemoveBlock,
}: EmailFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const frameElRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(600)
  const [slotRects, setSlotRects] = useState<SlotRect[]>([])
  const [blockRects, setBlockRects] = useState<ContentBlockRect[]>([])
  const [dragOver, setDragOver] = useState(false)

  const syncFrame = useCallback(() => {
    const root = iframeRef.current?.contentDocument
    if (!root?.body) return
    applyClientScheme(root, clientScheme)
    setHeight(Math.max(root.body.scrollHeight, 200))
    setSlotRects(measureSlots(root))
    setBlockRects(measureContentBlocks(root))
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

  const resolveIndexForDrop = (e: React.DragEvent): number => {
    const order = contenidos.map((b) => b.id)
    const rectsById = new Map(blockRects.map((r) => [r.id, r]))
    const dropY = frameElRef.current ? dropYInFrameSpace(e, frameElRef.current) : 0
    return resolveDropIndex(order, rectsById, dropY)
  }

  return (
    <div className="viewport-canvas">
      <div
        ref={frameElRef}
        className={`email-frame${dragOver ? ' drag-over' : ''}`}
        style={device === 'mobile' ? { width: MOBILE_WIDTH } : undefined}
        // Los handlers van en este ancestro común (no en canvas-drop-layer
        // directamente) para que también reciban, por bubbling normal del
        // DOM, los eventos que caen sobre un overlay .slot-hit (ej. el del
        // FOOTER, que puede cubrir gran parte del canvas) — si vivieran solo
        // en canvas-drop-layer, un slot-hit por encima los taparía porque es
        // un hermano posterior en el DOM, no un descendiente. Los 3 gestos de
        // drag (restaurar singleton / insertar bloque nuevo / reordenar) se
        // despachan acá según qué dataTransfer type venga presente.
        onDragOver={(e) => {
          const types = e.dataTransfer.types
          if (
            types.includes(SLOT_DRAG_TYPE) ||
            types.includes(CONTENT_BLOCK_DRAG_TYPE) ||
            types.includes(CONTENT_BLOCK_REORDER_DRAG_TYPE)
          ) {
            e.preventDefault()
            e.dataTransfer.dropEffect = types.includes(CONTENT_BLOCK_REORDER_DRAG_TYPE) ? 'move' : 'copy'
            setDragOver(true)
          }
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          setDragOver(false)

          const slot = e.dataTransfer.getData(SLOT_DRAG_TYPE)
          if (slot) {
            e.preventDefault()
            onRestore(slot as SlotName)
            return
          }

          const newType = e.dataTransfer.getData(CONTENT_BLOCK_DRAG_TYPE)
          if (newType) {
            e.preventDefault()
            onInsertBlock(newType as ContentBlockType, resolveIndexForDrop(e))
            return
          }

          const reorderId = e.dataTransfer.getData(CONTENT_BLOCK_REORDER_DRAG_TYPE)
          if (reorderId) {
            e.preventDefault()
            onReorderBlock(reorderId, resolveIndexForDrop(e))
          }
        }}
      >
        <iframe
          ref={iframeRef}
          title="Preview del email"
          srcDoc={html}
          sandbox="allow-same-origin"
          onLoad={syncFrame}
          style={{ height }}
        />
        {/*
          Capa siempre presente entre el iframe y los overlays de slot: un
          <iframe> es un documento aparte y puede "tragarse" los eventos
          nativos de drag cuando el cursor pasa directo sobre él sin nada
          delante — con esta capa el cursor nunca toca el iframe, así que el
          drop llega de forma confiable sin importar dónde se suelte dentro
          del canvas (los handlers en sí viven en .email-frame, ver arriba).
        */}
        <div className="canvas-drop-layer" style={{ height }} />
        {slotRects.map(({ slot, top, left, width, height: h }) => (
          <div
            key={slot}
            className={`slot-hit${isSlotSelected(selected, slot) ? ' selected' : ''}`}
            style={{ top, left, width, height: h }}
          >
            <button
              type="button"
              className="slot-select"
              aria-label={`Seleccionar ${SLOT_LABELS[slot]}`}
              aria-pressed={isSlotSelected(selected, slot)}
              onClick={() => onSelect(selectSlot(slot))}
            >
              <span className="slot-badge">{SLOT_LABELS[slot]}</span>
            </button>
            {registry[slot]?.removable && (
              <button
                type="button"
                className="slot-delete"
                aria-label={`Eliminar ${SLOT_LABELS[slot]}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove(slot)
                }}
              >
                ×
              </button>
            )}
          </div>
        ))}
        {blockRects.map(({ id, type, top, left, width, height: h }) => (
          <div
            key={id}
            className={`slot-hit block-hit${isBlockSelected(selected, id) ? ' selected' : ''}`}
            style={{ top, left, width, height: h }}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(CONTENT_BLOCK_REORDER_DRAG_TYPE, id)
              e.dataTransfer.effectAllowed = 'move'
            }}
          >
            <button
              type="button"
              className="slot-select"
              aria-label={`Seleccionar ${getContentBlockDef(type)?.label ?? type}`}
              aria-pressed={isBlockSelected(selected, id)}
              onClick={() => onSelect(selectBlock(id))}
            >
              <span className="slot-badge">{getContentBlockDef(type)?.label ?? type}</span>
            </button>
            <button
              type="button"
              className="slot-duplicate"
              aria-label="Duplicar"
              onClick={(e) => {
                e.stopPropagation()
                onDuplicateBlock(id)
              }}
            >
              ⧉
            </button>
            <button
              type="button"
              className="slot-delete"
              aria-label="Eliminar"
              onClick={(e) => {
                e.stopPropagation()
                onRemoveBlock(id)
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
