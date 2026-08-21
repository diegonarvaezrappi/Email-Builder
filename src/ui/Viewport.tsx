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
// Los bloques de CONTENIDOS (hoy CTA y DEALS) se miden aparte: no tienen ningún
// atributo propio que los distinga entre sí (el contenido real viene de un
// content block sincronizado, intocable) — se ubican caminando los
// comentarios `<!-- BLOCK:tipo:id -->` que la app misma agrega alrededor de
// cada instancia, ver measureContentBlocks() y template/contentBlocks.ts.
//
// Las tarjetas de un bloque DEALS se miden con el mismo mecanismo pero con una
// vuelta más: el HTML de una tarjeta NO es contiguo (vive en las 3 filas del par
// de deals), así que emite varios pares de marcadores con el mismo id y hay que
// unir sus rects — ver mergeRectsById().
//
// La pestaña "Código" muestra el HTML ensamblado (con el Liquid intacto), que
// es lo que se copia/descarga — nunca pasa por LiquidJS.
// ============================================================================
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ContentBlockType, EmailDocument, SlotName } from '../model'
import type { BannerItemType } from '../components/banner/items/schemas'
import type { BannerType } from '../components/banner/schema'
import { DEAL_CARD_PIECE_LABELS, hideDealCardPiece, type DealCardPieceType } from '../components/deals/schema'
import { registry, SLOT_LABELS } from '../registry'
import { getContentBlockDef } from '../contentBlockRegistry'
import { getBannerItemDef } from '../bannerItemRegistry'
import { assembleEmailHtml } from '../template/assemble'
import {
  BLOCK_CLOSE_RE,
  BLOCK_OPEN_RE,
  BANNER_ITEM_CLOSE_RE,
  BANNER_ITEM_OPEN_RE,
  DEAL_CARD_CLOSE_RE,
  DEAL_CARD_OPEN_RE,
  DEAL_CARD_PIECE_CLOSE_RE,
  DEAL_CARD_PIECE_OPEN_RE,
} from '../template/contentBlocks'
import { findDealsBlockByCard } from '../components/deals/blocks'
import { copyHtmlToClipboard, downloadHtml } from '../export/exporters'
import { CodeView } from './CodeView'
import {
  isBannerItemSelected,
  isBlockSelected,
  isDealCardPieceSelected,
  isDealCardSelected,
  isSlotSelected,
  selectBannerItem,
  selectBlock,
  selectDealCard,
  selectDealCardPiece,
  selectSlot,
  type Selection,
} from './selection'
import {
  SLOT_DRAG_TYPE,
  CONTENT_BLOCK_DRAG_TYPE,
  CONTENT_BLOCK_REORDER_DRAG_TYPE,
  BANNER_TYPE_DRAG_TYPE,
  BANNER_ITEM_DRAG_TYPE,
  BANNER_ITEM_REORDER_DRAG_TYPE,
  DEAL_CARD_REORDER_DRAG_TYPE,
  DEAL_CARD_PIECE_REORDER_DRAG_TYPE,
} from './dragTypes'
import { dropXInFrameSpace, dropYInFrameSpace, resolveDropIndex, resolveDropIndexReadingOrder, type DropRect } from './dropIndex'
import {
  PREVIEW_COUNTRIES,
  PREVIEW_COUNTRY_LABELS,
  renderEmailPreview,
  type PreviewCountry,
} from '../preview/liquidPreview'
import { applyClientScheme, type EmailClientScheme } from './darkSim'

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
  onInsertBannerItem: (type: BannerItemType, atIndex: number) => void
  onDuplicateBannerItem: (id: string) => void
  onReorderBannerItem: (id: string, toIndex: number) => void
  onRemoveBannerItem: (id: string) => void
  onDuplicateDealCard: (cardId: string) => void
  onReorderDealCard: (cardId: string, toIndex: number) => void
  onRemoveDealCard: (cardId: string) => void
  onReorderDealCardPiece: (cardId: string, pieceType: DealCardPieceType, toIndex: number) => void
  /** Reutilizado acá para el botón "×" inline de una línea de deal en el
   *  lienzo (oculta esa pieza puntual) — misma acción del store que ya usa
   *  ui/InspectorPanel.tsx (onChangeDealCard ahí), ver DealCardPiecePropertiesPanel. */
  onChangeDealCard: (cardId: string, fields: unknown) => void
}

type Tab = 'preview' | 'code'

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
const SLOT_LOCATORS: Record<'HEADER' | 'BANNER' | 'FOOTER' | 'CIERRE', string> = {
  // El div que envuelve la tabla del header — HEADER1..HEADER4 según la marca
  // (ver 01-foundations/global-styles/global-styles.html).
  HEADER: '[id^="HEADER"]',
  // Los 2 archivos de banner traen id propio en su <table> exterior
  // (BANNER_HORIZONTAL / BANNER_VERTICAL), del que además dependen los
  // `@media` de global-styles.html — es el localizador más estable del mail.
  BANNER: 'table[id^="BANNER_"]',
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
  onInsertBannerItem,
  onDuplicateBannerItem,
  onReorderBannerItem,
  onRemoveBannerItem,
  onDuplicateDealCard,
  onReorderDealCard,
  onRemoveDealCard,
  onReorderDealCardPiece,
  onChangeDealCard,
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

  // Elegir un TIPO de banner desde la librería (arrastrando la card) fija ese
  // tipo — el banner en sí nunca se elimina, así que no hay nada que restaurar.
  const handleSetBannerType = (type: BannerType) => {
    onChangeSlot('banner', { ...doc.banner, bannerType: type })
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
            onSetBannerType={handleSetBannerType}
            contenidos={doc.contenidos}
            onInsertBlock={onInsertBlock}
            onDuplicateBlock={onDuplicateBlock}
            onReorderBlock={onReorderBlock}
            onRemoveBlock={onRemoveBlock}
            bannerItems={doc.banner.items}
            onInsertBannerItem={onInsertBannerItem}
            onDuplicateBannerItem={onDuplicateBannerItem}
            onReorderBannerItem={onReorderBannerItem}
            onRemoveBannerItem={onRemoveBannerItem}
            onDuplicateDealCard={onDuplicateDealCard}
            onReorderDealCard={onReorderDealCard}
            onRemoveDealCard={onRemoveDealCard}
            onReorderDealCardPiece={onReorderDealCardPiece}
            onChangeDealCard={onChangeDealCard}
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
  onSetBannerType: (type: BannerType) => void
  contenidos: EmailDocument['contenidos']
  onInsertBlock: (type: ContentBlockType, atIndex: number) => void
  onDuplicateBlock: (id: string) => void
  onReorderBlock: (id: string, toIndex: number) => void
  onRemoveBlock: (id: string) => void
  bannerItems: EmailDocument['banner']['items']
  onInsertBannerItem: (type: BannerItemType, atIndex: number) => void
  onDuplicateBannerItem: (id: string) => void
  onReorderBannerItem: (id: string, toIndex: number) => void
  onRemoveBannerItem: (id: string) => void
  onDuplicateDealCard: (cardId: string) => void
  onReorderDealCard: (cardId: string, toIndex: number) => void
  onRemoveDealCard: (cardId: string) => void
  onReorderDealCardPiece: (cardId: string, pieceType: DealCardPieceType, toIndex: number) => void
  onChangeDealCard: (cardId: string, fields: unknown) => void
}

/** Dónde cayó un slot dentro del documento del iframe. */
interface SlotRect {
  slot: SlotName
  top: number
  left: number
  width: number
  height: number
}

/** Dónde cayó una instancia repetible (bloque de CONTENIDOS o pieza de Banner)
 *  dentro del documento del iframe. */
interface MarkedBlockRect extends DropRect {
  id: string
  type: string
}

/** Los slots que hoy se pueden seleccionar, en el orden en que van en el mail. */
const SELECTABLE_SLOTS = ['HEADER', 'BANNER', 'FOOTER', 'CIERRE'] as const

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

    if (slot === 'HEADER' || slot === 'BANNER') {
      const el = root.querySelector(SLOT_LOCATORS[slot])
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
 * Mide dónde quedó cada instancia repetible (un bloque de CONTENIDOS, hoy
 * solo CTA, o una pieza de Banner), caminando el par de comentarios que la
 * app agrega alrededor de cada una (ver template/contentBlocks.ts) y
 * acumulando el rect unión de todo lo que hay en medio. No asume nada sobre
 * la forma interna del contenido real (puede ser un solo <a> con tablas
 * anidadas, como el CTA, o algo más complejo): un min/max acumulado sobre
 * TODOS los elementos entre los dos comentarios (no solo los de primer nivel)
 * es correcto sin importar cuántos haya ni qué tan anidados estén.
 *
 * Genérica sobre qué par de regex caminar: measureContentBlocks/measureBannerItems
 * (más abajo) la instancian con BLOCK_* / BANNER_ITEM_* respectivamente — los 2
 * sistemas de marcadores nunca se cruzan entre sí (ver template/contentBlocks.ts).
 */
function measureMarkedBlocks(root: Document, openRe: RegExp, closeRe: RegExp): MarkedBlockRect[] {
  if (!root.body) return []
  const rects: MarkedBlockRect[] = []
  const walker = root.createTreeWalker(root.body, NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_ELEMENT)

  let current: { type: string; id: string; top: number; left: number; right: number; bottom: number } | null = null
  let node: Node | null = walker.nextNode()

  while (node) {
    if (node.nodeType === Node.COMMENT_NODE) {
      const data = (node as Comment).data
      const open = data.match(openRe)
      const close = data.match(closeRe)
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

const measureContentBlocks = (root: Document): MarkedBlockRect[] => measureMarkedBlocks(root, BLOCK_OPEN_RE, BLOCK_CLOSE_RE)
const measureBannerItems = (root: Document): MarkedBlockRect[] =>
  measureMarkedBlocks(root, BANNER_ITEM_OPEN_RE, BANNER_ITEM_CLOSE_RE)

/**
 * Une en un solo rect los que comparten `id`. Hace falta solo para las tarjetas
 * de deal: a diferencia de un bloque de CONTENIDOS o una pieza de banner (un
 * fragmento contiguo, un par de marcadores), el HTML de UNA tarjeta vive
 * repartido en las 3 filas del par (imagen / textos / legales), que no son
 * contiguas — así que emite 2 o 3 pares de marcadores con el mismo id y
 * measureMarkedBlocks devuelve un rect por cada uno. El overlay tiene que
 * cubrir la tarjeta completa, o sea la unión.
 */
function mergeRectsById(rects: MarkedBlockRect[]): MarkedBlockRect[] {
  const byId = new Map<string, MarkedBlockRect>()
  for (const rect of rects) {
    const previous = byId.get(rect.id)
    if (!previous) {
      byId.set(rect.id, rect)
      continue
    }
    const top = Math.min(previous.top, rect.top)
    const left = Math.min(previous.left, rect.left)
    const right = Math.max(previous.left + previous.width, rect.left + rect.width)
    const bottom = Math.max(previous.top + previous.height, rect.top + rect.height)
    byId.set(rect.id, { id: rect.id, type: previous.type, top, left, width: right - left, height: bottom - top })
  }
  return [...byId.values()]
}

/** `type` acá es el id del BLOQUE dueño, no un tipo de pieza — ver
 *  wrapWithDealCardMarkers en template/contentBlocks.ts. */
const measureDealCards = (root: Document): MarkedBlockRect[] =>
  mergeRectsById(measureMarkedBlocks(root, DEAL_CARD_OPEN_RE, DEAL_CARD_CLOSE_RE))

/** `type` acá es el id de la TARJETA dueña, `id` es el tipo de pieza — ver
 *  wrapWithDealCardPieceMarkers en template/contentBlocks.ts (convención
 *  invertida respecto a measureDealCards, mismo motivo: ahí `type` es el id
 *  del bloque dueño). Sin merge por id, a diferencia de measureDealCards:
 *  cada pieza es un fragmento único y contiguo, nunca repetido. */
const measureDealCardPieces = (root: Document): MarkedBlockRect[] =>
  measureMarkedBlocks(root, DEAL_CARD_PIECE_OPEN_RE, DEAL_CARD_PIECE_CLOSE_RE)

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
  onSetBannerType,
  contenidos,
  onInsertBlock,
  onDuplicateBlock,
  onReorderBlock,
  onRemoveBlock,
  bannerItems,
  onInsertBannerItem,
  onDuplicateBannerItem,
  onReorderBannerItem,
  onRemoveBannerItem,
  onDuplicateDealCard,
  onReorderDealCard,
  onRemoveDealCard,
  onReorderDealCardPiece,
  onChangeDealCard,
}: EmailFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const frameElRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(600)
  const [slotRects, setSlotRects] = useState<SlotRect[]>([])
  const [blockRects, setBlockRects] = useState<MarkedBlockRect[]>([])
  const [bannerItemRects, setBannerItemRects] = useState<MarkedBlockRect[]>([])
  const [dealCardRects, setDealCardRects] = useState<MarkedBlockRect[]>([])
  const [dealCardPieceRects, setDealCardPieceRects] = useState<MarkedBlockRect[]>([])
  const [dragOver, setDragOver] = useState(false)

  const syncFrame = useCallback(() => {
    const root = iframeRef.current?.contentDocument
    if (!root?.body) return
    applyClientScheme(root, clientScheme)
    setHeight(Math.max(root.body.scrollHeight, 200))
    setSlotRects(measureSlots(root))
    setBlockRects(measureContentBlocks(root))
    setBannerItemRects(measureBannerItems(root))
    setDealCardRects(measureDealCards(root))
    setDealCardPieceRects(measureDealCardPieces(root))
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

  // Índice de destino para piezas de banner: usa la variante "en orden de
  // lectura" (Y, salvo que el cursor caiga en la misma banda vertical de un
  // item, en cuyo caso decide por X) porque el banner horizontal apila 2
  // columnas lado a lado (moléculas + imagen) que comparten banda Y — un
  // resolveDropIndex puramente vertical sería ambiguo ahí. Para una pila a
  // todo el ancho (banner vertical) el resultado es equivalente.
  const resolveIndexForBannerDrop = (e: React.DragEvent): number => {
    const order = bannerItems.map((it) => it.id)
    const rectsById = new Map(bannerItemRects.map((r) => [r.id, r]))
    if (!frameElRef.current) return order.length
    const dropX = dropXInFrameSpace(e, frameElRef.current)
    const dropY = dropYInFrameSpace(e, frameElRef.current)
    return resolveDropIndexReadingOrder(order, rectsById, dropX, dropY)
  }

  // Índice de destino para una tarjeta de deal. Igual que las piezas de banner
  // usa el orden de lectura (los deals van de 2 en 2 por fila, así que 2
  // tarjetas comparten banda Y y la X es la que decide), pero ACOTADO a las
  // tarjetas del bloque dueño: podría haber más de un bloque DEALS en un
  // documento viejo de localStorage, y reordenar entre bloques distintos no
  // tiene sentido (cada bloque es su propia lista).
  const resolveIndexForDealCardDrop = (e: React.DragEvent, cardId: string): number => {
    const found = findDealsBlockByCard(contenidos, cardId)
    if (!found || !frameElRef.current) return 0
    const order = found.block.fields.items.map((card) => card.id)
    const own = new Set(order)
    const rectsById = new Map(dealCardRects.filter((r) => own.has(r.id)).map((r) => [r.id, r]))
    const dropX = dropXInFrameSpace(e, frameElRef.current)
    const dropY = dropYInFrameSpace(e, frameElRef.current)
    return resolveDropIndexReadingOrder(order, rectsById, dropX, dropY)
  }

  // Índice de destino para una pieza dentro de una tarjeta. A diferencia de
  // piezas de banner o pares de deal, las 7 piezas se apilan en una sola
  // columna angosta (la celda de textos, ~230px) sin ambigüedad de X, así que
  // alcanza la variante vertical (no "reading order"). Acotado a las propias
  // 7 piezas de la tarjeta DUEÑA de la pieza arrastrada (no la que esté bajo
  // el cursor) — no hay forma de mover una pieza a otra tarjeta por error.
  const resolveIndexForDealCardPieceDrop = (e: React.DragEvent, cardId: string): number => {
    const found = findDealsBlockByCard(contenidos, cardId)
    const card = found?.block.fields.items.find((c) => c.id === cardId)
    if (!card || !frameElRef.current) return 0
    const order = card.fields.pieceOrder
    const rectsById = new Map(dealCardPieceRects.filter((r) => r.type === cardId).map((r) => [r.id, r]))
    const dropY = dropYInFrameSpace(e, frameElRef.current)
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
          const reorderTypes = [
            CONTENT_BLOCK_REORDER_DRAG_TYPE,
            BANNER_ITEM_REORDER_DRAG_TYPE,
            DEAL_CARD_REORDER_DRAG_TYPE,
            DEAL_CARD_PIECE_REORDER_DRAG_TYPE,
          ]
          const allTypes = [
            SLOT_DRAG_TYPE,
            CONTENT_BLOCK_DRAG_TYPE,
            BANNER_TYPE_DRAG_TYPE,
            BANNER_ITEM_DRAG_TYPE,
            ...reorderTypes,
          ]
          if (allTypes.some((t) => types.includes(t))) {
            e.preventDefault()
            e.dataTransfer.dropEffect = reorderTypes.some((t) => types.includes(t)) ? 'move' : 'copy'
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

          const bannerType = e.dataTransfer.getData(BANNER_TYPE_DRAG_TYPE)
          if (bannerType) {
            e.preventDefault()
            onSetBannerType(bannerType as BannerType)
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
            return
          }

          const newBannerItemType = e.dataTransfer.getData(BANNER_ITEM_DRAG_TYPE)
          if (newBannerItemType) {
            e.preventDefault()
            onInsertBannerItem(newBannerItemType as BannerItemType, resolveIndexForBannerDrop(e))
            return
          }

          const reorderBannerItemId = e.dataTransfer.getData(BANNER_ITEM_REORDER_DRAG_TYPE)
          if (reorderBannerItemId) {
            e.preventDefault()
            onReorderBannerItem(reorderBannerItemId, resolveIndexForBannerDrop(e))
            return
          }

          const reorderDealCardId = e.dataTransfer.getData(DEAL_CARD_REORDER_DRAG_TYPE)
          if (reorderDealCardId) {
            e.preventDefault()
            onReorderDealCard(reorderDealCardId, resolveIndexForDealCardDrop(e, reorderDealCardId))
            return
          }

          const reorderPieceRaw = e.dataTransfer.getData(DEAL_CARD_PIECE_REORDER_DRAG_TYPE)
          if (reorderPieceRaw) {
            e.preventDefault()
            const sep = reorderPieceRaw.indexOf(':')
            const cardId = reorderPieceRaw.slice(0, sep)
            const pieceType = reorderPieceRaw.slice(sep + 1) as DealCardPieceType
            onReorderDealCardPiece(cardId, pieceType, resolveIndexForDealCardPieceDrop(e, cardId))
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
            {/* Duplicar una fila de DEALS es una forma más de agregar otra
                (junto con arrastrar "Deals" de nuevo desde la librería) — sin
                tope, ver components/deals/schema.ts. contentBlockRegistry.ts's
                cloneFields le asigna ids nuevos a las tarjetas copiadas, así
                que la fila duplicada nunca comparte id con la original. */}
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
        {/* Piezas de banner — se pintan DESPUÉS de slotRects para quedar
            arriba del overlay del propio slot BANNER, que geométricamente las
            contiene (si vivieran antes, el overlay del slot taparía el click). */}
        {bannerItemRects.map(({ id, type, top, left, width, height: h }) => (
          <div
            key={id}
            className={`slot-hit block-hit${isBannerItemSelected(selected, id) ? ' selected' : ''}`}
            style={{ top, left, width, height: h }}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(BANNER_ITEM_REORDER_DRAG_TYPE, id)
              e.dataTransfer.effectAllowed = 'move'
            }}
          >
            <button
              type="button"
              className="slot-select"
              aria-label={`Seleccionar ${getBannerItemDef(type)?.label ?? type}`}
              aria-pressed={isBannerItemSelected(selected, id)}
              onClick={() => onSelect(selectBannerItem(id))}
            >
              <span className="slot-badge">{getBannerItemDef(type)?.label ?? type}</span>
            </button>
            <button
              type="button"
              className="slot-duplicate"
              aria-label="Duplicar"
              onClick={(e) => {
                e.stopPropagation()
                onDuplicateBannerItem(id)
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
                onRemoveBannerItem(id)
              }}
            >
              ×
            </button>
          </div>
        ))}
        {/* Tarjetas de deal — DESPUÉS de blockRects por el mismo motivo que las
            piezas de banner van después de slotRects: el overlay del bloque
            DEALS las contiene geométricamente y taparía sus clicks. */}
        {dealCardRects.map(({ id, top, left, width, height: h }) => (
          <div
            key={id}
            className={`slot-hit block-hit${isDealCardSelected(selected, id) ? ' selected' : ''}`}
            style={{ top, left, width, height: h }}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(DEAL_CARD_REORDER_DRAG_TYPE, id)
              e.dataTransfer.effectAllowed = 'move'
            }}
          >
            <button
              type="button"
              className="slot-select"
              aria-label="Seleccionar deal"
              aria-pressed={isDealCardSelected(selected, id)}
              onClick={() => onSelect(selectDealCard(id))}
            >
              <span className="slot-badge">Deal</span>
            </button>
            <button
              type="button"
              className="slot-duplicate"
              aria-label="Duplicar deal"
              onClick={(e) => {
                e.stopPropagation()
                onDuplicateDealCard(id)
              }}
            >
              ⧉
            </button>
            <button
              type="button"
              className="slot-delete"
              aria-label="Eliminar deal"
              onClick={(e) => {
                e.stopPropagation()
                onRemoveDealCard(id)
              }}
            >
              ×
            </button>
          </div>
        ))}
        {/* Piezas de tarjeta de deal — DESPUÉS de dealCardRects para quedar
            arriba del overlay de la tarjeta DENTRO de la celda de textos.
            Solo cubren esa celda: la de IMAGEN y la de LEGALES quedan afuera
            de estos rects, así que ahí la tarjeta sigue totalmente
            seleccionable/arrastrable/duplicable/eliminable como siempre — no
            hace falta una capa de "controles" redibujada como la de
            BANNER/DEALS más abajo. Cada pieza SÍ es seleccionable por
            separado (pedido explícito del usuario: ver solo las opciones de
            esa línea, no las de toda la tarjeta) — mismo tratamiento visual
            que bannerItemRects (badge + borde de selección), con un botón de
            eliminar propio (oculta la pieza) pero SIN duplicar: cada una de
            las 7 es un slot fijo del maestro, no una lista libre. */}
        {dealCardPieceRects.map(({ id: pieceTypeRaw, type: cardId, top, left, width, height: h }) => {
          const pieceType = pieceTypeRaw as DealCardPieceType
          return (
            <div
              key={`${cardId}-${pieceType}`}
              className={`slot-hit piece-hit${isDealCardPieceSelected(selected, cardId, pieceType) ? ' selected' : ''}`}
              style={{ top, left, width, height: h }}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(DEAL_CARD_PIECE_REORDER_DRAG_TYPE, `${cardId}:${pieceType}`)
                e.dataTransfer.effectAllowed = 'move'
              }}
            >
              <button
                type="button"
                className="slot-select"
                aria-label={`Seleccionar ${DEAL_CARD_PIECE_LABELS[pieceType]}`}
                aria-pressed={isDealCardPieceSelected(selected, cardId, pieceType)}
                onClick={() => onSelect(selectDealCardPiece(cardId, pieceType))}
              >
                <span className="slot-badge">{DEAL_CARD_PIECE_LABELS[pieceType]}</span>
              </button>
              <button
                type="button"
                className="slot-delete"
                aria-label={`Eliminar ${DEAL_CARD_PIECE_LABELS[pieceType]}`}
                onClick={(e) => {
                  e.stopPropagation()
                  const found = findDealsBlockByCard(contenidos, cardId)
                  const card = found?.block.fields.items.find((c) => c.id === cardId)
                  if (card) onChangeDealCard(cardId, hideDealCardPiece(card.fields, pieceType))
                }}
              >
                ×
              </button>
            </div>
          )
        })}
        {/* Y el badge del bloque DEALS redibujado al final, por la misma razón
            que el del BANNER más abajo: sus tarjetas lo cubren por completo (la
            primera arranca justo en la esquina del bloque), así que sin esta
            copia encima de todo no habría forma de seleccionar el bloque para
            llegar al botón "+ Agregar deal". */}
        {blockRects
          .filter((r) => r.type === 'DEALS')
          .map(({ id, top, left, width, height: h }) => (
            <div
              key={`${id}-controls`}
              className={`slot-hit-controls${isBlockSelected(selected, id) ? ' selected' : ''}`}
              style={{ top, left, width, height: h }}
            >
              <button
                type="button"
                className="slot-badge slot-badge-button"
                aria-label="Seleccionar Deals"
                aria-pressed={isBlockSelected(selected, id)}
                onClick={() => onSelect(selectBlock(id))}
              >
                Deals
              </button>
            </div>
          ))}
        {/* BANNER es el único slot que puede tener piezas propias
            (bannerItemRects) exactamente encima de su badge de selección —
            sin esta copia redibujada AL FINAL (encima de todo), ese badge
            quedaría inalcanzable en cuanto el banner tuviera una pieza
            cubriéndolo (el caso por defecto: banner vertical con 1 tag ocupa
            casi todo el rect del slot). El contenedor tiene
            pointer-events:none para dejar pasar los clicks del medio a las
            piezas de abajo; solo este botón, ya angosto, se reactiva
            explícitamente (ver .slot-hit-controls en App.css). No tiene botón
            de eliminar: el banner (uno de los 2 tipos) siempre debe estar
            presente en el email, no es removable. */}
        {slotRects
          .filter((r) => r.slot === 'BANNER')
          .map(({ slot, top, left, width, height: h }) => (
            <div
              key={`${slot}-controls`}
              className={`slot-hit-controls${isSlotSelected(selected, slot) ? ' selected' : ''}`}
              style={{ top, left, width, height: h }}
            >
              <button
                type="button"
                className="slot-badge slot-badge-button"
                aria-label={`Seleccionar ${SLOT_LABELS[slot]}`}
                aria-pressed={isSlotSelected(selected, slot)}
                onClick={() => onSelect(selectSlot(slot))}
              >
                {SLOT_LABELS[slot]}
              </button>
            </div>
          ))}
      </div>
    </div>
  )
}
