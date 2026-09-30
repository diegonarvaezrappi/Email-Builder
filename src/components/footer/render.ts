import footerGeneralRaw from '../../assets/templates/footer_general.html?raw'
import footerSimpleRaw from '../../assets/templates/footer_simple.html?raw'
import footerRtsRaw from '../../assets/templates/footer_rts.html?raw'
import footerB2bRaw from '../../assets/templates/footer_b2b.html?raw'
import { toLiquidStringLiteral, wrapUrlsAsFooterLinks } from '../../template/liquidText'
import { colorFooterForTheme } from '../../themes/themes'
import type { FooterFields, TipoFooter } from './schema'

const FOOTER_RAW_BY_TIPO: Record<TipoFooter, string> = {
  General: footerGeneralRaw,
  SinAmor: footerSimpleRaw,
  RTS: footerRtsRaw,
  B2B: footerB2bRaw,
}

/** Color del texto de los legales si el footer no trae una rama para el estilo (su `{% else %}`). */
const FOOTER_TEXT_COLOR_FALLBACK = '#7D8188'

/**
 * El `color_letra` que el content block asigna para un `font_style_look`: el
 * color con el que pinta los legales, y por eso el que tiene que llevar un link
 * escrito en "Legales adicionales". Se lee del propio footer (no hay una
 * variable de tema equivalente: difiere de `color_texto_mail_general` en varios
 * temas) y no se puede delegar a Braze con `{{color_letra}}`, porque `cond` es
 * un string y Liquid no evalúa lo que viene dentro de una variable.
 */
export function footerTextColor(tipoFooter: TipoFooter, fontStyleLook: string): string {
  const raw = FOOTER_RAW_BY_TIPO[tipoFooter]
  const branch = new RegExp(`font_style_look == '${fontStyleLook}' %\\}\\s*\\{% assign color_letra = '(#[0-9A-Fa-f]{6})' %\\}`).exec(raw)
  const fallback = /\{% else %\}\s*\{% assign color_letra = '(#[0-9A-Fa-f]{6})' %\}/.exec(raw)
  return branch?.[1] ?? fallback?.[1] ?? FOOTER_TEXT_COLOR_FALLBACK
}

/** Nombre del Content Block de Braze a referenciar, según Tipo de Footer. */
export const FOOTER_CONTENT_BLOCK_BY_TIPO: Record<TipoFooter, string> = {
  General: 'FOOTER_q1_2024_legales',
  SinAmor: 'FOOTER_VERSION2',
  RTS: 'FOOTER_RTS_q3_2024_legales',
  B2B: 'FOOTER_ALIADOS',
}

/** Indentación usada por Footer/footer.html — se conserva por consistencia visual. */
export const FOOTER_SNIPPET_INDENT = ' '.repeat(28)

/**
 * font_style_look del footer. Lo define el TEMA, no el footer — ver
 * themes.ts#colorFooterForTheme para el mapa completo (los 7 pasteles +
 * 'pro' tienen su propia rama en footer_general.html/footer_sinamor.html
 * desde el pull ~2026-09-02; problack cae en 'pro', darkneon/darkturbo/
 * darkneutro caen en 'negro').
 *
 * Se emite el valor ya RESUELTO como literal ('negro' / 'pro' / el slug del
 * tema), igual que hace el footer.html del repo. Ojo: NO se puede emitir
 * `{% assign font_style_look = '{{color_footer_mail_general}}' %}` — Liquid no
 * interpola `{{ }}` dentro de un string literal, así que asignaría el texto
 * crudo y no coincidiría con ninguna rama de estilo del content block. Esa
 * variante estuvo en el repo (commits 4499862 y c88b818) y se revirtió en
 * bf7e9eb justamente por eso.
 *
 * Vale igual para los 4 tipos de footer: RTS se forzaba a 'negro' (regla del
 * RTS antiguo), pero desde el 2026-09-17 footer_rts.html se rehízo sobre el
 * diseño del General y trae las mismas ramas por tema — el footer.html del
 * maestro también le pide "variantes por tema".
 */
export function resolveFontStyleLook(tema: string): string {
  return colorFooterForTheme(tema)
}

/**
 * Las 6 líneas `{% assign %}` (sin indentar) que fijan cómo se ve el content
 * block referenciado. Se exportan por separado de `renderFooterSnippet` para
 * que preview/liquidPreview.ts pueda reutilizarlas concatenadas directamente
 * con el cuerpo real del content block (en vez de con la referencia opaca
 * `{{content_blocks.$...}}`, que Liquid no puede resolver en el navegador).
 *
 * `firma` se emite siempre, sin importar el Tipo de Footer — mismo criterio
 * que los 3 `show_legal_*` de abajo, que tampoco se condicionan a RTS: es
 * inofensivo que footer_rts.html reciba un `firma` que no lee.
 */
export function renderFooterAssignLines(fields: FooterFields, tema: string): string[] {
  const fontStyleLook = resolveFontStyleLook(tema)
  const cond = wrapUrlsAsFooterLinks(fields.legalesAdicionales, footerTextColor(fields.tipoFooter, fontStyleLook))
  return [
    `{% assign cond = ${toLiquidStringLiteral(cond)} %}`,
    `{% assign font_style_look = '${fontStyleLook}' %}`,
    `{% assign firma = '${fields.firma}' %}`,
    `{% assign show_legal_tyc = ${fields.legalPromos} %}`,
    `{% assign show_legal_turbo = ${fields.legalTurbo} %}`,
    `{% assign show_legal_liquor = ${fields.legalLicores} %}`,
  ]
}

/**
 * Genera el snippet Liquid+HTML que reemplaza el marcador <!-- FOOTER --> del
 * template maestro. Construcción 100% por string templating (sin DOMParser)
 * para preservar el Liquid exacto — ver decisión de arquitectura en el plan.
 *
 * Emite solo las 6 líneas "limpias" (5 assigns + 1 content_blocks); los
 * comentarios pedagógicos de Footer/footer.html son notas de autor, no
 * forman parte del output generado.
 */
export function renderFooterSnippet(fields: FooterFields, tema: string): string {
  const contentBlockName = FOOTER_CONTENT_BLOCK_BY_TIPO[fields.tipoFooter]
  const lines = [...renderFooterAssignLines(fields, tema), `{{content_blocks.\${${contentBlockName}}}}`]
  return lines.map((line) => FOOTER_SNIPPET_INDENT + line).join('\n')
}
