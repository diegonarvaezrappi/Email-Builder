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

/** Copia el HTML ensamblado al portapapeles. Devuelve su peso en KB (para un toast). */
export async function copyHtmlToClipboard(doc: EmailDocument): Promise<number> {
  const html = assembleEmailHtml(doc)
  await navigator.clipboard.writeText(html)
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
 * Genera un PNG con el mail completo (header a footer) y lo descarga.
 *
 * html2canvas rasteriza un <iframe> oculto (fuera de pantalla, no
 * `display:none` — algunos navegadores no pintan ese contenido) con el MISMO
 * HTML ya resuelto que ve el usuario en la pestaña Preview
 * (renderEmailPreview), no el HTML crudo de assembleEmailHtml (que todavía
 * trae Liquid vivo — {{color_x_mail_general}}, {% if %} de tema, etc. — y se
 * vería roto en una captura).
 *
 * LIMITACIÓN CONOCIDA (no es un bug de acá, es una limitación real de
 * "captura de pantalla" sin backend): html2canvas solo puede leer el contenido
 * de una <img> para dibujarla si el servidor que la sirve responde con
 * `Access-Control-Allow-Origin` — los assets de `lh3.googleusercontent.com`
 * (la mayoría de los defaults de la app: logos, íconos, tags) sí lo tienen,
 * pero `images.rappi.com` (la imagen de producto de deals) NO — esa imagen en
 * particular sale en blanco en el PNG. No hay forma de evitarlo sin un
 * servidor propio haciendo de proxy, que este proyecto no tiene.
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

    // Las imágenes pueden seguir cargando después del evento "load" del
    // iframe (que solo espera el HTML) — esperar a cada una (éxito o error)
    // antes de rasterizar, o saldrían en blanco por una carrera de tiempos.
    await Promise.all(
      Array.from(frameDoc.images).map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((res) => {
              img.addEventListener('load', () => res(), { once: true })
              img.addEventListener('error', () => res(), { once: true })
            }),
      ),
    )

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
