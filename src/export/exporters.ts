// ============================================================================
// Exportaciones. Nada sale del navegador: todo se genera en cliente.
// Opera siempre sobre el string ya ensamblado por template/assemble.ts — sin
// DOMParser ni serialización, para no tocar el Liquid+HTML del template.
// ============================================================================
import { assembleEmailHtml } from '../template/assemble'
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
