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
import { themeVars } from '../../themes/themes'
import { bannerShell, ITEMS_MARKER, MOLECULAS_MARKER } from './shell'
import type { BannerFields } from './schema'
import type { BannerItem } from './items/schemas'

/** Token de relleno manual del maestro (no es una variable Liquid), misma
 *  convención que AQUIELLINK# del CTA. Aparece 2 veces por archivo de banner
 *  (href + originalsrc) → replaceAll. */
const BANNER_LINK_PLACEHOLDER = 'AQUIELLINKDELBANNER'

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
  for (const item of items) {
    const def = getBannerItemDef(item.type)
    if (!def || !def.orientations.includes(ctx.bannerType)) continue

    const html = wrapWithBannerItemMarkers(item.type, item.id, def.render(item.fields, doc, ctx))
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
  if (fields.removed) return ''

  const { shell, moleculeTable } = bannerShell(fields.bannerType)
  const ctx: BannerItemRenderCtx = { bannerType: fields.bannerType }

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
  return resolveThemeVars(html, themeVars(doc.global.tema))
}
