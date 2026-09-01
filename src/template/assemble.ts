import templateBaseRaw from '../assets/templates/template_base.html?raw'
import { SLOT_ORDER, type EmailDocument } from '../model'
import { registry } from '../registry'
import { inlineTheme } from '../themes/inlineTheme'
import { resolveGlobalVars } from '../global/vars'
import { stripBannerFieldAssigns } from '../components/banner/render'
import { stripDealsFieldAssigns } from '../components/deals/render'

/**
 * El maestro no trae un `<!-- HEADER -->` de una sola línea como los demás
 * slots: HEADER vive como el comentario multilínea "HEADER WRAPPER … CIERRE
 * HEADER WRAPPER" (ver 06-examples/test_claude_1_original.html). Regex no
 * codiciosa, mismo estilo que THEME_IF_RE en themes/inlineTheme.ts. Debe
 * quedar sincronizado con HEADER_WRAPPER_PLACEHOLDER_RE de
 * scripts/sync-master.mjs, que valida esta misma forma antes de sincronizar.
 */
const HEADER_WRAPPER_PLACEHOLDER_RE = /<!--\s*HEADER WRAPPER[\s\S]*?CIERRE HEADER WRAPPER\s*-->/

/**
 * CONTENIDOS tampoco trae un marcador de una sola línea: vive como el
 * comentario multilínea "WRAPPER DE CONTENIDOS: ..." que enumera los 9 tipos
 * de bloque posibles. No-codiciosa, mismo estilo que HEADER_WRAPPER_PLACEHOLDER_RE.
 * Debe quedar sincronizado con CONTENIDOS_WRAPPER_PLACEHOLDER_RE de
 * scripts/sync-master.mjs.
 */
const WRAPPER_DE_CONTENIDOS_PLACEHOLDER_RE = /<!--\s*WRAPPER DE CONTENIDOS[\s\S]*?-->/

/**
 * BANNER sí es un marcador de una sola línea, pero con texto libre tras
 * "BANNER :" que el repo reescribe seguido ("por defecto el template debe
 * tener un banner vertical, con tags" al momento de escribir esto) — se
 * matchea el PREFIJO, no la frase completa. El maestro tiene otras 2
 * apariciones de la palabra BANNER ("EJEMPLO DE DEFINICION DE CAMPOS PARA
 * BANNER", "INICIO SECCION BANNER") que este regex excluye porque ninguna va
 * pegada a `<!--` seguida de `:` (verificado). Debe quedar sincronizado con
 * BANNER_PLACEHOLDER_RE de scripts/sync-master.mjs.
 */
const BANNER_PLACEHOLDER_RE = /<!--\s*BANNER\s*:[\s\S]*?-->/

/**
 * El maestro (estructura_general.html) usa el plural "CIERRES" para el
 * marcador del slot Cierre — inconsistencia real del repo, no un typo de acá.
 * Debe quedar sincronizado con SLOT_MARKERS de scripts/sync-master.mjs, que
 * valida esta misma forma antes de sincronizar.
 *
 * Cierre ya NO se planta ahí: desde el pedido explícito del usuario
 * (2026-08-31) de unificar Título/Bullet/CTA/Deals/Beneficios y Cierre en una
 * sola tabla, su HTML se inserta dentro del snippet de CONTENIDOS (ver
 * components/contenidos/render.ts, _contenidos_wrapper.html) — este marcador
 * se deja vacío a propósito, ver el branch `slot === 'CIERRE'` más abajo.
 */
const CIERRE_MARKER = '<!-- CIERRES -->'

/**
 * Ensambla el HTML final de un email: toma template_base.html (sincronizado
 * por scripts/sync-master.mjs), deja el tema ya resuelto y reemplaza, por
 * string literal, cada marcador de slot que tenga una entrada en el registry.
 * Los marcadores sin componente implementado quedan intactos.
 *
 * Reemplazo literal (no DOMParser) a propósito: preserva el Liquid+HTML del
 * template maestro byte a byte — ver decisión de arquitectura en el plan.
 *
 * Los `replace` de contenido variable usan SIEMPRE la forma función
 * (`() => rendered`), nunca un string de reemplazo directo: `String.replace`
 * con un string interpreta
 * `$&`/`$$`/`` $` ``/`$'` como patrones especiales, y `rendered` puede traer
 * texto libre de usuario con un `$` real (ej. el default de Banner/PROMO es
 * literalmente '$14.000', o un usuario podría escribir "$&" en un campo de
 * texto libre como el de Footer) — mismo motivo ya documentado en
 * inlineAllContentBlockOccurrences (preview/liquidPreview.ts).
 */
export function assembleEmailHtml(doc: EmailDocument): string {
  // El tema no se deja como Liquid: sus variables salen con el valor puesto y
  // las 11 ramas condicionales se borran, así el HTML para Braze va limpio.
  // stripBannerFieldAssigns limpia además los 5 `{% assign banner_copy_*/
  // banner_img_* %}` de ejemplo que el maestro trae vivos (no comentados)
  // antes del doctype — ver la nota en components/banner/render.ts.
  // stripDealsFieldAssigns hace lo mismo con los 4 `{% assign deals_copy_* %}`
  // (+ su comentario "LÍMITE DE 2 LÍNEAS") que el maestro trae en el mismo
  // lugar — ver la nota en components/deals/render.ts. Los 2 corren siempre,
  // haya o no piezas de banner / bloques DEALS en el documento: el Liquid de
  // ejemplo viene del maestro, no de lo que armó el usuario.
  let html = stripDealsFieldAssigns(stripBannerFieldAssigns(inlineTheme(templateBaseRaw, resolveGlobalVars(doc.global))))

  for (const slot of SLOT_ORDER) {
    const def = registry[slot]
    if (!def) continue

    if (slot === 'CIERRE') {
      // Su HTML ya se insertó como parte del snippet de CONTENIDOS (misma
      // tabla, ver components/contenidos/render.ts) — nunca se vuelve a
      // invocar renderCierreSnippet acá, el marcador queda vacío a propósito.
      if (!html.includes(CIERRE_MARKER)) {
        throw new Error(`No se encontró el marcador ${CIERRE_MARKER} en template_base.html`)
      }
      html = html.replace(CIERRE_MARKER, () => '')
      continue
    }

    const fields = doc[def.docKey]
    const rendered = def.render(fields, doc)

    if (slot === 'HEADER') {
      if (!HEADER_WRAPPER_PLACEHOLDER_RE.test(html)) {
        throw new Error('No se encontró el placeholder "HEADER WRAPPER" en template_base.html')
      }
      html = html.replace(HEADER_WRAPPER_PLACEHOLDER_RE, () => rendered)
      continue
    }

    if (slot === 'CONTENIDOS') {
      if (!WRAPPER_DE_CONTENIDOS_PLACEHOLDER_RE.test(html)) {
        throw new Error('No se encontró el placeholder "WRAPPER DE CONTENIDOS" en template_base.html')
      }
      html = html.replace(WRAPPER_DE_CONTENIDOS_PLACEHOLDER_RE, () => rendered)
      continue
    }

    if (slot === 'BANNER') {
      if (!BANNER_PLACEHOLDER_RE.test(html)) {
        throw new Error('No se encontró el placeholder "<!-- BANNER : …" en template_base.html')
      }
      html = html.replace(BANNER_PLACEHOLDER_RE, () => rendered)
      continue
    }

    // Único slot que llega hasta acá hoy: FOOTER (HEADER/CONTENIDOS/BANNER/
    // CIERRE ya se resolvieron arriba, cada uno con su propio branch).
    const marker = `<!-- ${slot} -->`
    if (!html.includes(marker)) {
      throw new Error(`No se encontró el marcador ${marker} en template_base.html`)
    }
    html = html.replace(marker, () => rendered)
  }

  return html
}
