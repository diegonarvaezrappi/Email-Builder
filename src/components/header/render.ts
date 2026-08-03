import wrapperRaw from '../../assets/templates/headers/_header-wrapper.html?raw'
import { themeVars } from '../../themes/themes'
import { escapeHtmlAttr } from '../../template/htmlText'
import type { HeaderFields } from './schema'

/**
 * Los 40 archivos de header (10 marcas × centrado/columnas × claro/oscuro),
 * sincronizados por scripts/sync-master.mjs. Se cargan por glob en vez de 40
 * imports sueltos o transcribirlos a mano — cada uno queda disponible tal
 * cual el repo lo define (byte a byte), igual que footer.html?raw.
 */
const rawHeaderFiles = import.meta.glob('../../assets/templates/headers/*/*.html', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const HEADER_WRAPPER_MARKER = '<!-- ACA VA EL HEADER -->'

/**
 * Comentario que en los 40 archivos precede SIEMPRE, inmediatamente, al <td>
 * completo del cobranding (separador -si el layout es centrado- + las 3
 * variantes de tamaño). Verificado: aparece exactamente 1 vez, idéntico,
 * en los 40 archivos — ver el plan de este componente.
 */
const COBRANDING_ANCHOR = '<!-- Si la opción "cobranding" se encuentra activa, se activa el td completo-->'

const HTML_COMMENT_RE = /<!--[\s\S]*?-->/g
const BG_HEADER_VAR_RE = /\{\{\s*bg_header_mail_general\s*\}\}/g
const COBRANDING_IMG_RE = /<img class="cobranding-[sml]"[^>]*>/g

/** La URL placeholder que traen los 40 archivos (idéntica en los 3 tamaños de
 *  cada uno — verificado). Debe coincidir con el default de cobrandingImageUrl
 *  en schema.ts, que es lo que este placeholder termina reemplazando. */
const COBRANDING_IMG_SRC_PLACEHOLDER = 'https://lh3.googleusercontent.com/d/1jrRUyQvYuQ8gsVP1Sk0jvM3BdFO0ZaJA'

function headerTrRaw(fields: HeaderFields): string {
  const suffix = `/headers/${fields.brand}/${fields.layout}-${fields.logoBackground}.html`
  const path = Object.keys(rawHeaderFiles).find((p) => p.endsWith(suffix))
  if (!path) {
    throw new Error(`No se encontró el header ${fields.brand}/${fields.layout}-${fields.logoBackground}.html`)
  }
  return rawHeaderFiles[path]
}

/**
 * Sin cobranding: se descarta el comentario ancla + el <td> completo (así se
 * va también el separador, cuando el layout centrado lo trae). Con
 * cobranding: se conserva el <td> pero se deja solo la <img> del tamaño
 * elegido, quitando las otras 2, y se le pone la URL que haya elegido el
 * usuario (por defecto, la misma imagen placeholder del maestro). No hace
 * falta lógica especial por marca ni por layout — la presencia/ausencia del
 * separador ya viene resuelta por cuál de los 40 archivos se cargó.
 */
function applyCobranding(trHtml: string, fields: HeaderFields): string {
  const anchorIndex = trHtml.indexOf(COBRANDING_ANCHOR)
  if (anchorIndex === -1) return trHtml

  const cellStart = trHtml.indexOf('<td', anchorIndex)
  const cellEnd = trHtml.indexOf('</td>', cellStart) + '</td>'.length

  if (!fields.cobranding) {
    return trHtml.slice(0, anchorIndex) + trHtml.slice(cellEnd)
  }

  const keepClass = `cobranding-${fields.cobrandingSize}`
  let cell = trHtml
    .slice(cellStart, cellEnd)
    .replace(COBRANDING_IMG_RE, (imgTag) => (imgTag.includes(`class="${keepClass}"`) ? imgTag : ''))

  if (!cell.includes(COBRANDING_IMG_SRC_PLACEHOLDER)) {
    throw new Error(
      `headers/${fields.brand}/${fields.layout}-${fields.logoBackground}.html: el <td> de cobranding ya no trae "${COBRANDING_IMG_SRC_PLACEHOLDER}" — revisar components/header/render.ts`,
    )
  }
  cell = cell.replace(COBRANDING_IMG_SRC_PLACEHOLDER, () => escapeHtmlAttr(fields.cobrandingImageUrl))

  return trHtml.slice(0, anchorIndex) + cell + trHtml.slice(cellEnd)
}

/**
 * Resuelve {{bg_header_mail_general}} al literal del tema activo. Hace falta
 * porque template/assemble.ts corre inlineTheme() sobre TODO el maestro antes
 * de insertar este snippet en el marcador — un {{ }} que quedara acá nunca se
 * resolvería después (mismo razonamiento que font_style_look en
 * components/footer/render.ts). Solo 4 de las 10 marcas usan esta variable
 * (ver .bg-headermobile en 01-foundations/global-styles/global-styles.html);
 * en el resto el replace no encuentra nada y no hace nada.
 */
function resolveHeaderThemeVars(trHtml: string, tema: string): string {
  const value = themeVars(tema).bg_header_mail_general ?? ''
  return trHtml.replace(BG_HEADER_VAR_RE, value)
}

/**
 * Genera el snippet que reemplaza el placeholder "HEADER WRAPPER" del
 * template maestro: el wrapper compartido (_header-wrapper.html) con el <tr>
 * de la marca/variante elegida insertado en su marcador.
 *
 * Los comentarios pedagógicos de los archivos fuente (firma del header,
 * instrucciones de cobranding) no pasan al output — mismo criterio que
 * renderFooterSnippet.
 */
export function renderHeaderSnippet(fields: HeaderFields, tema: string): string {
  let tr = headerTrRaw(fields)
  tr = applyCobranding(tr, fields)
  tr = resolveHeaderThemeVars(tr, tema)
  tr = tr.replace(HTML_COMMENT_RE, '')
  return wrapperRaw.replace(HEADER_WRAPPER_MARKER, tr)
}
