// ============================================================================
// Genera el HTML de un bloque DEALS de CONTENIDOS a partir del archivo real
// (02-components/04_content-modules/deals/deal_columnas.html, sincronizado).
//
// El archivo del maestro es UN PAR: una `<table role="module">` con 3 filas
// (imágenes / textos / legales) y 2 celdas por fila. Acá se carga una copia por
// cada par de tarjetas de `fields.items` y se rellenan sus 2 celdas; si la
// última tarjeta queda sin compañera, la celda 2 se vacía pero NO se borra
// ("se eliminan los elementos no la celda", comentario del maestro).
//
// La particularidad de deals frente al banner: el maestro NO marca las piezas
// opcionales con `{% if %}`. Solo las describe en comentarios dirigidos a un
// humano ("si no existe texto para esta linea se elimina toda la etiqueta"). Así
// que cada pieza se ubica por un literal único y se corta o se rellena — misma
// técnica que applyAhoraCell/applyDeReintegroCell en
// components/banner/items/render.ts, acá generalizada porque son ~11 piezas por
// celda en vez de 1. Todas las anclas se cuentan en scripts/sync-master.mjs
// (DEALS_ANCHOR_COUNTS) antes de sincronizar, para que un cambio del maestro
// aborte el sync en vez de hacer que el render corte el elemento equivocado.
//
// Las 7 piezas de la celda de textos (línea 1, línea 2, precio, rating,
// tag1, tag2, cta) se pueden reordenar arrastrando en el lienzo (pedido
// explícito del usuario, igual que las piezas de banner) — así que
// renderTextCell ya no aplica todos sus edits en un solo pase sobre la celda
// completa: mide los límites de cada pieza en la celda PRÍSTINA, calcula los
// edits de cada una contra su propio fragmento recortado, y recién ahí las
// reensambla en el orden de `fields.pieceOrder` (ver pieceBounds/pieceEdits
// más abajo). Con el orden natural (el default), la salida es byte a byte
// igual a la de antes de este cambio — se logra reusando el whitespace
// original entre piezas como separador al reensamblar, no uno fijo.
//
// Los `{{xxx_mail_general}}` de tema que queden (img_overlay_1, color_texto,
// padd_deal, bg_solid, body_container_background_radius-peq, color_descuento,
// bg_descuento, coronapro_mail_body, bg_tag_fondo, color_acento2,
// color_textos_legales) se resuelven todos de una sola pasada al final de
// renderDealsSnippet — igual que components/banner/render.ts, y por el mismo
// motivo: template/assemble.ts ya corrió inlineTheme() sobre el maestro ANTES
// de insertar este snippet, así que lo que quede acá no se resolvería nunca.
// ============================================================================
import dealColumnasRaw from '../../assets/templates/deals/deal_columnas.html?raw'
import type { EmailDocument } from '../../model'
import { cssUrlValue, resolveGlobalVars } from '../../global/vars'
import { escapeHtmlAttr, escapeHtmlText } from '../../template/htmlText'
import { wrapWithDealCardMarkers, wrapWithDealCardPieceMarkers } from '../../template/contentBlocks'
import * as htmlEdits from '../../template/htmlEdits'
import type { Bounds, Edit } from '../../template/htmlEdits'
import { resolveThemeVars } from '../../themes/inlineTheme'
import { LIQUID_COLOR_TOKENS, renderRichText } from '../../richText/render'
import {
  DEAL_CARD_PIECE_TYPES,
  DEALS_CARDS_PER_PAIR,
  normalizePieceOrder,
  type DealCard,
  type DealCardFields,
  type DealCardPieceType,
  type DealsFields,
} from './schema'

const FILE_NAME = 'deal_columnas.html'

const HTML_COMMENT_RE = /<!--[\s\S]*?-->/g

/** Los comentarios de autor del archivo real no pasan al output — mismo
 *  criterio que los renders de banner/header/cierre/footer. */
function stripComments(html: string): string {
  return html.replace(HTML_COMMENT_RE, '')
}

// --- Utilidades de corte/reemplazo ------------------------------------------
// Promovidas a template/htmlEdits.ts (fase 1 del plan de nuevos módulos de
// contenido, ver [[project_body_modules_plan_2026-08-26]]): cada módulo nuevo
// va a necesitar el mismo toolkit contra su propio maestro sin `{% if %}`
// alrededor de sus piezas opcionales. Los alias de acá solo fijan `FILE_NAME`
// (deal_columnas.html) para no tener que pasarlo en cada uno de los ~25 call
// sites de este archivo.
const applyEdits = (html: string, edits: Edit[]): string => htmlEdits.applyEdits(html, edits, FILE_NAME)
const indexOfOrThrow = (html: string, literal: string, from = 0): number => htmlEdits.indexOfOrThrow(html, literal, FILE_NAME, from)
const elementBounds = (html: string, anchorIndex: number, tag: string): Bounds => htmlEdits.elementBounds(html, anchorIndex, tag, FILE_NAME)
const voidElementBounds = (html: string, anchorIndex: number, tag: string): Bounds => htmlEdits.voidElementBounds(html, anchorIndex, tag, FILE_NAME)
const textRunBounds = (html: string, bounds: Bounds, tag: string): Bounds => htmlEdits.textRunBounds(html, bounds, tag, FILE_NAME)

/**
 * El patrón que comparten casi todas las piezas: apagada se corta el elemento
 * entero, prendida se reemplaza solo su texto. `textReplacement` va explícito
 * (ya escapado) porque varias piezas conservan un separador del maestro que no
 * es parte del dato — el `&nbsp;` entre el ícono y el número en RATING/TIEMPO,
 * los espacios alrededor del texto en los pills de tag.
 */
function togglePiece(cell: string, anchor: string, tag: string, enabled: boolean, textReplacement: string): Edit[] {
  const bounds = elementBounds(cell, indexOfOrThrow(cell, anchor), tag)
  if (!enabled) return [{ ...bounds, replacement: '' }]
  return [{ ...textRunBounds(cell, bounds, tag), replacement: textReplacement }]
}

/** Celda sin tarjeta: se conserva el `<td>` con sus atributos y se vacía el
 *  contenido — "se eliminan los elementos no la celda" (maestro). */
function emptyCell(cell: string): string {
  const openEnd = indexOfOrThrow(cell, '>')
  return `${cell.slice(0, openEnd + 1)}</td>`
}

// --- Celda de imagen --------------------------------------------------------

const PRODUCT_IMAGE_PLACEHOLDER = 'https://images.rappi.com/products/77c714d6-2d05-493e-8f33-c66711864ca7.png'
const LOGO_ANCHOR = 'role="molecula-iconoL"'
const LOGO_PLACEHOLDER = 'https://lh3.googleusercontent.com/d/1ZYWddltBXkpcjXzkdlT2fqWSSR2HYB-j'
/**
 * "Logo pastilla" — 2da variante de logo que el pull 2026-08-21 (bd9f4a5)
 * agregó junto al "Logo 1:1" de siempre (mismo `role="molecula-iconoL"`, otra
 * URL/tamaño/forma), sin `{% if %}` que la apague: el maestro la deja SIEMPRE
 * presente en las 2 celdas. Ahora es un campo real (`fields.logoShape`, ver
 * components/deals/schema.ts) — pedido explícito del usuario 2026-08-25 de
 * exponerla como una 2da forma de logo elegible, no solo ocultarla.
 */
const LOGO_PASTILLA_PLACEHOLDER = 'https://lh3.googleusercontent.com/d/1IY3lFRQnvb9g7cGALAbRBywZ6YpO6QLe'

function renderImageCell(cell: string, fields: DealCardFields): string {
  const edits: Edit[] = []

  // El asset de producto va dentro de `background-image: url(...)` SIN comillas:
  // cssUrlValue, no escapeHtmlAttr (un `)` cerraría el paréntesis antes de
  // tiempo y el resto se leería como CSS suelto).
  const productIndex = indexOfOrThrow(cell, PRODUCT_IMAGE_PLACEHOLDER)
  edits.push({
    start: productIndex,
    end: productIndex + PRODUCT_IMAGE_PLACEHOLDER.length,
    replacement: cssUrlValue(fields.productImageUrl),
  })

  // LOGO_ANCHOR (`role="molecula-iconoL"`) se repite en los 2 <img> del maestro
  // (cuadrado Y pastilla) — indexOfOrThrow toma el PRIMERO, que en el HTML real
  // es siempre el cuadrado (viene antes en el archivo), igual que antes de que
  // existiera este selector.
  const squareRoleIndex = indexOfOrThrow(cell, LOGO_ANCHOR)
  const pastillaSrcIndex = indexOfOrThrow(cell, LOGO_PASTILLA_PLACEHOLDER)

  // La forma NO elegida se descarta ENTERA (su <div>), no solo su <img>, así
  // no quedan 2 `<div style="padding: 10px;"></div>` vacíos apilando espacio
  // de más (mismo criterio que ya tenía la pastilla cuando estaba siempre
  // oculta). La forma elegida sigue la regla del maestro tal cual estaba antes
  // de este selector: sin URL se elimina solo la etiqueta `<img>`, el `<div>`
  // que la envuelve queda.
  if (fields.logoShape === 'pastilla') {
    edits.push({ ...elementBounds(cell, squareRoleIndex, 'div'), replacement: '' })
    if (fields.logoUrl.trim() === '') {
      edits.push({ ...voidElementBounds(cell, pastillaSrcIndex, 'img'), replacement: '' })
    } else {
      edits.push({
        start: pastillaSrcIndex,
        end: pastillaSrcIndex + LOGO_PASTILLA_PLACEHOLDER.length,
        replacement: escapeHtmlAttr(fields.logoUrl),
      })
    }
  } else {
    edits.push({ ...elementBounds(cell, pastillaSrcIndex, 'div'), replacement: '' })
    if (fields.logoUrl.trim() === '') {
      // "si no hay url se debe eliminar la etiqueta de imagen por completo".
      edits.push({ ...voidElementBounds(cell, squareRoleIndex, 'img'), replacement: '' })
    } else {
      const urlIndex = indexOfOrThrow(cell, LOGO_PLACEHOLDER)
      edits.push({ start: urlIndex, end: urlIndex + LOGO_PLACEHOLDER.length, replacement: escapeHtmlAttr(fields.logoUrl) })
    }
  }

  // {{img_overlay_1_mail_general}} queda para la pasada de tema del final.
  return applyEdits(cell, edits)
}

// --- Celda de textos --------------------------------------------------------

const LINK_PLACEHOLDER = 'LINKDEAL'
const COPY_1_VAR = '{{deals_copy_1_promo}}'
const COPY_2_VAR = '{{deals_copy_2_promo}}'
const MARKDOWN_ANCHOR = 'role="MARKDOWN"'
const CORONA_PRO_VAR = '{{coronapro_mail_body}}'
const COMPLEMENTO_1_ANCHOR = 'role="COMPLEMENTO 1"'
const COMPLEMENTO_2_ANCHOR = 'role="COMPLEMENTO 2"'
const CATEGORIA_ANCHOR = 'role="CATEGORIA"'
const RATING_ANCHOR = 'role="RATING"'
const TIEMPO_ANCHOR = 'role="TIEMPO"'
/** El `<div>` que agrupa categoría/rating/tiempo en una sola pieza movible
 *  ("rating") — el typo ("TESTOS" en vez de "TEXTOS") es real del maestro,
 *  no un error de este archivo. */
const RATING_GROUP_ANCHOR = 'role="TESTOS RATING"'
const TAG_ROLE_ANCHOR = 'role="molecula-tag"'
const TAG_1_ICON_PLACEHOLDER = 'https://lh3.googleusercontent.com/d/1rofiEyeYdjqVsiEL3-NWsOfXOSMQRVNa'
const TAG_2_ICON_PLACEHOLDER = 'https://lh3.googleusercontent.com/d/19wcynrgz0OqdDt5S5fVf7yaSx7rAN4Fn'
/** El llamado a la acción es el único texto de la celda sin `role` propio, así
 *  que se ancla en su literal. No se incluye la flecha (⤍) a propósito: el texto
 *  se reemplaza entero, alcanza con ubicar el `<strong>` que lo contiene. */
const CTA_ANCHOR = '<strong>Pide ahora'
/** Separador que el maestro pone entre el ícono y el número en RATING/TIEMPO —
 *  es del maestro, no del dato, así que se repone al reemplazar el texto. */
const ICON_TEXT_SEPARATOR = '&nbsp;'

/** LINEA 1 y LINEA 2: el texto ES la variable Liquid, así que se ancla en ella
 *  (única por celda). Anclar en `role="molecula-texto"` no serviría: el maestro
 *  lo repite en la celda de legales. */
function copyLineEdits(cell: string, liquidVar: string, text: string): Edit[] {
  const index = indexOfOrThrow(cell, liquidVar)
  if (text.trim() === '') {
    // "si no existe texto para esta linea se elimina toda la etiqueta".
    return [{ ...elementBounds(cell, index, 'h4'), replacement: '' }]
  }
  return [{ start: index, end: index + liquidVar.length, replacement: escapeHtmlText(text) }]
}

/** El maestro trae `Antes <del>$999</del>` fijo, pegado justo después del
 *  `| ` de COMPLEMENTO 2 — ver el comentario grande de complemento2Edits. */
const COMPLEMENTO_2_FIXED_SEGMENT = 'Antes <del>$999</del>'

/**
 * COMPLEMENTO 2: el maestro trae `| Antes <del>$999</del>`. Pedido explícito
 * del usuario 2026-08-25, en 2 pasos: primero "Antes" pasó a ser parte de
 * `complemento2Text` (ya no un literal fijo), después se pidieron
 * modificadores de texto (bold/italic/tachado/subrayado/superíndice) con
 * tachado SOLO en "Antes" por default.
 *
 * Por eso el `<del>` fijo del maestro se descarta acá: tacha TODO su
 * contenido sin distinción, y el tachado ahora es selectivo por RUN — lo
 * pone `renderRichText` con su propio `text-decoration: line-through` por
 * span, no un `<del>` contenedor. Se reemplaza el segmento fijo completo
 * ("Antes <del>$999</del>") por el RichText renderizado; el `| ` que
 * precede sigue fijo, es el separador general de la fila de precio, no
 * parte de "Antes".
 */
function complemento2Edits(cell: string, fields: DealCardFields): Edit[] {
  const bounds = elementBounds(cell, indexOfOrThrow(cell, COMPLEMENTO_2_ANCHOR), 'h5')
  if (!fields.complemento2Enabled) return [{ ...bounds, replacement: '' }]
  const segmentIndex = indexOfOrThrow(cell, COMPLEMENTO_2_FIXED_SEGMENT, bounds.start)
  return [
    {
      start: segmentIndex,
      end: segmentIndex + COMPLEMENTO_2_FIXED_SEGMENT.length,
      replacement: renderRichText(fields.complemento2Text, LIQUID_COLOR_TOKENS),
    },
  ]
}

/** Límites del `<div role="molecula-tag">` — el ABUELO del ícono (envuelve el
 *  pill, que envuelve el `<h5>` con el `<img>`), y ese role aparece 2 veces
 *  por celda — el ícono por defecto es lo único que distingue un tag del
 *  otro, así que se ubica el ícono y desde ahí se busca su role hacia atrás.
 *  Extraído aparte de tagEdits para que pieceBounds pueda reusarlo. */
function tagGroupBounds(cell: string, iconPlaceholder: string): Bounds {
  const iconIndex = indexOfOrThrow(cell, iconPlaceholder)
  const roleIndex = cell.lastIndexOf(TAG_ROLE_ANCHOR, iconIndex)
  if (roleIndex === -1) {
    throw new Error(`${FILE_NAME}: no se encontró "${TAG_ROLE_ANCHOR}" antes del ícono "${iconPlaceholder}" — revisar components/deals/render.ts`)
  }
  return elementBounds(cell, roleIndex, 'div')
}

/**
 * TAG1/TAG2. `cell` acá es siempre el FRAGMENTO ya recortado de la pieza
 * (ver pieceBounds/pieceEdits), así que `tagGroupBounds` devuelve los
 * límites de todo el fragmento — el toggle apagado no borra nada (el
 * fragmento entero desaparece del reensamblado si `enabled` es false, ver
 * renderTextCell), lo que hace falta acá es solo el reemplazo de texto/ícono.
 */
function tagEdits(cell: string, iconPlaceholder: string, enabled: boolean, iconUrl: string, text: string): Edit[] {
  const iconIndex = indexOfOrThrow(cell, iconPlaceholder)
  // "se debe poder cambiar o quitar el ícono, si se quita, se elimina la div
  // completa" — sin ícono no hay pill, así que apagar el tag (o dejar la URL
  // del ícono en blanco — pedido explícito del usuario 2026-08-25, para no
  // dejar un <img src=""> roto) borra el <div> completo.
  if (!enabled || iconUrl.trim() === '') return [{ ...tagGroupBounds(cell, iconPlaceholder), replacement: '' }]

  const labelBounds = textRunBounds(cell, elementBounds(cell, iconIndex, 'h5'), 'h5')
  return [
    { start: iconIndex, end: iconIndex + iconPlaceholder.length, replacement: escapeHtmlAttr(iconUrl) },
    // Los espacios alrededor son del maestro (` tag 1 `), no del dato.
    { ...labelBounds, replacement: ` ${escapeHtmlText(text)} ` },
  ]
}

function ctaEdits(cell: string, fields: DealCardFields): Edit[] {
  const anchorIndex = indexOfOrThrow(cell, CTA_ANCHOR)
  if (!fields.ctaEnabled) return [{ ...elementBounds(cell, anchorIndex, 'h4'), replacement: '' }]
  const strongBounds = elementBounds(cell, anchorIndex, 'strong')
  return [{ ...textRunBounds(cell, strongBounds, 'strong'), replacement: escapeHtmlText(fields.ctaText) }]
}

/** LINEA 3 completa: badge de descuento (+ Corona Pro opcional) + 2
 *  complementos — las 3 piezas de la fila original del maestro, ahora
 *  reunidas como los edits de la pieza movible "precio". Misma lógica que
 *  antes vivía inline en renderTextCell, corriendo acá contra el fragmento
 *  ya recortado de esta pieza en vez de la celda completa. */
function precioFragmentEdits(fragment: string, fields: DealCardFields): Edit[] {
  const edits: Edit[] = []
  const markdownBounds = elementBounds(fragment, indexOfOrThrow(fragment, MARKDOWN_ANCHOR), 'h4')
  if (!fields.markdownEnabled) {
    // Se corta el <h4> entero, y con él la Corona Pro que vive adentro — por eso
    // la edición del ícono NO se emite en esta rama (ver applyEdits).
    edits.push({ ...markdownBounds, replacement: '' })
  } else {
    edits.push({ ...textRunBounds(fragment, markdownBounds, 'h4'), replacement: escapeHtmlText(fields.markdownText) })
    if (!fields.coronaProEnabled) {
      edits.push({ ...voidElementBounds(fragment, indexOfOrThrow(fragment, CORONA_PRO_VAR), 'img'), replacement: '' })
    }
  }
  edits.push(...togglePiece(fragment, COMPLEMENTO_1_ANCHOR, 'h5', fields.complemento1Enabled, escapeHtmlText(fields.complemento1Text)))
  edits.push(...complemento2Edits(fragment, fields))
  return edits
}

/** TEXTOS RATING completa: categoría / rating / tiempo — la pieza movible
 *  "rating". Los 2 íconos (estrella y reloj) son fijos en el maestro, solo
 *  cambia el texto que va después de cada uno. */
function ratingGroupFragmentEdits(fragment: string, fields: DealCardFields): Edit[] {
  return [
    ...togglePiece(fragment, CATEGORIA_ANCHOR, 'h5', fields.categoriaEnabled, escapeHtmlText(fields.categoriaText)),
    ...togglePiece(fragment, RATING_ANCHOR, 'h5', fields.ratingEnabled, `${ICON_TEXT_SEPARATOR}${escapeHtmlText(fields.ratingText)}`),
    ...togglePiece(fragment, TIEMPO_ANCHOR, 'h5', fields.tiempoEnabled, `${ICON_TEXT_SEPARATOR}${escapeHtmlText(fields.tiempoText)}`),
  ]
}

/**
 * Límites de UNA pieza movible en la celda PRÍSTINA (antes de aplicar ningún
 * edit) — cada anchor aparece exactamente una vez dentro de los límites de
 * su propia pieza (verificado contra deal_columnas.html), así que ubicarlos
 * sobre la celda completa es seguro incluso antes de haber recortado nada.
 */
function pieceBounds(cell: string, type: DealCardPieceType): Bounds {
  switch (type) {
    case 'copy1':
      return elementBounds(cell, indexOfOrThrow(cell, COPY_1_VAR), 'h4')
    case 'copy2':
      return elementBounds(cell, indexOfOrThrow(cell, COPY_2_VAR), 'h4')
    case 'precio':
      return elementBounds(cell, indexOfOrThrow(cell, MARKDOWN_ANCHOR), 'div')
    case 'rating':
      return elementBounds(cell, indexOfOrThrow(cell, RATING_GROUP_ANCHOR), 'div')
    case 'tag1':
      return tagGroupBounds(cell, TAG_1_ICON_PLACEHOLDER)
    case 'tag2':
      return tagGroupBounds(cell, TAG_2_ICON_PLACEHOLDER)
    case 'cta':
      return elementBounds(cell, indexOfOrThrow(cell, CTA_ANCHOR), 'h4')
  }
}

/** Los edits propios de una pieza, calculados contra SU PROPIO fragmento (no
 *  la celda completa) — todas las funciones de abajo ya son anchor-search
 *  puras sobre un string cualquiera, así que corren igual sobre un fragmento
 *  chico que sobre la celda entera. */
function pieceEdits(fragment: string, type: DealCardPieceType, fields: DealCardFields): Edit[] {
  switch (type) {
    case 'copy1':
      return copyLineEdits(fragment, COPY_1_VAR, fields.copy1)
    case 'copy2':
      return copyLineEdits(fragment, COPY_2_VAR, fields.copy2)
    case 'precio':
      return precioFragmentEdits(fragment, fields)
    case 'rating':
      return ratingGroupFragmentEdits(fragment, fields)
    case 'tag1':
      return tagEdits(fragment, TAG_1_ICON_PLACEHOLDER, fields.tag1Enabled, fields.tag1IconUrl, fields.tag1Text)
    case 'tag2':
      return tagEdits(fragment, TAG_2_ICON_PLACEHOLDER, fields.tag2Enabled, fields.tag2IconUrl, fields.tag2Text)
    case 'cta':
      return ctaEdits(fragment, fields)
  }
}

/**
 * Red de seguridad (throw-loud, mismo criterio que el resto del archivo):
 * las 7 piezas deben ser hermanas CONTIGUAS en su orden natural (solo
 * whitespace entre una y la siguiente) — verificado hoy contra
 * deal_columnas.html, pero si un futuro pull del maestro intercalara algo
 * entre ellas, reensamblar en un orden custom se comería ese contenido en
 * silencio. Mejor romper el build/render ruidosamente que exportar un mail
 * con contenido perdido.
 */
function assertPiecesContiguous(cell: string, ordered: { type: DealCardPieceType; bounds: Bounds }[]): void {
  for (let i = 0; i < ordered.length - 1; i++) {
    const between = cell.slice(ordered[i].bounds.end, ordered[i + 1].bounds.start)
    if (between.trim() !== '') {
      throw new Error(
        `${FILE_NAME}: contenido inesperado entre "${ordered[i].type}" y "${ordered[i + 1].type}" ("${between.trim()}") — ¿cambió el maestro? revisar components/deals/render.ts`,
      )
    }
  }
}

function renderTextCell(cell: string, card: DealCard): string {
  const fields = card.fields

  // El link de ESTA celda (1 sola aparición por celda: el archivo real no usa
  // la numeración LINKDEAL1/LINKDEAL2 que sugiere _contenidos_wrapper.html) —
  // se resuelve PRIMERO, sobre la celda completa: no se superpone con los
  // límites de ninguna pieza (vive en el <a> que las envuelve a todas), así
  // que medirlas después de este paso es seguro.
  const linkIndex = indexOfOrThrow(cell, LINK_PLACEHOLDER)
  const withLink = applyEdits(cell, [
    { start: linkIndex, end: linkIndex + LINK_PLACEHOLDER.length, replacement: escapeHtmlAttr(fields.link) },
  ])

  // Límites de las 7 piezas en orden NATURAL (el literal del maestro) —
  // reordenar pasa por el ARMADO final, no por cómo se miden acá.
  const naturalBounds = DEAL_CARD_PIECE_TYPES.map((type) => ({ type, bounds: pieceBounds(withLink, type) }))
  assertPiecesContiguous(withLink, naturalBounds)

  const shellBefore = withLink.slice(0, naturalBounds[0].bounds.start)
  const shellAfter = withLink.slice(naturalBounds[naturalBounds.length - 1].bounds.end)

  // Fragmento editado de cada pieza (envuelto en sus propios marcadores para
  // que ui/Viewport.tsx pueda medirla y arrastrarla) + el whitespace ORIGINAL
  // que el maestro traía después de ella — se reusa como "pegamento" al
  // reensamblar en el orden pedido, así el orden natural da una salida BYTE A
  // BYTE IGUAL a la de antes de este cambio.
  const fragmentByType = {} as Record<DealCardPieceType, string>
  const gapAfterType: Partial<Record<DealCardPieceType, string>> = {}
  for (let i = 0; i < naturalBounds.length; i++) {
    const { type, bounds } = naturalBounds[i]
    const raw = withLink.slice(bounds.start, bounds.end)
    const edited = applyEdits(raw, pieceEdits(raw, type, fields))
    fragmentByType[type] = wrapWithDealCardPieceMarkers(card.id, type, edited)
    if (i < naturalBounds.length - 1) {
      gapAfterType[type] = withLink.slice(bounds.end, naturalBounds[i + 1].bounds.start)
    }
  }

  const order = normalizePieceOrder(fields.pieceOrder)
  const middle = order.map((type, i) => fragmentByType[type] + (i < order.length - 1 ? gapAfterType[type] ?? '\n' : '')).join('')

  return shellBefore + middle + shellAfter
}

// --- Celda de legales -------------------------------------------------------

const LEGAL_ANCHOR = '<span role="molecula-texto" class="legal"'

function renderLegalCell(cell: string, card: DealCard): string {
  const bounds = elementBounds(cell, indexOfOrThrow(cell, LEGAL_ANCHOR), 'span')
  // La fila de legales es del PAR, pero el toggle es por tarjeta: si esta no lo
  // activó y su compañera sí, la celda queda con el <span> vacío. El maestro es
  // explícito en que ahí se quita el contenido, nunca la celda.
  const text = card.fields.legalEnabled ? escapeHtmlText(card.fields.legalText) : ''
  return applyEdits(cell, [{ ...textRunBounds(cell, bounds, 'span'), replacement: text }])
}

// --- Armado del par ---------------------------------------------------------

/**
 * Las 3 plantillas de celda del archivo real. Los cierres son literales
 * "atómicos" de 2 tags a propósito: la celda de imagen anida otra tabla y la de
 * textos un `<a>`, así que un `</td>` suelto cortaría en el cierre interno.
 * Las 2 celdas de cada fila son iguales salvo espacios en blanco, y cada una
 * trae exactamente una copia de cada ancla (verificado, y contado en
 * scripts/sync-master.mjs) — así que se extrae cada celda por separado y se
 * rellena con los datos de su propia tarjeta.
 */
const IMAGE_CELL_RE = /<td width="50%" style="width: 50%" >[\s\S]*?<\/table><\/td>/g
const TEXT_CELL_RE = /<td width="50%" style="width: 50%; vertical-align: top;[\s\S]*?<\/a><\/td>/g
const LEGAL_CELL_RE = /<td width="50%" style="width: 50%;" >[\s\S]*?<\/div><\/td>/g

/** Reemplaza las 2 celdas de una fila, de atrás hacia adelante para no
 *  invalidar el índice de la primera. */
function spliceRow(html: string, cellRe: RegExp, label: string, renderCell: (cell: string, slot: number) => string): string {
  const matches = [...html.matchAll(cellRe)]
  if (matches.length !== DEALS_CARDS_PER_PAIR) {
    throw new Error(
      `${FILE_NAME}: se esperaban ${DEALS_CARDS_PER_PAIR} celdas de ${label} y se encontraron ${matches.length} — revisar components/deals/render.ts`,
    )
  }
  let out = html
  for (let slot = matches.length - 1; slot >= 0; slot--) {
    const match = matches[slot]
    const start = match.index ?? indexOfOrThrow(html, match[0])
    out = out.slice(0, start) + renderCell(match[0], slot) + out.slice(start + match[0].length)
  }
  return out
}

/** Saca la fila de legales entera (los 2 `<td>` y su `<tr>`) cuando ninguna de
 *  las 2 tarjetas del par la activó — "viene desactivada por defecto". */
function removeLegalRow(html: string): string {
  const cellIndex = indexOfOrThrow(html, LEGAL_ANCHOR)
  const rowStart = html.lastIndexOf('<tr', cellIndex)
  if (rowStart === -1) {
    throw new Error(`${FILE_NAME}: no se encontró el <tr> de la fila de legales — revisar components/deals/render.ts`)
  }
  const rowEnd = indexOfOrThrow(html, '</tr>', cellIndex) + '</tr>'.length
  return html.slice(0, rowStart) + html.slice(rowEnd)
}

function renderDealPair(cards: (DealCard | undefined)[], blockId: string): string {
  let html = stripComments(dealColumnasRaw)

  // Cada celda que SÍ tiene tarjeta se envuelve en su par de comentarios
  // DCARD — una tarjeta produce 2 o 3 pares (imagen, textos y, si aparece, su
  // celda de legales), todos con el mismo id, porque su HTML vive repartido en
  // 3 `<tr>` que no son contiguos. ui/Viewport.tsx los une en un solo rect.
  const cellFor = (cell: string, slot: number, render: (card: DealCard) => string): string => {
    const card = cards[slot]
    if (!card) return emptyCell(cell)
    return wrapWithDealCardMarkers(blockId, card.id, render(card))
  }

  html = spliceRow(html, IMAGE_CELL_RE, 'imagen', (cell, slot) => cellFor(cell, slot, (card) => renderImageCell(cell, card.fields)))
  html = spliceRow(html, TEXT_CELL_RE, 'textos', (cell, slot) => cellFor(cell, slot, (card) => renderTextCell(cell, card)))

  const showLegal = cards.some((card) => card?.fields.legalEnabled === true)
  html = showLegal
    ? spliceRow(html, LEGAL_CELL_RE, 'legales', (cell, slot) => cellFor(cell, slot, (card) => renderLegalCell(cell, card)))
    : removeLegalRow(html)

  return html
}

// --- Liquid muerto del maestro ----------------------------------------------

/**
 * Los 4 `{% assign deals_copy_[12]_promo %}` de EJEMPLO que el maestro trae
 * ANTES del doctype (2 con el texto de muestra, 2 aplicándole `| truncate: 50`)
 * más el comentario que los explica. Es Liquid VIVO, no comentado, que hoy se
 * cuela tal cual en todo HTML exportado — incluso sin usar DEALS, porque
 * stripBannerFieldAssigns solo barre los `banner_(copy|img)_*`. La app hornea
 * esos textos dentro de cada tarjeta, así que acá ya son Liquid muerto.
 *
 * El comentario título que los precede (`EJEMPLO DE DEFINICION DE CAMPOS PARA
 * BANNER`, mal etiquetado en el maestro: es un copy-paste del bloque del banner
 * que está justo arriba) ya lo barre el regex global de
 * components/banner/render.ts, así que no se repite acá.
 */
const DEALS_LINE_LIMIT_COMMENT_RE = /[ \t]*<!--\s*LÍMITE DE 2 LÍNEAS[\s\S]*?-->[ \t]*\r?\n?/g
const DEALS_FIELD_ASSIGN_RE = /[ \t]*\{%\s*assign\s+deals_copy_[12]_promo\s*=\s*.*?%\}[ \t]*\r?\n?/g

export function stripDealsFieldAssigns(html: string): string {
  return html.replace(DEALS_LINE_LIMIT_COMMENT_RE, '').replace(DEALS_FIELD_ASSIGN_RE, '')
}

// --- Entrada pública --------------------------------------------------------

/** Agrupa las tarjetas de a 2, como las renderiza el maestro. La última puede
 *  quedar sin compañera (`undefined`) — su celda se vacía sin borrarse. */
function chunkPairs(items: DealCard[]): (DealCard | undefined)[][] {
  const pairs: (DealCard | undefined)[][] = []
  for (let i = 0; i < items.length; i += DEALS_CARDS_PER_PAIR) {
    pairs.push([items[i], items[i + 1]])
  }
  return pairs
}

export interface DealsRenderCtx {
  blockId: string
}

export function renderDealsSnippet(fields: DealsFields, doc: EmailDocument, ctx: DealsRenderCtx): string {
  // Sin separador entre pares: "los deals tienen su propio aire"
  // (05-docs/USO-DE-CADA-PARTE.md, repetido en COMO-ARMAR-UN-MAIL.md) — la
  // misma razón por la que components/contenidos/render.ts tampoco pone
  // separador antes ni después de un bloque DEALS.
  const html = chunkPairs(fields.items)
    .map((pair) => renderDealPair(pair, ctx.blockId))
    .join('\n')

  return resolveThemeVars(html, resolveGlobalVars(doc.global))
}
