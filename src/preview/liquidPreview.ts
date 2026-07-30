// ============================================================================
// Preview visual del email COMPLETO (best-effort, NO pixel-perfect Braze).
//
// Parte del mismo HTML que se copia/descarga (template/assemble.ts) y solo le
// hace lo que Braze haría al enviar: pega el cuerpo del content block de
// legales referenciado y evalúa el Liquid con LiquidJS, con un país "de
// mentira" seleccionable. Así el preview es literalmente el HTML exportado
// resuelto — mismo ancho, mismos paddings, mismo fondo — y no una maqueta
// aparte que puede mentir (antes se renderizaba un iframe por componente, y el
// header salía descentrado justamente porque le faltaba el
// `role="paddedcontainer"` de 15px del maestro).
//
// La exportación/copia NO pasa por acá: conserva el Liquid original intacto.
// ============================================================================
import { Liquid } from 'liquidjs'
import footerGeneralRaw from '../assets/templates/footer_general.html?raw'
import footerRtsRaw from '../assets/templates/footer_rts.html?raw'
import footerSinAmorRaw from '../assets/templates/footer_sinamor.html?raw'
import ctaTemplateRaw from '../assets/templates/cta-template.html?raw'
import { FOOTER_CONTENT_BLOCK_BY_TIPO } from '../components/footer/render'
import type { TipoFooter } from '../components/footer/schema'
import { CTA_CONTENT_BLOCK_NAME } from '../components/cta/render'
import type { EmailDocument } from '../model'
import { assembleEmailHtml } from '../template/assemble'

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

/**
 * Reemplaza TODAS las apariciones de una referencia opaca a content block por
 * su cuerpo real. Función como reemplazo (no un string) para que `$`-patterns
 * del cuerpo real ($&, $$, etc.) nunca se interpreten como sintaxis especial
 * de String.replaceAll. `replaceAll` (no `replace`) porque un mismo content
 * block puede aparecer más de una vez — Footer siempre aparece 1 sola vez,
 * pero CTA puede aparecer 0 a N (una por instancia en doc.contenidos).
 */
function inlineAllContentBlockOccurrences(html: string, reference: string, body: string): string {
  return html.replaceAll(reference, () => body)
}

/**
 * Pega el cuerpo del content block de legales donde el HTML exportado solo
 * lleva la referencia opaca `{{content_blocks.${NOMBRE}}}` — es lo que hace
 * Braze al enviar. Tiene que correr ANTES de preprocessBrazeShorthand: esa
 * función stubea cualquier `algo.${...}` a `"#"`, así que si el orden se
 * invirtiera el footer desaparecería del preview.
 */
export function inlineFooterContentBlock(html: string, tipoFooter: TipoFooter): string {
  const reference = `{{content_blocks.\${${FOOTER_CONTENT_BLOCK_BY_TIPO[tipoFooter]}}}}`
  return inlineAllContentBlockOccurrences(html, reference, CONTENT_BLOCK_BODY_BY_TIPO[tipoFooter])
}

/**
 * Igual que inlineFooterContentBlock, pero para el content block de CTA — acá
 * SÍ importa el `replaceAll`: puede haber 0 a N instancias de CTA en el mail.
 *
 * A diferencia de Footer, acá el orden respecto a preprocessBrazeShorthand no
 * es estrictamente obligatorio: `CTA-template` tiene un guion, y las regexes
 * de esa función (que usan `\w*`, sin guion) nunca matchean `${CTA-template}`
 * — así que preprocessBrazeShorthand la deja intacta la toque antes o
 * después. Se llama en el mismo orden que Footer de todos modos, por
 * consistencia (y porque un futuro content block sin guion en el nombre sí
 * tendría el mismo riesgo de stub silencioso que Footer).
 */
export function inlineCtaContentBlock(html: string): string {
  const reference = `{{content_blocks.\${${CTA_CONTENT_BLOCK_NAME}}}}`
  return inlineAllContentBlockOccurrences(html, reference, ctaTemplateRaw)
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

export interface EmailPreviewResult {
  html: string
  error?: string
}

/**
 * El email entero, resuelto y listo para meter en un <iframe>: exactamente el
 * HTML que se exporta, con los content blocks pegados y el Liquid evaluado.
 * No se le agrega NADA de estilo propio de la app — el fondo, el ancho de
 * 600px y los márgenes salen del maestro, igual que en Gmail.
 *
 * NOTA: la simulación de cliente de correo (Claro/Oscuro) no vive acá — la
 * inyecta ui/Viewport.tsx como un <style> en el DOM del iframe. Este HTML es
 * el del mail y nada más, así que se puede comparar contra el exportado.
 */
export async function renderEmailPreview(
  doc: EmailDocument,
  country: PreviewCountry,
): Promise<EmailPreviewResult> {
  try {
    let withContentBlocks = inlineFooterContentBlock(assembleEmailHtml(doc), doc.footer.tipoFooter)
    withContentBlocks = inlineCtaContentBlock(withContentBlocks)
    const preprocessed = preprocessBrazeShorthand(withContentBlocks)
    const html = await getPreviewEngine().parseAndRender(preprocessed, { user_id: country })
    return { html }
  } catch (e) {
    return { html: '', error: e instanceof Error ? e.message : String(e) }
  }
}
