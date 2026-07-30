import cierreRaw from '../../assets/templates/cierre.html?raw'
import { CIERRE_VARIANT_INFO } from './schema'
import type { CierreFields } from './schema'
import type { EmailDocument } from '../../model'

/** Ver 05-docs/USO-DE-CADA-PARTE.md §9, regla #1: "la regla más importante del sistema". */
const PRO_THEME_SLUGS = ['pro', 'problack']

/**
 * URL placeholder que trae 02-components/05_closing/cierre.html en el repo —
 * se reemplaza por la URL de la variante elegida. Si el repo la cambia, esto
 * debe fallar ruidosamente en vez de emitir silenciosamente la imagen vieja
 * (mismo criterio que HEADER_WRAPPER_PLACEHOLDER_RE en template/assemble.ts).
 */
const PLACEHOLDER_IMAGE_URL = 'https://lh3.googleusercontent.com/d/1Szsf0kwqfJhdeu9hA944XWUGc85DFLZ5'

const HTML_COMMENT_RE = /<!--[\s\S]*?-->/g

/**
 * Genera el snippet que reemplaza el marcador <!-- CIERRES --> del template
 * maestro, o '' si el cierre no debe mostrarse.
 *
 * Se omite (string vacío) en 3 casos, evaluados en este orden y sin importar
 * la variante elegida:
 * 1. `fields.removed` — el usuario lo borró a mano desde el Viewport.
 * 2. El tema general es Pro o ProBlack (regla #1 de USO-DE-CADA-PARTE.md §9).
 * 3. El Footer es de tipo RTS (acoplamiento citado en registry.ts, sección
 *    B.5 de Referencias/instrucciones.md — mismo criterio que ya usa
 *    resolveFontStyleLook en components/footer/render.ts).
 *
 * Preserva cierre.html byte a byte salvo por la URL de imagen y los
 * comentarios pedagógicos (mismo criterio que renderFooterSnippet/
 * renderHeaderSnippet: los comentarios de autor no pasan al output).
 */
export function renderCierreSnippet(fields: CierreFields, doc: EmailDocument): string {
  if (fields.removed) return ''
  if (PRO_THEME_SLUGS.includes(doc.global.tema)) return ''
  if (doc.footer.tipoFooter === 'RTS') return ''

  if (!cierreRaw.includes(PLACEHOLDER_IMAGE_URL)) {
    throw new Error('cierre.html ya no contiene la URL placeholder esperada — revisar PLACEHOLDER_IMAGE_URL en cierre/render.ts')
  }

  const { url } = CIERRE_VARIANT_INFO[fields.variant]
  return cierreRaw.replace(PLACEHOLDER_IMAGE_URL, url).replace(HTML_COMMENT_RE, '')
}
