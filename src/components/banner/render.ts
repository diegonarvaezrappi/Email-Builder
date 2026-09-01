// ============================================================================
// Genera el snippet que reemplaza el marcador `<!-- BANNER : ... -->` del
// template maestro. A diferencia de CTA/Footer (contenido opaco, resuelto por
// Braze), Banner es HTML real que la app compone y hornea — mismo patrón que
// Header/Cierre, extendido a una lista repetible de piezas.
// ============================================================================
import type { EmailDocument } from '../../model'
import { escapeHtmlAttr } from '../../template/htmlText'
import { wrapWithBannerItemMarkers } from '../../template/contentBlocks'
import { getBannerItemDef, type BannerItemRenderCtx } from '../../bannerItemRegistry'
import { resolveThemeVars } from '../../themes/inlineTheme'
import { PASTEL_THEME_SLUGS, themeVars } from '../../themes/themes'
import { enforceHorizontalItemOrder } from './horizontalOrder'
import { bannerShell, ITEMS_MARKER, MOLECULAS_MARKER } from './shell'
import type { BannerFields } from './schema'
import type { BannerItem } from './items/schemas'

/** Token de relleno manual del maestro (no es una variable Liquid), misma
 *  convención que AQUIELLINK# del CTA. Aparece 2 veces por archivo de banner
 *  (href + originalsrc) → replaceAll. */
const BANNER_LINK_PLACEHOLDER = 'AQUIELLINKDELBANNER'

/**
 * Los valores "apagado" que el propio maestro documenta en el comentario
 * `<!-- CONTENEDOR DEL BANNER: ... -->` de big-banner-horizontal.html /
 * big-banner-vertical.html — es el mismo mecanismo que ahí se describe como
 * edición manual (reemplazar el `{{..._mail_general}}` por este literal),
 * acá aplicado desde el checkbox "Fondo del banner" en vez de a mano.
 *
 * `bgBannerimg` no es un `url()` vacío: es la MISMA imagen placeholder en
 * blanco que el maestro ya usa en otros lugares como "acá no va nada"
 * (ver 04_content-modules/logos/modulo-logos.html) — más fiel al maestro que
 * inventar un `url()` vacío, y evita que algún cliente de correo trate un
 * `background-image: url();` roto de forma rara.
 */
const BANNER_BACKGROUND_OFF_VARS = {
  bg_bannertono_mail_general: 'rgba(0,0,0,0.0)',
  bg_bannerimg_mail_general: 'https://lh3.googleusercontent.com/d/1_q4ca1b7DkKOGnFqwVfKMTFTmhMp0E2A',
}

/**
 * Mismo comentario "CONTENEDOR DEL BANNER" de big-banner-*.html, pero para el
 * grupo pastel — que trae el fondo APAGADO por defecto (al revés de oscuros/
 * Pro/ProBlack): su propio `bg_bannertono_mail_general` ya es transparente y
 * su `padd_banner_mail_general` ya es `0px 0px`, así que activar el checkbox
 * ahí no puede reutilizar BANNER_BACKGROUND_OFF_VARS (ese `bg_bannerimg`
 * pintaría un recuadro blanco encima del tono transparente — el maestro
 * documenta que la fila de imagen para pastel "se mantiene idéntico" sin
 * importar el estado del checkbox, así que nunca se toca acá). El maestro
 * dice literalmente que, activado, el tono pasa a `{{bg_solid_mail_general}}`
 * y el padding al mismo literal que los temas no-pastel ya traen por defecto.
 */
const PASTEL_BANNER_BACKGROUND_ON_PADDING = '15px 10px'

function bannerThemeVars(fields: BannerFields, tema: string): Record<string, string> {
  const vars = themeVars(tema)
  if (PASTEL_THEME_SLUGS.includes(tema)) {
    if (!fields.backgroundEnabled) return vars
    return {
      ...vars,
      bg_bannertono_mail_general: vars.bg_solid_mail_general,
      padd_banner_mail_general: PASTEL_BANNER_BACKGROUND_ON_PADDING,
    }
  }
  return fields.backgroundEnabled ? vars : { ...vars, ...BANNER_BACKGROUND_OFF_VARS }
}

/**
 * Los 5 `{% assign %}` de EJEMPLO (banner_copy_modulo_* / banner_img_modulo_auto_ancho)
 * que el maestro trae ANTES del doctype (06-examples/estructura_general.html) — Liquid VIVO
 * (no comentado) que hoy se cuela tal cual en todo HTML exportado (confirmado
 * en el asset ya sincronizado). La app hornea esos valores dentro de cada
 * pieza, así que acá son Liquid muerto: se borran junto con su comentario
 * título, para cumplir "output limpio de Liquid de los banners". Regex
 * global: el repo llegó a duplicar estas líneas (una copia además vive dentro
 * de head-meta-tags.html), así que se barren todas las que haya, no solo la
 * primera.
 */
const BANNER_FIELDS_COMMENT_RE = /[ \t]*<!--\s*EJEMPLO DE DEFINICION DE CAMPOS PARA BANNER\s*-->[ \t]*\r?\n?/g
const BANNER_FIELD_ASSIGN_RE = /[ \t]*\{%\s*assign\s+banner_(?:copy|img)_[a-z_0-9]+\s*=\s*'[^']*'\s*%\}[ \t]*\r?\n?/g

export function stripBannerFieldAssigns(html: string): string {
  return html.replace(BANNER_FIELDS_COMMENT_RE, '').replace(BANNER_FIELD_ASSIGN_RE, '')
}

interface ItemGroup {
  zone: 'MOLECULA' | 'MODULO'
  html: string
}

/**
 * Cada pieza vertical (MOLECULA o MODULO — PROMO/CREDITOS/TEXTOXL/TEXTOM/
 * TEXTO_COMPLEMENTARIO/IMG_AUTOMATICA_MOLECULA/TAGS) se centra sola vía
 * `margin: 0 auto` en su propio archivo _vertical.html — no hay un wrapper
 * común que las centre desde afuera (mismo mecanismo que documenta
 * 02-components/README.md para TAGS). Alinearlas a la izquierda es entonces,
 * pieza por pieza, quitarle el "auto" a su propio margin: deja intacto el
 * resto de sus estilos (padding, colores, tamaños). Pedido explícito del
 * usuario tras probar la primera versión de este selector ("Los textos,
 * imagenes, todas las moleculas deberia poder alinearse a la izquierda"):
 * inicialmente solo tocaba zona MOLECULA (interpretando "moléculas" en el
 * sentido estricto del código); el usuario aclaró que quiere TODO lo del
 * banner vertical, MODULO incluido. IMG_FIJA (el otro MODULO) no tiene este
 * literal con efecto visual real — su logo ya viene `text-align: left` del
 * propio maestro — así que el replace ahí es un no-op inofensivo, igual que
 * en CTA_INTERNO (que tampoco trae este literal: su alineado ya se resuelve
 * vía ctx.moleculeAlign en items/render.ts, antes de llegar acá).
 */
const MOLECULE_CENTER_MARGIN_RE = /margin:\s*0\s*auto\s*;/g

/**
 * El margin solo no alcanza para PROMO/CREDITOS/TEXTOXL/TEXTOM/
 * TEXTO_COMPLEMENTARIO cuando el texto es lo bastante largo para partirse en
 * varias líneas — reportado por el usuario en vivo ("Los textos siguen
 * alineados al centro"): con `width: auto` en la tabla, un texto que no
 * entra en una sola línea fuerza a la tabla a ocupar todo el ancho
 * disponible (el navegador no puede shrink-wrappearla a la línea más larga
 * cuando hay wrap), así que el margin de esa tabla deja de tener efecto
 * visual — lo que realmente centra cada línea es el `text-align: center` del
 * <td> que envuelve el texto. Con texto corto (ej. "$14.000", que entra en 1
 * línea) el bug no se nota: ahí la tabla SÍ se shrink-wrappea al contenido,
 * así que ancho del <td> == ancho del texto y text-align no cambia nada
 * visualmente — por eso el primer pase de este fix (solo margin) pareció
 * andar bien en la verificación con PROMO pero fallaba para TEXTOM/TEXTO
 * COMPLEMENTARIO.
 *
 * El único `text-align: center` que NO hay que tocar es la celda vertical
 * "Ahora" de PROMO (`writing-mode: sideways-lr` desde el pull 2026-09-01,
 * antes `vertical-rl` — el mecanismo de abajo no depende del valor exacto, ver
 * la nota siguiente): ahí text-align controla la
 * posición VERTICAL de la palabra rotada dentro de su caja de 70px de alto,
 * no una alineación horizontal — cambiarlo la movería de su centro vertical
 * hacia arriba, una regresión no pedida. Se distingue sin acoplarse a PROMO
 * específicamente: todas las celdas de CONTENIDO real envuelven su texto en
 * <span>/<h2>; la celda "Ahora" envuelve el suyo en <div> — el lookahead
 * alcanza para excluirla.
 */
const MOLECULE_CONTENT_CELL_CENTER_RE = /<td\b[^>]*?text-align:\s*center;?[^>]*>(?=<(?:span|h2)\b)/g

function alignMoleculeLeft(html: string): string {
  const withoutAutoMargin = html.replace(MOLECULE_CENTER_MARGIN_RE, 'margin: 0;')
  return withoutAutoMargin.replace(MOLECULE_CONTENT_CELL_CENTER_RE, (tdOpenTag) =>
    tdOpenTag.replace(/text-align:\s*center/, 'text-align: left'),
  )
}

/**
 * Contraparte de `alignMoleculeLeft`, para el banner HORIZONTAL: ahí las
 * piezas de zona MOLECULA (PROMO/CREDITOS/TEXTOXL/TEXTOM/TEXTO_COMPLEMENTARIO/
 * IMG_AUTOMATICA_MOLECULA) vienen alineadas a la izquierda por defecto — sus
 * archivos _horizontal.html NUNCA traen `margin: 0 auto` (a diferencia de
 * _vertical.html) — así que centrarlas es CONSTRUIR el mismo mecanismo que
 * _vertical.html ya trae de fábrica, no quitárselo. Mismos 2 pasos que
 * alignMoleculeLeft, invertidos:
 *
 * 1. Insertar `margin: 0 auto;` junto al `(margin|padding)-bottom: 7px;` que
 *    las 5 piezas de texto comparten literalmente — reproduce exactamente el
 *    mismo par de declaraciones que ya usa cada _vertical.html (ver
 *    MOLECULE_CENTER_MARGIN_RE arriba). Hasta el pull 2026-08-09 era siempre
 *    `margin-bottom`; el pull 2026-08-21 (bd9f4a5) lo cambió a `padding-bottom`
 *    en las 17 moléculas de banner ("el margin no se aplicaba consistente en
 *    clientes de mail", CHANGELOG v0.7.0) — el regex matchea cualquiera de
 *    las 2 y el reemplazo conserva la que haya (no la pisa por `margin-bottom`
 *    a mano), para no deshacer ese mismo fix de compatibilidad en las piezas
 *    centradas. IMG_AUTOMATICA_MOLECULA es la
 *    excepción: su tabla exterior es `width:100%` (el insert ahí es un
 *    no-op inofensivo, igual que en IMG_FIJA), lo que realmente centra esa
 *    pieza es el propio <img> — mismo elemento donde molecula_img_automatica_
 *    _vertical.html ya trae `margin: 0 auto` junto a `max-width: 480px`;
 *    acá se inserta ahí también.
 * 2. Flip de `text-align: left` → `center` en el <td> de contenido real —
 *    mismo lookahead <span>/<h2> que alignMoleculeLeft usa para EXCLUIR la
 *    celda vertical "Ahora" de PROMO (acá esa celda ya trae `text-align:
 *    center` de fábrica en horizontal — copy-paste histórico del vertical,
 *    ver molecula_promo_horizontal.html — así que no hay nada que tocar ahí
 *    de por sí: el regex de left→center simplemente no encuentra nada que
 *    matchear en esa celda).
 *
 * MODULOS (IMG_FIJA, TAGS) quedan afuera a propósito, no por descuido: en
 * horizontal no comparten columna con las moléculas (ver
 * bannerSchema.horizontalMoleculeAlign) — este transform ni se les aplica
 * (ver el gate por `def.zone` en groupBannerItems).
 */
const MOLECULE_ADD_CENTER_MARGIN_RE = /((?:margin|padding)-bottom:\s*7px;)/g
const IMG_AUTOMATICA_MOLECULA_HEIGHT_MAXWIDTH_RE = /(height:\s*auto;\s*)(max-width:\s*480px;)/
const MOLECULE_CONTENT_CELL_LEFT_RE = /<td\b[^>]*?text-align:\s*left;?[^>]*>(?=<(?:span|h2)\b)/g

function alignMoleculeCenter(html: string): string {
  let out = html.replace(MOLECULE_ADD_CENTER_MARGIN_RE, 'margin: 0 auto; $1')
  out = out.replace(IMG_AUTOMATICA_MOLECULA_HEIGHT_MAXWIDTH_RE, '$1margin: 0 auto; $2')
  return out.replace(MOLECULE_CONTENT_CELL_LEFT_RE, (tdOpenTag) => tdOpenTag.replace(/text-align:\s*left/, 'text-align: center'))
}

/**
 * Recorre `items` en orden y arma los grupos a insertar: cada corrida
 * CONSECUTIVA de piezas de zona MOLECULA se envuelve en UNA sola copia de la
 * tabla "MODULO MOLECULAS" (reproduce la estructura real del maestro: 240px
 * lado a lado en horizontal, apiladas en vertical); las piezas de zona MODULO
 * (imagen, tags) salen sueltas, como hermanas. Es lo que permite reordenar y
 * duplicar piezas libremente sin romper el layout de ninguna de las 2
 * orientaciones — ver la nota de diseño en components/banner/exclusivity.ts y
 * en el plan de este componente.
 *
 * Las piezas cuyo tipo no tiene archivo/comportamiento para la orientación
 * activa (ej. un IMG_AUTOMATICA_MODULO que quedó de cuando el banner era
 * horizontal) se OMITEN acá, no se borran del documento — siguen en
 * doc.banner.items y el panel del Banner las lista para poder eliminarlas.
 * Mismo criterio que el filter de components/contenidos/render.ts.
 */
export function groupBannerItems(items: BannerItem[], doc: EmailDocument, ctx: BannerItemRenderCtx): ItemGroup[] {
  const groups: ItemGroup[] = []
  // Red de seguridad: store/store.ts ya deja doc.banner.items en el orden
  // válido para horizontal tras cualquier inserción/reordenamiento, pero
  // cambiar bannerType de vertical a horizontal (ui/LibraryPanel.tsx) no pasa
  // por esas acciones — ver horizontalOrder.ts.
  const orderedItems = enforceHorizontalItemOrder(items, ctx.bannerType)
  for (const item of orderedItems) {
    const def = getBannerItemDef(item.type)
    if (!def || !def.orientations.includes(ctx.bannerType)) continue

    let itemHtml = def.render(item.fields, doc, ctx)
    if (ctx.bannerType === 'vertical' && ctx.moleculeAlign === 'left') {
      itemHtml = alignMoleculeLeft(itemHtml)
    } else if (ctx.bannerType === 'horizontal' && def.zone === 'MOLECULA' && ctx.horizontalMoleculeAlign === 'center') {
      itemHtml = alignMoleculeCenter(itemHtml)
    }
    const html = wrapWithBannerItemMarkers(item.type, item.id, itemHtml)
    const last = groups[groups.length - 1]
    if (def.zone === 'MOLECULA' && last?.zone === 'MOLECULA') {
      last.html += `\n${html}`
    } else {
      groups.push({ zone: def.zone, html })
    }
  }
  return groups
}

export function renderBannerSnippet(fields: BannerFields, doc: EmailDocument): string {
  const { shell, moleculeTable } = bannerShell(fields.bannerType)
  const ctx: BannerItemRenderCtx = {
    bannerType: fields.bannerType,
    moleculeAlign: fields.moleculeAlign,
    horizontalMoleculeAlign: fields.horizontalMoleculeAlign,
  }

  const body = groupBannerItems(fields.items, doc, ctx)
    .map((group) => (group.zone === 'MOLECULA' ? moleculeTable.replace(MOLECULAS_MARKER, () => group.html) : group.html))
    .join('\n')

  let html = shell.replace(ITEMS_MARKER, () => body)
  html = html.replaceAll(BANNER_LINK_PLACEHOLDER, () => escapeHtmlAttr(fields.link))

  // Resolución LOCAL de las {{xxx_mail_general}} que puedan quedar (bg_bannerimg,
  // bg_bannertono, padd_banner del shell + bg_descuento, color_descuento,
  // bg_creditos, color_creditos, color_acento2, bg_tag_fondo, color_texto,
  // img_overlay_2 de las piezas) — obligatorio: template/assemble.ts corre
  // inlineTheme() sobre TODO el maestro ANTES de insertar este snippet en su
  // marcador, así que cualquiera de estas variables que quedara acá nunca se
  // resolvería después. Mismo precedente que resolveHeaderThemeVars en
  // components/header/render.ts. Una sola pasada al final cubre las de acá +
  // las de todas las piezas, sin que cada render de pieza tenga que conocer
  // el tema. No toca `{{content_blocks.${CTA-template}}}` del CTA interno:
  // resolveThemeVars exige el sufijo `_mail_general`.
  //
  // Con el fondo desactivado (o activado en pastel), se pisan bg_bannertono/
  // bg_bannerimg/padd_banner ANTES de resolver — así el resto de las
  // variables del tema (colores de texto, tags, etc.) se resuelven igual que
  // siempre, solo estas cambian. Ver bannerThemeVars más arriba.
  const vars = bannerThemeVars(fields, doc.global.tema)
  return resolveThemeVars(html, vars)
}
