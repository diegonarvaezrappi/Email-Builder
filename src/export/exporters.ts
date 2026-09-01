// ============================================================================
// Exportaciones. Nada sale del navegador: todo se genera en cliente.
// HTML/JSON operan sobre el documento (o su HTML ya ensamblado por
// template/assemble.ts) sin DOMParser, para no tocar el Liquid+HTML del
// template. PNG es la excepción: necesita el HTML YA RESUELTO (sin Liquid
// vivo), así que usa el mismo camino que la pestaña Preview
// (preview/liquidPreview.ts), no assembleEmailHtml.
// ============================================================================
import html2canvas from 'html2canvas'
import { assembleEmailHtml } from '../template/assemble'
import { renderEmailPreview } from '../preview/liquidPreview'
import type { EmailDocument } from '../model'

export function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'email'
  )
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** `navigator.clipboard` solo existe en secure context (https, o localhost) —
 *  el staging sirve http:// sobre una IP pública (no localhost), así que ahí
 *  es `undefined` y "Copiar HTML" explotaba con un TypeError (capturado por
 *  el try/catch de handleCopy en ui/Viewport.tsx, de ahí el "Error al copiar"
 *  en vez de un crash). Fallback: el `execCommand('copy')` legacy vía un
 *  <textarea> oculto sí funciona en contextos inseguros — deprecado pero
 *  soportado en todos los navegadores actuales, es el fallback estándar para
 *  exactamente este caso. */
async function copyText(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text)
    return
  }
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  try {
    const ok = document.execCommand('copy')
    if (!ok) throw new Error('execCommand copy failed')
  } finally {
    textarea.remove()
  }
}

/** Copia el HTML ensamblado al portapapeles. Devuelve su peso en KB (para un toast). */
export async function copyHtmlToClipboard(doc: EmailDocument): Promise<number> {
  const html = assembleEmailHtml(doc)
  await copyText(html)
  return Math.round((new Blob([html]).size / 1024) * 10) / 10
}

export function downloadHtml(doc: EmailDocument, filename = 'email'): void {
  const html = assembleEmailHtml(doc)
  triggerDownload(new Blob([html], { type: 'text/html;charset=utf-8' }), `${slug(filename)}.html`)
}

/**
 * Descarga el documento COMPLETO como JSON — "convertir el email en una
 * plantilla" (pedido explícito del usuario). Es el mismo shape que ya usa
 * store/persistence.ts para guardar en localStorage (`emailDocumentSchema`,
 * ver model.ts): cualquier documento que localStorage ya sabe cargar hoy es,
 * por construcción, un JSON válido de este export — así que si en el futuro
 * se agrega un "Importar plantilla", reusar `emailDocumentSchema.safeParse`
 * alcanza sin inventar un shape nuevo.
 */
export function downloadJson(doc: EmailDocument, filename = 'email'): void {
  const json = JSON.stringify(doc, null, 2)
  triggerDownload(new Blob([json], { type: 'application/json;charset=utf-8' }), `${slug(filename)}.json`)
}

/**
 * País de ejemplo para resolver el Liquid de Braze (`{{...}}` de
 * personalización) al generar el PNG — mismo default con el que arranca el
 * selector "País (solo preview)" de ui/Viewport.tsx. El PNG no depende de qué
 * país/dispositivo/esquema tenga tocado el usuario en ese selector (igual que
 * Copiar HTML/Descargar .html tampoco dependen de la vista activa): es una
 * exportación del documento, no una foto de la vista actual.
 */
const PNG_PREVIEW_COUNTRY = 'CO'
/** Ancho real del contenido del mail (ver Viewport.tsx) — el PNG se genera a
 *  este ancho fijo de escritorio, no al ancho angosto de "Móvil" (esa vista
 *  es un ajuste del editor, no algo que timeString/assemble.ts conozca). */
const PNG_WIDTH = 600

/**
 * html2canvas no soporta `writing-mode` (no está en su lista de props
 * CSS soportadas) — lo único que lo usa en todo el proyecto es la celda
 * vertical "Ahora"/"Desde" de PROMO (ver molecula_promo_*.html /
 * components/banner/render.ts), que sale distorsionada en el PNG aunque en el
 * iframe de Preview se vea bien (ahí sí la interpreta el motor CSS real del
 * navegador — solo al rasterizar con html2canvas se rompe). Se neutraliza en
 * el DOM justo antes de capturar: el contenido se mueve a un <div> interno
 * con ancho/alto intercambiados y un `transform: rotate(...)` (que html2canvas
 * sí soporta) que reproduce visualmente el mismo writing-mode, para texto
 * latino de una sola línea. Selector genérico (no acoplado a PROMO) para no
 * perderse si el día de mañana otra pieza reusa esto.
 *
 * El ÁNGULO depende del valor exacto de `writing-mode` — no son
 * intercambiables: `vertical-rl` rota el texto 90° en sentido HORARIO,
 * `sideways-lr` lo rota 90° ANTIHORARIO (dirección de lectura opuesta), y el
 * maestro cambió de uno a otro sin avisar (pull 2026-09-01, "orientación del
 * texto del tag de promo", `cda7b3f`) — confirmado visualmente vía CDP
 * (comparación lado a lado de sideways-lr real contra cada rotación posible)
 * después de que ese pull dejara el PNG exportado con el texto invertido
 * respecto al preview en vivo. Se falla ruidoso ante cualquier otro valor en
 * vez de asumir una rotación que podría estar al revés otra vez.
 */
const WRITING_MODE_ROTATION_DEG: Record<string, number> = {
  'vertical-rl': 90,
  'sideways-lr': -90,
}

export function neutralizeVerticalWritingModeForCapture(frameDoc: Document): void {
  frameDoc.querySelectorAll<HTMLElement>('[style*="writing-mode"]').forEach((el) => {
    const writingMode = el.style.writingMode
    const rotationDeg = WRITING_MODE_ROTATION_DEG[writingMode]
    if (rotationDeg === undefined) {
      throw new Error(
        `neutralizeVerticalWritingModeForCapture: writing-mode "${writingMode}" no está mapeado en WRITING_MODE_ROTATION_DEG — revisar qué dirección de rotación le corresponde antes de exportar el PNG (una elegida al azar puede salir invertida)`,
      )
    }

    const { height, fontSize, lineHeight, color } = el.style
    const innerHtml = el.innerHTML

    el.style.setProperty('writing-mode', '')
    el.style.setProperty('-webkit-writing-mode', '')
    el.style.setProperty('-ms-writing-mode', '')
    el.style.position = 'relative'
    el.innerHTML = ''

    const rotated = frameDoc.createElement('div')
    rotated.innerHTML = innerHtml
    rotated.style.position = 'absolute'
    rotated.style.top = '50%'
    rotated.style.left = '50%'
    rotated.style.width = height || 'auto'
    rotated.style.whiteSpace = 'nowrap'
    rotated.style.textAlign = 'center'
    if (fontSize) rotated.style.fontSize = fontSize
    if (lineHeight) rotated.style.lineHeight = lineHeight
    if (color) rotated.style.color = color
    rotated.style.transform = `translate(-50%, -50%) rotate(${rotationDeg}deg)`
    rotated.style.transformOrigin = 'center center'
    el.appendChild(rotated)
  })
}

/**
 * Proxy público de imágenes (wsrv.nl / images.weserv.nl) — fallback para
 * cuando la carga DIRECTA de una imagen falla (host sin CORS habilitado). Re-
 * sirve cualquier imagen pública con `Access-Control-Allow-Origin: *`, así que
 * cubre efectivamente "cualquier URL de imagen" de un host público, al costo
 * de que ESA url (no el resto del documento) sale hacia un servicio de
 * terceros — pero solo en el caso fallback, la mayoría de los hosts reales de
 * este proyecto responden CORS directo (ver `fetchImageAsDataUrl`).
 * Decisión pedida/aprobada explícitamente por el usuario 2026-08-24 en vez de
 * dejar esas imágenes en blanco.
 */
const IMAGE_CORS_PROXY_PREFIX = 'https://images.weserv.nl/?url='

/**
 * Intenta convertir una URL de imagen en una `data:` URL (nunca "tainted" al
 * dibujarla en el <canvas> de html2canvas, sin importar el host). 2 intentos:
 * 1. Fetch directo con CORS — funciona para cualquier host que sí manda
 *    `Access-Control-Allow-Origin` a un request con Origin real (que es la
 *    mayoría: `lh3.googleusercontent.com`, `braze-images.com`, y también
 *    `images.rappi.com` — confirmado con CDP en 2026-08-24, aunque un `curl -I`
 *    sin Origin no lo muestre).
 * 2. Si falla (host sin CORS), reintenta vía `IMAGE_CORS_PROXY_PREFIX`.
 * Si AMBOS fallan (URL caída, 404, host inalcanzable incluso para el proxy),
 * devuelve `null` — el llamador deja la imagen como estaba (mismo
 * comportamiento best-effort que tenía antes de este fix: esa imagen puntual
 * sale en blanco, pero no rompe el resto del PNG).
 */
async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  const tryFetch = async (fetchUrl: string): Promise<string> => {
    const res = await fetch(fetchUrl, { mode: 'cors', credentials: 'omit' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
  }
  try {
    return await tryFetch(url)
  } catch {
    try {
      return await tryFetch(IMAGE_CORS_PROXY_PREFIX + encodeURIComponent(url))
    } catch {
      return null
    }
  }
}

/** Inlinea el `src` de un <img> como `data:` URL — ver `fetchImageAsDataUrl`. */
async function inlineImageForCapture(img: HTMLImageElement): Promise<void> {
  const src = img.getAttribute('src') || ''
  if (!src || src.startsWith('data:')) return
  const dataUrl = await fetchImageAsDataUrl(src)
  if (!dataUrl) return
  await new Promise<void>((resolve) => {
    img.addEventListener('load', () => resolve(), { once: true })
    img.addEventListener('error', () => resolve(), { once: true })
    img.src = dataUrl
  })
}

/** Mismo tratamiento que `inlineImageForCapture` pero para `background-image:
 *  url(...)` inline (el producto de DEALS, ver components/deals/render.ts —
 *  css `url()`, no un atributo `<img>`, así que necesita su propio camino). */
const CSS_URL_RE = /url\((['"]?)(.*?)\1\)/g

async function inlineBackgroundImageForCapture(el: HTMLElement): Promise<void> {
  const original = el.style.backgroundImage
  if (!original) return
  const matches = [...original.matchAll(CSS_URL_RE)]
  let replaced = original
  for (const match of matches) {
    const url = match[2]
    if (!url || url.startsWith('data:')) continue
    const dataUrl = await fetchImageAsDataUrl(url)
    if (dataUrl) replaced = replaced.replace(match[0], `url("${dataUrl}")`)
  }
  el.style.backgroundImage = replaced
}

/**
 * Deja el <iframe> de captura listo para html2canvas: cada <img> y cada
 * `background-image` con una URL real quedan reemplazados por su versión
 * `data:` (ver arriba) — así html2canvas nunca necesita `useCORS`/`allowTaint`
 * para nada, porque ya no queda ninguna imagen cross-origin en el DOM al
 * momento de rasterizar. Corre en paralelo (`Promise.all`, no en serie) —
 * cubre "cualquier tipo de URL de imagen" tanto como el navegador lo permite
 * (una URL genuinamente inalcanzable, incluso para el proxy, se deja en blanco
 * pero no aborta el resto del PNG).
 */
async function inlineAllImagesForCapture(frameDoc: Document): Promise<void> {
  await Promise.all([
    ...Array.from(frameDoc.images).map((img) => inlineImageForCapture(img)),
    ...Array.from(frameDoc.querySelectorAll<HTMLElement>('[style*="background-image"]')).map((el) =>
      inlineBackgroundImageForCapture(el),
    ),
  ])
}

/**
 * Genera un PNG con el mail completo (header a footer) y lo descarga.
 *
 * html2canvas rasteriza un <iframe> oculto (fuera de pantalla, no
 * `display:none` — algunos navegadores no pintan ese contenido) con el MISMO
 * HTML ya resuelto que ve el usuario en la pestaña Preview
 * (renderEmailPreview), no el HTML crudo de assembleEmailHtml (que todavía
 * trae Liquid vivo — {{color_x_mail_general}}, {% if %} de tema, etc. — y se
 * vería roto en una captura).
 */
export async function downloadPng(doc: EmailDocument, filename = 'email'): Promise<void> {
  const { html, error } = await renderEmailPreview(doc, PNG_PREVIEW_COUNTRY)
  if (error) throw new Error(error)

  const iframe = document.createElement('iframe')
  iframe.setAttribute('sandbox', 'allow-same-origin')
  iframe.style.position = 'fixed'
  iframe.style.top = '0'
  iframe.style.left = '-10000px'
  iframe.style.width = `${PNG_WIDTH}px`
  iframe.style.border = 'none'
  document.body.appendChild(iframe)

  try {
    await new Promise<void>((resolve, reject) => {
      iframe.addEventListener('load', () => resolve(), { once: true })
      iframe.addEventListener('error', () => reject(new Error('No se pudo renderizar el email para generar el PNG')), {
        once: true,
      })
      iframe.srcdoc = html
    })

    const frameDoc = iframe.contentDocument
    if (!frameDoc?.body) throw new Error('No se pudo acceder al documento del email para generar el PNG')

    neutralizeVerticalWritingModeForCapture(frameDoc)

    // Reemplaza cada imagen (<img> y background-image) por su versión data:
    // URL — ver inlineAllImagesForCapture. Esto YA espera a que cada una
    // termine de cargar (éxito o error), así que no hace falta un segundo
    // paso separado esperando "load"/"error" como antes de este fix.
    await inlineAllImagesForCapture(frameDoc)

    iframe.style.height = `${frameDoc.body.scrollHeight}px`

    const canvas = await html2canvas(frameDoc.body, {
      useCORS: true,
      backgroundColor: '#ffffff',
      width: PNG_WIDTH,
      windowWidth: PNG_WIDTH,
      height: frameDoc.body.scrollHeight,
    })

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo generar el PNG'))), 'image/png')
    })
    triggerDownload(blob, `${slug(filename)}.png`)
  } finally {
    iframe.remove()
  }
}
