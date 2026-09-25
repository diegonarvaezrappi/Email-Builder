import { toLiquidStringLiteral } from '../../template/liquidText'
import { CTA_LINK_PLACEHOLDER, linkOrPlaceholder } from '../../template/linkPlaceholders'
import type { CtaFields } from './schema'
import type { TipoFooter } from '../footer/schema'

/** Nombre del Content Block de Braze que trae el botón real — ver 02-components/03_ctas/cta-template.html. */
export const CTA_CONTENT_BLOCK_NAME = 'CTA-template'

/**
 * El content block del CTA depende de para quién va el mail, y eso lo dice el
 * footer (02-components/03_ctas/cta-llamado.html y 06_footer/footer.html):
 * usuarios (General/Simple) → CTA-template, RTS → CTA_Q4_2024, B2B
 * (Restaurantes) → cta_general. Se deriva al generar el HTML, así que cambiar
 * el footer cambia todos los CTA del mail en el acto.
 */
export const CTA_CONTENT_BLOCK_BY_FOOTER: Record<TipoFooter, string> = {
  General: CTA_CONTENT_BLOCK_NAME,
  SinAmor: CTA_CONTENT_BLOCK_NAME,
  RTS: 'CTA_Q4_2024',
  B2B: 'cta_general',
}

/** Indentación usada por cta-llamado.html — se conserva por consistencia visual. */
const CTA_SNIPPET_INDENT = ' '.repeat(36)

/**
 * Las 5 líneas `{% assign %}` (sin indentar) que fijan cómo se ve/dónde
 * apunta la instancia — mismo criterio que renderFooterAssignLines: se
 * exportan aparte para que preview/liquidPreview.ts pueda reutilizarlas
 * concatenadas directamente con el cuerpo real del content block. Mismo
 * orden que cta-llamado.html: cta_alineado, cta_size, text_cta,
 * deeplink_cta, style_Look.
 *
 * `ctaStyle` (el `style_Look`) es GLOBAL — vive en doc.global.ctaStyle, no en
 * `fields` — por eso entra como parámetro aparte, igual que `tema` en
 * renderFooterAssignLines/renderHeaderSnippet.
 */
export function renderCtaAssignLines(fields: CtaFields, ctaStyle: string): string[] {
  return [
    `{% assign cta_alineado = '${fields.align}' %}`,
    `{% assign cta_size = '${fields.size}' %}`,
    `{% assign text_cta = ${toLiquidStringLiteral(fields.text)} %}`,
    // Sin link del usuario va el marcador, que assembleEmailHtml numera
    // después (AQUIELLINKDELCTA1, …2) — ver template/linkPlaceholders.ts.
    `{% assign deeplink_cta = ${toLiquidStringLiteral(linkOrPlaceholder(fields.deeplink, CTA_LINK_PLACEHOLDER))} %}`,
    `{% assign style_Look = '${ctaStyle}' %}`,
  ]
}

/**
 * Genera el snippet Liquid que instancia un CTA — mismo patrón que
 * renderFooterSnippet: el botón real vive como content block de Braze
 * (`{{content_blocks.${CTA-template}}}`), la app solo emite los `{% assign %}`
 * + la referencia, nunca HTML expandido.
 */
export function renderCtaSnippet(fields: CtaFields, ctaStyle: string, tipoFooter: TipoFooter): string {
  const contentBlock = CTA_CONTENT_BLOCK_BY_FOOTER[tipoFooter]
  const lines = [...renderCtaAssignLines(fields, ctaStyle), `{{content_blocks.\${${contentBlock}}}}`]
  return lines.map((line) => CTA_SNIPPET_INDENT + line).join('\n')
}
