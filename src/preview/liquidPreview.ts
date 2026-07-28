// ============================================================================
// Preview visual del footer (best-effort, NO pixel-perfect Braze). Usa
// LiquidJS para evaluar de verdad el snippet + el cuerpo del content block
// correspondiente, con un país "de mentira" seleccionable — así el usuario ve
// el footer resuelto (textos legales, links, colores) y no un bloque de
// código Liquid crudo.
//
// Esto es una ruta SEPARADA de la exportación/copia (export/exporters.ts),
// que nunca pasa por Liquid — el HTML que se copia/descarga conserva el
// Liquid original intacto.
// ============================================================================
import { Liquid } from 'liquidjs'
import footerGeneralRaw from '../assets/templates/footer_general.html?raw'
import footerRtsRaw from '../assets/templates/footer_rts.html?raw'
import footerSinAmorRaw from '../assets/templates/footer_sinamor.html?raw'
import { renderFooterAssignLines } from '../components/footer/render'
import type { FooterFields, TipoFooter } from '../components/footer/schema'

export const PREVIEW_COUNTRIES = ['AR', 'BR', 'CL', 'CO', 'CR', 'EC', 'MX', 'PE', 'UY'] as const
export type PreviewCountry = (typeof PREVIEW_COUNTRIES)[number]

export const PREVIEW_COUNTRY_LABELS: Record<PreviewCountry, string> = {
  AR: 'Argentina',
  BR: 'Brasil',
  CL: 'Chile',
  CO: 'Colombia',
  CR: 'Costa Rica',
  EC: 'Ecuador',
  MX: 'México',
  PE: 'Perú',
  UY: 'Uruguay',
}

/** Cuerpo real (documentación/referencia) de cada content block de Braze. */
const CONTENT_BLOCK_BODY_BY_TIPO: Record<TipoFooter, string> = {
  General: footerGeneralRaw,
  SinAmor: footerSinAmorRaw,
  RTS: footerRtsRaw,
}

/**
 * Braze reemplaza `${identifier}` por el valor del atributo ANTES de que
 * Liquid corra — no es sintaxis Liquid real, así que LiquidJS no la entiende.
 * En los content blocks de footer aparece en varias formas (algunas de ellas
 * usadas de forma inconsistente entre archivos — footer_rts.html envuelve
 * cada referencia en llaves extra donde footer_general/sinamor no lo hacen):
 *   1. Suelta en un tag:              {% if ${user_id} contains 'BR' %}
 *   2. Con punto, en output:          {{preference_center.${EMAIL_PREFERENCE_CENTER_CO}}}
 *   3. Suelta, en output:             {{${set_user_to_unsubscribed_url}}}
 *   4. Con llaves extra, en un tag:   {% if {{${user_id}}} contains 'BR' %}   (solo footer_rts.html)
 *   5. `$NAME` sin llave interna:     {% assign legal_liquor_img = {{$imgchile}} %}  (bug de autoría, nunca se llega a imprimir)
 * Para el preview (best-effort): los casos con punto (2) son referencias a
 * catálogos/content-blocks de Braze que no podemos resolver en el navegador,
 * así que se stubean con un literal `"#"`. Los demás casos se convierten en
 * una variable Liquid plana; si no se le asigna un valor, Liquid la deja en
 * blanco (no revienta el render). El orden de los reemplazos importa: (4) y
 * (5) deben resolverse antes que (1)/(3), o quedarían llaves `{{ }}` sueltas
 * dentro de la expresión de un tag `{% %}` (Liquid no lo permite).
 */
export function preprocessBrazeShorthand(source: string): string {
  let out = source
  // 2) accesor con punto -> stub opaco
  out = out.replace(/[A-Za-z_]\w*\.\$\{[A-Za-z_]\w*\}/g, '"#"')
  // 4) {{${name}}} usado como condición dentro de un tag (siempre seguido de "contains" en estos archivos)
  out = out.replace(/\{\{\$\{([A-Za-z_]\w*)\}\}\}(\s+contains\b)/g, '$1$2')
  // 5) {{$name}} (sin llave interna) -> variable plana
  out = out.replace(/\{\{\$([A-Za-z_]\w*)\}\}/g, '$1')
  // 1) y 3) ${name} suelto (ya sea solo o dentro de un {{ }} de salida) -> variable plana
  out = out.replace(/\$\{([A-Za-z_]\w*)\}/g, '$1')
  return out
}

let engineSingleton: Liquid | null = null

function getPreviewEngine(): Liquid {
  if (engineSingleton) return engineSingleton
  const engine = new Liquid()
  // No-op: en la fuente real esto aborta el mensaje si user_id no trae un país
  // válido; para el preview siempre elegimos un país válido, así que basta
  // con que el tag no rompa el parseo.
  engine.registerTag('abort_message', {
    parse(tagToken) {
      this.args = tagToken.args
    },
    render() {
      return ''
    },
  })
  engineSingleton = engine
  return engine
}

export interface FooterPreviewResult {
  html: string
  error?: string
}

export async function renderFooterPreview(
  fields: FooterFields,
  country: PreviewCountry,
  tema: string,
): Promise<FooterPreviewResult> {
  const source = [...renderFooterAssignLines(fields, tema), CONTENT_BLOCK_BODY_BY_TIPO[fields.tipoFooter]].join('\n')
  const preprocessed = preprocessBrazeShorthand(source)
  const engine = getPreviewEngine()

  try {
    const html = await engine.parseAndRender(preprocessed, { user_id: country })
    return { html }
  } catch (e) {
    return { html: '', error: e instanceof Error ? e.message : String(e) }
  }
}
