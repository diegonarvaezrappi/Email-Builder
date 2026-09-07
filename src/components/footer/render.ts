import { toLiquidStringLiteral, wrapUrlsAsFooterLinks } from '../../template/liquidText'
import { colorFooterForTheme } from '../../themes/themes'
import type { FooterFields, TipoFooter } from './schema'

/** Nombre del Content Block de Braze a referenciar, según Tipo de Footer. */
export const FOOTER_CONTENT_BLOCK_BY_TIPO: Record<TipoFooter, string> = {
  General: 'FOOTER_q1_2024_legales',
  SinAmor: 'FOOTER_VERSION2',
  RTS: 'FOOTER_RTS_q3_2024_legales',
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
 * Excepción: con Tipo de Footer = RTS se fuerza 'negro' sin importar el tema
 * (regla heredada de Referencias/instrucciones.md, sección B.5).
 */
export function resolveFontStyleLook(tema: string, tipoFooter: TipoFooter): string {
  if (tipoFooter === 'RTS') return 'negro'
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
  const fontStyleLook = resolveFontStyleLook(tema, fields.tipoFooter)
  const cond = wrapUrlsAsFooterLinks(fields.legalesAdicionales)
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
