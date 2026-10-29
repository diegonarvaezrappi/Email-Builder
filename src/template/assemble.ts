import templateBaseRaw from '../assets/templates/template_base.html?raw'
import { SLOT_ORDER, type EmailDocument } from '../model'
import { registry } from '../registry'
import { inlineTheme } from '../themes/inlineTheme'
import { cssUrlValue, resolveGlobalVars } from '../global/vars'
import type { BackgroundPosition, BackgroundRepeat, BackgroundSize } from '../global/background'
import { stripBannerFieldAssigns } from '../components/banner/render'
import { TEXTOXL_CUSTOM_CLASS_RE } from '../components/banner/items/sizing'
import { stripDealsFieldAssigns } from '../components/deals/render'
import { applyEdits, elementBounds, indexOfOrThrow, voidElementBounds } from './htmlEdits'
import { escapeHtmlAttr, insertBackgroundImageAltAtStart } from './htmlText'
import { HERO_LINK_PLACEHOLDER, linkOrPlaceholder, numberLinkPlaceholders } from './linkPlaceholders'
import { heroPieceKey, slotKey } from '../tropicalize/keys'
import { renderTropicalized } from '../tropicalize/render'
import { allHeroPieces, heroBanners, type HeroSection } from '../components/hero/schema'
import { wrapWithHeroMarkers, wrapWithHeroSectionMarkers } from './contentBlocks'

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
 * el propio maestro conserva siempre — ver renderHero más abajo.
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

// Token de relleno manual (no es Liquid) que carga el `link` de cada banner — hasta
// el refactor HERO (2026-09-12) vivía DENTRO de cada archivo de banner
// (`components/banner/render.ts`); ahora el link envuelve TODO el HERO
// (header + banner + imagen full width) a nivel de estructura_general.html,
// así que se resuelve acá, no en el render del banner. 2 ocurrencias siempre
// (href + originalsrc). Sin link del usuario se deja el token tal cual, en vez
// de un href="" — ver template/linkPlaceholders.ts. Con varios banners, cada
// uno lleva su propio <a> (ver renderHero).

/**
 * El Texto XL con tamaño personalizado (components/banner/items/schemas.ts)
 * lleva una clase `bnr-txl-m<tamaño>-<line-height>` con sus valores de MÓVIL
 * en el nombre. Acá se agrega su regla en las 2 media queries del maestro,
 * justo antes de la de `.bnr-xl` y con el mismo selector por banner — mismo
 * mecanismo que el maestro usa para su propio tamaño de móvil. Se lee del HTML
 * ya armado (no del documento) para cubrir también las ramas tropicalizadas.
 * Sin ninguna, el HTML queda intacto.
 */
const BNR_XL_MOBILE_RULE = '#BANNER_HORIZONTAL .bnr-xl, #BANNER_VERTICAL .bnr-xl {'

function injectTextoXlMobileRules(html: string): string {
  const pairs = new Map<string, [string, string]>()
  for (const m of html.matchAll(TEXTOXL_CUSTOM_CLASS_RE)) pairs.set(m[0], [m[1], m[2]])
  if (pairs.size === 0) return html
  const rules = [...pairs]
    .map(
      ([cls, [size, line]]) =>
        `#BANNER_HORIZONTAL .${cls}, #BANNER_VERTICAL .${cls} {\n    font-size: ${size}px!important;\n    line-height: ${line}px!important;\n}\n`,
    )
    .join('')
  if (!html.includes(BNR_XL_MOBILE_RULE)) {
    throw new Error(`template_base.html: ya no contiene "${BNR_XL_MOBILE_RULE}" — revisar injectTextoXlMobileRules`)
  }
  return html.split(BNR_XL_MOBILE_RULE).join(rules + BNR_XL_MOBILE_RULE)
}

/** Límites del comentario `<!-- ... -->` que contiene `anchor`. */
function commentBounds(html: string, anchor: string, fileName: string): { start: number; end: number } {
  const anchorIdx = indexOfOrThrow(html, anchor, fileName)
  const start = html.lastIndexOf('<!--', anchorIdx)
  const end = html.indexOf('-->', anchorIdx)
  if (start === -1 || end === -1) {
    throw new Error(`${fileName}: no se encontró el comentario completo que contiene "${anchor}"`)
  }
  return { start, end: end + 3 }
}

/**
 * El HERO como lista libre de headers y banners (components/hero/schema.ts).
 * El maestro trae UN contenedor de header (una `<table>` que se conserva
 * siempre, con el comentario "AQUÍ VA EL HEADER" adentro) y UN comentario
 * "AQUÍ VA EL BANNER" debajo. Con varias piezas en cualquier orden ya no
 * alcanza con reemplazar cada comentario por su slot: cada header lleva su
 * PROPIA copia de ese contenedor (el `<tr>` del header solo es válido dentro
 * de una tabla) y la lista entera se escribe donde estaba el contenedor; el
 * comentario del banner se quita.
 *
 * Links — decisión del usuario (2026-10-28), "un link por banner":
 *  - 0 o 1 banner: igual que el maestro. El `<a>` que envuelve todo el HERO
 *    lleva el link de ese banner (o el marcador si no tiene).
 *  - 2 o más: ese `<a>` exterior se quita y cada banner va dentro de su
 *    propia copia de la misma etiqueta, con su link. Los headers quedan sin
 *    link: dos `<a>` anidados no son válidos. Sin link del usuario, el
 *    marcador se numera (AQUIELLINKDELBANNER1, 2…) para que la implementación
 *    distinga cuál es cuál.
 */
function renderHero(html: string, doc: EmailDocument): string {
  const fileName = 'template_base.html'
  const linkCount = html.split(HERO_LINK_PLACEHOLDER).length - 1
  if (linkCount !== 2) {
    throw new Error(`Se encontraron ${linkCount} ocurrencias de ${HERO_LINK_PLACEHOLDER} en ${fileName} (se esperaban 2: href + originalsrc)`)
  }

  // El bloque entero del HERO del maestro: su <a> (que envuelve el
  // display:contents y la tabla role="HERO-SECTION"). Cada Hero del documento
  // es una copia de este bloque (2026-10-29, "los heros también deben poder
  // duplicarse"), con su propio fondo.
  const linkIdx = html.indexOf(HERO_LINK_PLACEHOLDER)
  const anchorStart = html.lastIndexOf('<a ', linkIdx)
  if (anchorStart === -1) throw new Error(`${fileName}: no se encontró el <a> que envuelve el HERO`)
  const anchorBounds = elementBounds(html, anchorStart + 1, 'a', fileName)
  const block = html.slice(anchorStart, anchorBounds.end)

  // Los marcadores de link sin link se numeran en todo el mail en cuanto hay
  // más de un banner, en uno o en varios Heros.
  const numbered = allHeroPieces(doc.heroes).filter((p) => p.type === 'BANNER').length > 1
  let bannerNumber = 0
  const nextPlaceholder = () => (numbered ? `${HERO_LINK_PLACEHOLDER}${++bannerNumber}` : HERO_LINK_PLACEHOLDER)

  const sections = doc.heroes.map((section) => {
    const bg = section.background
    const withBg = applySectionBackground(
      block,
      HERO_BG_ANCHOR,
      { url: bg.heroBgUrl, alt: bg.heroBgAlt, size: bg.heroBgSize, position: bg.heroBgPosition, repeat: bg.heroBgRepeat },
      fileName,
    )
    return wrapWithHeroSectionMarkers(section.id, renderHeroSection(withBg, section, doc, nextPlaceholder))
  })
  return html.slice(0, anchorStart) + sections.join('\n') + html.slice(anchorBounds.end)
}

/** UN Hero, sobre su copia del bloque del maestro (`block` empieza en su `<a>`). */
function renderHeroSection(block: string, section: HeroSection, doc: EmailDocument, nextPlaceholder: () => string): string {
  const fileName = 'template_base.html'
  const html = block
  const linkIdx = html.indexOf(HERO_LINK_PLACEHOLDER)
  const anchorStart = 0
  const anchorOpenEnd = html.indexOf('>', linkIdx) + 1
  const anchorOpen = html.slice(anchorStart, anchorOpenEnd)
  const anchorBounds = { start: 0, end: html.length }

  const headerComment = commentBounds(html, HEADER_PLACEHOLDER_ANCHOR, fileName)
  const containerStart = html.lastIndexOf('<table', headerComment.start)
  if (containerStart === -1) throw new Error(`${fileName}: no se encontró la tabla contenedora del header`)
  const container = elementBounds(html, containerStart + 1, 'table', fileName)
  const containerBefore = html.slice(container.start, headerComment.start)
  const containerAfter = html.slice(headerComment.end, container.end)
  const bannerComment = commentBounds(html, BANNER_PLACEHOLDER_ANCHOR, fileName)

  const banners = heroBanners(section.pieces)
  const linkPerBanner = banners.length > 1
  const placeholders = new Map(banners.map((b) => [b.id, nextPlaceholder()]))
  const withLink = (link: string, inner: string) =>
    `${anchorOpen.replaceAll(HERO_LINK_PLACEHOLDER, () => escapeHtmlAttr(link))}\n${inner}\n</a>`

  const headerDef = registry.HEADER
  const bannerDef = registry.BANNER
  if (!headerDef || !bannerDef) throw new Error('registry: faltan HEADER/BANNER')

  const pieces = section.pieces.map((piece) => {
    if (piece.type === 'HEADER') {
      const tr = renderTropicalized(doc, heroPieceKey('HEADER', piece.id), piece.fields, (f) => headerDef.render(f, doc))
      return wrapWithHeroMarkers('HEADER', piece.id, containerBefore + tr + containerAfter)
    }
    const placeholder = placeholders.get(piece.id) ?? HERO_LINK_PLACEHOLDER
    // Con un link por banner, el <a> va DENTRO de cada rama tropicalizada: así
    // una rama que cambia el link lo lleva, y una rama oculta no deja un <a> vacío.
    const render = (f: typeof piece.fields) => {
      const banner = bannerDef.render(f, doc)
      return linkPerBanner ? withLink(linkOrPlaceholder(f.link, placeholder), banner) : banner
    }
    return wrapWithHeroMarkers('BANNER', piece.id, renderTropicalized(doc, heroPieceKey('BANNER', piece.id), piece.fields, render))
  })

  const edits = [
    { start: container.start, end: container.end, replacement: pieces.join('\n') },
    { start: bannerComment.start, end: bannerComment.end, replacement: '' },
  ]
  if (linkPerBanner) {
    edits.push({ start: anchorStart, end: anchorOpenEnd, replacement: '' })
    edits.push({ start: anchorBounds.end - '</a>'.length, end: anchorBounds.end, replacement: '' })
  } else {
    const link = linkOrPlaceholder(banners[0]?.fields.link ?? '', (banners[0] && placeholders.get(banners[0].id)) ?? HERO_LINK_PLACEHOLDER)
    edits.push({
      start: anchorStart,
      end: anchorOpenEnd,
      replacement: anchorOpen.replaceAll(HERO_LINK_PLACEHOLDER, () => escapeHtmlAttr(link)),
    })
  }
  return applyEdits(html, edits, fileName)
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
  /** Color sólido (`#RRGGBB`) debajo de la imagen; vacío = ninguno. */
  color?: string
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
  if (bg.color) {
    // En CSS y también como `bgcolor`: un hex sólido sí vale en el atributo
    // (CLAUDE.md §4.1), y es lo que respeta Outlook de escritorio.
    openTag = openTag.replace('style="', `bgcolor="${bg.color}" style="background-color: ${bg.color}; `)
    // Sin imagen, `background-image: url();` es CSS inválido: los inliners y
    // sanitizadores (el de Braze, Gmail) descartan el style entero al
    // encontrarlo, y con él el background-color. Con color se quita.
    if (bg.url.trim() === '') openTag = openTag.replace(/\s*background-image:\s*url\(\s*\);?/, '')
  }
  html = html.slice(0, bounds.start) + openTag + html.slice(bounds.end)
  if (bg.color) html = withSectionTableColor(html, tdIdx, bg.color, fileName)
  return html
}

/** El color también en la `<table role="…-SECTION">` que contiene la celda (su
 *  `bgcolor=""` viene vacío): si un cliente limpia el style de la celda, la
 *  tabla sigue pintando el fondo. */
function withSectionTableColor(html: string, cellIdx: number, color: string, fileName: string): string {
  const tableIdx = html.lastIndexOf('<table role="', cellIdx)
  if (tableIdx === -1) throw new Error(`${fileName}: no se encontró la <table role> de la sección — revisar applySectionBackground`)
  const bounds = voidElementBounds(html, tableIdx, 'table', fileName)
  const openTag = html
    .slice(bounds.start, bounds.end)
    .replace(/bgcolor="[^"]*"/, `bgcolor="${color}"`)
    .replace('style="', `style="background-color: ${color}; `)
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

  // El fondo de cada Hero se aplica en renderHero, sobre su propia copia.

  html = applySectionBackground(
    html,
    CONTENTS_BG_ANCHOR,
    {
      url: doc.global.contentsBgUrl,
      alt: doc.global.contentsBgAlt,
      size: doc.global.contentsBgSize,
      position: doc.global.contentsBgPosition,
      repeat: doc.global.contentsBgRepeat,
      color: doc.global.contentsBgColor,
    },
    'template_base.html',
  )

  // HEADER y BANNER: la lista del Hero entera, con su regla de links — ver
  // renderHero.
  html = renderHero(html, doc)

  for (const slot of SLOT_ORDER) {
    const def = registry[slot]
    if (!def?.docKey) continue

    if (slot === 'CONTENIDOS') {
      // CONTENIDOS no es un elemento tropicalizable en sí — es el array de
      // bloques; cada bloque tiene su propia clave (`block:<id>`, ver
      // components/contenidos/render.ts).
      html = replaceContenidosWrapper(html, def.render(doc.contenidos, doc))
      continue
    }

    // Único slot que llega hasta acá: FOOTER, el último singleton (clave
    // `slot:FOOTER`, tropicalize/keys.ts).
    const rendered = renderTropicalized(doc, slotKey('FOOTER'), doc.footer, (f) => def.render(f, doc))
    html = replaceFooterExample(html, rendered)
  }

  // Última pasada, con el documento ya completo: numerar los marcadores de
  // link que quedaron sin link real (AQUIELLINKDELCTA1, LINKDEAL2, …). Va acá
  // y no en cada render porque el número sale del ORDEN en el mail entero, que
  // una pieza suelta no conoce — ver template/linkPlaceholders.ts.
  html = injectTextoXlMobileRules(html)

  return numberLinkPlaceholders(html)
}
