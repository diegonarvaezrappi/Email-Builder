import templateBaseRaw from '../assets/templates/template_base.html?raw'
import { SLOT_ORDER, type EmailDocument } from '../model'
import { registry } from '../registry'
import { inlineTheme } from '../themes/inlineTheme'
import { cssUrlValue, resolveGlobalVars } from '../global/vars'
import type { BackgroundPosition, BackgroundRepeat, BackgroundSize } from '../global/background'
import { stripBannerFieldAssigns } from '../components/banner/render'
import { stripDealsFieldAssigns } from '../components/deals/render'
import { elementBounds, indexOfOrThrow, voidElementBounds } from './htmlEdits'
import { escapeHtmlAttr, insertBackgroundImageAltAtStart } from './htmlText'
import { HERO_LINK_PLACEHOLDER, linkOrPlaceholder, numberLinkPlaceholders } from './linkPlaceholders'
import { slotKey } from '../tropicalize/keys'
import { renderTropicalized } from '../tropicalize/render'

/**
 * El refactor HERO/CONTENTS/FOOTER del repo raíz (iniciado 2026-09-12,
 * cerrado 2026-09-15 — ver CLAUDE.md del repo raíz §1.1 y §9) reescribió
 * estructura_general.html entero: header/banner/imagen-full-width viven ahora
 * dentro de UNA sola sección `role="HERO-SECTION"` (envuelta en un único
 * `<a>`), y CONTENIDOS pasó a ser su propia `role="CONTENTS-SECTION"`. Las 4
 * constantes de abajo reemplazan los viejos marcadores multilínea
 * "HEADER WRAPPER…CIERRE HEADER WRAPPER" / "BANNER :…" / `<!-- CIERRES -->`:
 * ya no son regexes que delimitan un bloque entero a reemplazar, son anclas
 * (texto plano) que ubican un comentario corto YA DENTRO de un contenedor que
 * el propio maestro conserva siempre — ver replaceCommentPlaceholder más abajo.
 */
const HEADER_PLACEHOLDER_ANCHOR = 'AQUÍ VA EL HEADER'

/** Análogo a HEADER_PLACEHOLDER_ANCHOR — hasta 2026-09-15 este era un
 *  `<!-- BANNER : texto libre -->` de una sola línea (con contenido que el
 *  repo reescribía seguido); ahora es un comentario multilínea fijo. */
const BANNER_PLACEHOLDER_ANCHOR = 'AQUÍ VA EL BANNER'

/**
 * CONTENIDOS es distinto a HEADER/BANNER: su comentario ("2.1 · WRAPPER DE
 * CONTENIDOS") antecede a una tabla de 480px que el maestro también conserva
 * embebida (idéntica a `_contenidos_wrapper.html`, ver
 * components/contenidos/render.ts) — hay que reemplazar el comentario Y esa
 * tabla entera por `renderContenidosSnippet(...)`, que ya reconstruye esa
 * misma tabla con los bloques adentro. replaceContenidosWrapper hace el
 * swallow de la tabla con elementBounds (anidamiento seguro), no con un
 * regex — un regex no-codicioso no puede saber dónde termina la tabla sin
 * contar profundidad.
 */
const WRAPPER_DE_CONTENIDOS_ANCHOR = 'WRAPPER DE CONTENIDOS'

/**
 * El hueco del footer tampoco es un `<!-- FOOTER -->` de una sola línea desde
 * el refactor: estructura_general.html muestra directamente el Liquid de
 * ejemplo que se reemplaza entero (los 6 `{% assign %}` + la referencia al
 * content block General) — mismo criterio que el resto del refactor. Deben
 * quedar sincronizadas con FOOTER_EXAMPLE_START/END de scripts/sync-master.mjs.
 */
const FOOTER_EXAMPLE_START = "{% assign cond = '' %}"
const FOOTER_EXAMPLE_END = '{{content_blocks.${FOOTER_q1_2024_legales}}}'

// Token de relleno manual (no es Liquid) que carga `doc.banner.link` — hasta
// el refactor HERO (2026-09-12) vivía DENTRO de cada archivo de banner
// (`components/banner/render.ts`); ahora el link envuelve TODO el HERO
// (header + banner + imagen full width) a nivel de estructura_general.html,
// así que se resuelve acá, no en el render del banner. 2 ocurrencias siempre
// (href + originalsrc). Sin link del usuario se deja el token tal cual, en vez
// de un href="" — ver template/linkPlaceholders.ts.

/**
 * Reemplaza el comentario `<!-- ... anchor ... -->` que contiene `anchor`
 * literal por `rendered` — forma función del replace SIEMPRE (nunca un
 * string), porque `rendered` puede traer un `$` real de usuario (ver el
 * comentario grande de assembleEmailHtml más abajo).
 */
function replaceCommentPlaceholder(html: string, anchor: string, rendered: string, fileName: string): string {
  const anchorIdx = indexOfOrThrow(html, anchor, fileName)
  const commentStart = html.lastIndexOf('<!--', anchorIdx)
  if (commentStart === -1) {
    throw new Error(`${fileName}: no se encontró la apertura "<!--" del comentario que contiene "${anchor}"`)
  }
  const commentEnd = html.indexOf('-->', anchorIdx)
  if (commentEnd === -1) {
    throw new Error(`${fileName}: no se encontró el cierre "-->" del comentario que contiene "${anchor}"`)
  }
  return html.slice(0, commentStart) + rendered + html.slice(commentEnd + 3)
}

/** Ver el comentario grande de WRAPPER_DE_CONTENIDOS_ANCHOR: swallowea el
 *  comentario Y la tabla de 480px que lo sigue, entera. */
function replaceContenidosWrapper(html: string, rendered: string): string {
  const fileName = 'template_base.html'
  const anchorIdx = indexOfOrThrow(html, WRAPPER_DE_CONTENIDOS_ANCHOR, fileName)
  const commentStart = html.lastIndexOf('<!--', anchorIdx)
  if (commentStart === -1) {
    throw new Error(`${fileName}: no se encontró la apertura "<!--" del comentario "${WRAPPER_DE_CONTENIDOS_ANCHOR}"`)
  }
  const tableStart = html.indexOf('<table', anchorIdx)
  if (tableStart === -1) {
    throw new Error(`${fileName}: no se encontró "<table" después del comentario "${WRAPPER_DE_CONTENIDOS_ANCHOR}"`)
  }
  const tableBounds = elementBounds(html, tableStart + 1, 'table', fileName)
  return html.slice(0, commentStart) + rendered + html.slice(tableBounds.end)
}

/** Ver el comentario grande de FOOTER_EXAMPLE_START/END: swallowea todo el
 *  bloque de ejemplo (asigna + referencia al content block), no solo un
 *  comentario. */
function replaceFooterExample(html: string, rendered: string): string {
  const fileName = 'template_base.html'
  const startIdx = indexOfOrThrow(html, FOOTER_EXAMPLE_START, fileName)
  const endIdx = html.indexOf(FOOTER_EXAMPLE_END, startIdx)
  if (endIdx === -1) {
    throw new Error(`${fileName}: no se encontró "${FOOTER_EXAMPLE_END}" después de "${FOOTER_EXAMPLE_START}"`)
  }
  return html.slice(0, startIdx) + rendered + html.slice(endIdx + FOOTER_EXAMPLE_END.length)
}

/**
 * `<td class="fondomobile" ... style="background-image: url({{bg_imgevento_mail_general}}); ...">`
 * — el `<td>` de la imagen de fondo global (global.fondoUrl). Un
 * `background-image` no tiene un atributo `alt` nativo, así que su texto
 * alternativo (global.fondoAlt) se agrega acá como `role="img"
 * aria-label="..."`, solo cuando hay imagen (vacío = sin fondo = sin
 * aria-label tampoco). Pedido explícito del usuario 2026-09-09: "para todas
 * las imagenes que son agregadas como fondo, tambien agregales un campo ALT".
 */
const FONDOMOBILE_ANCHOR = 'class="fondomobile"'

/**
 * Anclas de los otros 2 fondos del mail (pedido explícito del usuario,
 * 2026-09-16) — el comentario literal que el maestro trae justo ANTES del
 * `<td>` con el `background-image` de cada sección (ver CLAUDE.md del repo
 * raíz §1.1). A diferencia de FONDOMOBILE_ANCHOR (un atributo DENTRO del
 * `<td>`), estas 2 anclas viven en el comentario que lo antecede, así que
 * hace falta `html.indexOf('<td', anchorIdx)` para llegar al `<td` real —
 * ver applySectionBackground.
 */
const HERO_BG_ANCHOR = 'el background-image es reemplazable'
const CONTENTS_BG_ANCHOR = 'mismo fondo que el HERO'

/**
 * Reemplaza `background-size`/`background-position` (los 2 SIEMPRE presentes
 * en el maestro) y agrega o reemplaza `background-repeat` dentro de un
 * `<td ...>` ya recortado a su apertura — General lo trae los 3 en su style;
 * HERO/CONTENTS solo traen size/position (ningún `<td>` del maestro declara
 * `background-repeat` ahí, así que se inserta a continuación de
 * background-position). Nunca toca `background-image`: cada llamador decide
 * aparte si reemplaza la URL.
 */
function withBackgroundDecl(openTag: string, size: BackgroundSize, position: BackgroundPosition, repeat: BackgroundRepeat): string {
  let out = openTag.replace(/background-size:\s*[^;"]+;?/, `background-size: ${size};`)
  out = out.replace(/background-position:\s*[^;"]+;?/, `background-position: ${position};`)
  return /background-repeat:\s*[^;"]+;?/.test(out)
    ? out.replace(/background-repeat:\s*[^;"]+;?/, `background-repeat: ${repeat};`)
    : out.replace(/(background-position:\s*[^;"]+;)/, `$1 background-repeat: ${repeat};`)
}

interface SectionBackground {
  url: string
  alt: string
  size: BackgroundSize
  position: BackgroundPosition
  repeat: BackgroundRepeat
}

/**
 * HERO-SECTION/CONTENTS-SECTION: a diferencia de General (fondoUrl, una
 * variable Liquid que ya resuelve inlineTheme), acá la imagen es un literal
 * hardcodeado en el maestro (ver global/background.ts#DEFAULT_HERO_CONTENTS_BG_URL)
 * — esta función reemplaza también el `url(...)`, no solo tamaño/posición/repeat.
 * El alt (role="img" aria-label) se agrega solo cuando hay imagen, mismo
 * criterio que el resto de los campos de fondo de la app.
 */
function applySectionBackground(html: string, commentAnchor: string, bg: SectionBackground, fileName: string): string {
  const anchorIdx = indexOfOrThrow(html, commentAnchor, fileName)
  const tdIdx = html.indexOf('<td', anchorIdx)
  if (tdIdx === -1) {
    throw new Error(`${fileName}: no se encontró "<td" después de "${commentAnchor}"`)
  }
  const bounds = voidElementBounds(html, tdIdx, 'td', fileName)
  let openTag = html.slice(bounds.start, bounds.end).replace(/url\([^)]*\)/, `url(${cssUrlValue(bg.url)})`)
  openTag = withBackgroundDecl(openTag, bg.size, bg.position, bg.repeat)
  if (bg.url.trim() !== '') {
    openTag = insertBackgroundImageAltAtStart(openTag, bg.alt, fileName)
  }
  return html.slice(0, bounds.start) + openTag + html.slice(bounds.end)
}

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

  {
    const fondoIndex = indexOfOrThrow(html, FONDOMOBILE_ANCHOR, 'template_base.html')
    const fondoBounds = voidElementBounds(html, fondoIndex, 'td', 'template_base.html')
    let fondoOpenTag = withBackgroundDecl(
      html.slice(fondoBounds.start, fondoBounds.end),
      doc.global.fondoSize,
      doc.global.fondoPosition,
      doc.global.fondoRepeat,
    )
    if (doc.global.fondoUrl.trim() !== '') {
      fondoOpenTag = insertBackgroundImageAltAtStart(fondoOpenTag, doc.global.fondoAlt, 'template_base.html')
    }
    html = html.slice(0, fondoBounds.start) + fondoOpenTag + html.slice(fondoBounds.end)
  }

  html = applySectionBackground(
    html,
    HERO_BG_ANCHOR,
    {
      url: doc.global.heroBgUrl,
      alt: doc.global.heroBgAlt,
      size: doc.global.heroBgSize,
      position: doc.global.heroBgPosition,
      repeat: doc.global.heroBgRepeat,
    },
    'template_base.html',
  )

  html = applySectionBackground(
    html,
    CONTENTS_BG_ANCHOR,
    {
      url: doc.global.contentsBgUrl,
      alt: doc.global.contentsBgAlt,
      size: doc.global.contentsBgSize,
      position: doc.global.contentsBgPosition,
      repeat: doc.global.contentsBgRepeat,
    },
    'template_base.html',
  )

  // El link del HERO (ver HERO_LINK_PLACEHOLDER) — SIEMPRE 2 ocurrencias,
  // haya o no piezas de banner: el <a> lo trae el propio maestro, no algo que
  // el documento decida agregar.
  const heroLinkCount = html.split(HERO_LINK_PLACEHOLDER).length - 1
  if (heroLinkCount !== 2) {
    throw new Error(`Se encontraron ${heroLinkCount} ocurrencias de ${HERO_LINK_PLACEHOLDER} en template_base.html (se esperaban 2: href + originalsrc)`)
  }
  html = html.replaceAll(HERO_LINK_PLACEHOLDER, () =>
    escapeHtmlAttr(linkOrPlaceholder(doc.banner.link, HERO_LINK_PLACEHOLDER)),
  )

  for (const slot of SLOT_ORDER) {
    const def = registry[slot]
    if (!def) continue

    const fields = doc[def.docKey]
    // CONTENIDOS no es un elemento tropicalizable en sí — es el array de
    // bloques; cada bloque tiene su propia clave (`block:<id>`, ver
    // components/contenidos/render.ts). Los otros 3 son singletons, cada uno
    // con su propia clave `slot:<SLOT>` (tropicalize/keys.ts).
    const rendered =
      slot === 'CONTENIDOS'
        ? def.render(fields, doc)
        : renderTropicalized(doc, slotKey(slot as 'HEADER' | 'BANNER' | 'FOOTER'), fields, (f) => def.render(f, doc))

    if (slot === 'HEADER') {
      html = replaceCommentPlaceholder(html, HEADER_PLACEHOLDER_ANCHOR, rendered, 'template_base.html')
      continue
    }

    if (slot === 'CONTENIDOS') {
      html = replaceContenidosWrapper(html, rendered)
      continue
    }

    if (slot === 'BANNER') {
      html = replaceCommentPlaceholder(html, BANNER_PLACEHOLDER_ANCHOR, rendered, 'template_base.html')
      continue
    }

    // Único slot que llega hasta acá hoy: FOOTER (HEADER/CONTENIDOS/BANNER
    // ya se resolvieron arriba, cada uno con su propio branch).
    html = replaceFooterExample(html, rendered)
  }

  // Última pasada, con el documento ya completo: numerar los marcadores de
  // link que quedaron sin link real (AQUIELLINKDELCTA1, LINKDEAL2, …). Va acá
  // y no en cada render porque el número sale del ORDEN en el mail entero, que
  // una pieza suelta no conoce — ver template/linkPlaceholders.ts.
  return numberLinkPlaceholders(html)
}
