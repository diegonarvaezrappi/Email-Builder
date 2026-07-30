import { toLiquidStringLiteral } from '../../template/liquidText'
import type { CtaFields } from './schema'

/** Nombre del Content Block de Braze que trae el botón real — ver 02-components/03_ctas/cta-template.html. */
export const CTA_CONTENT_BLOCK_NAME = 'CTA-template'

/** Indentación usada por cta-llamado.html — se conserva por consistencia visual. */
const CTA_SNIPPET_INDENT = ' '.repeat(36)

/**
 * Las 4 líneas `{% assign %}` (sin indentar) que fijan cómo se ve/dónde
 * apunta la instancia — mismo criterio que renderFooterAssignLines: se
 * exportan aparte para que preview/liquidPreview.ts pueda reutilizarlas
 * concatenadas directamente con el cuerpo real del content block.
 *
 * `ctaStyle` (el `style_Look`) es GLOBAL — vive en doc.global.ctaStyle, no en
 * `fields` — por eso entra como parámetro aparte, igual que `tema` en
 * renderFooterAssignLines/renderHeaderSnippet.
 */
export function renderCtaAssignLines(fields: CtaFields, ctaStyle: string): string[] {
  return [
    `{% assign cta_alineado = '${fields.align}' %}`,
    `{% assign text_cta = ${toLiquidStringLiteral(fields.text)} %}`,
    `{% assign deeplink_cta = ${toLiquidStringLiteral(fields.deeplink)} %}`,
    `{% assign style_Look = '${ctaStyle}' %}`,
  ]
}

/**
 * Genera el snippet Liquid que instancia un CTA — mismo patrón que
 * renderFooterSnippet: el botón real vive como content block de Braze
 * (`{{content_blocks.${CTA-template}}}`), la app solo emite los `{% assign %}`
 * + la referencia, nunca HTML expandido.
 */
export function renderCtaSnippet(fields: CtaFields, ctaStyle: string): string {
  const lines = [...renderCtaAssignLines(fields, ctaStyle), `{{content_blocks.\${${CTA_CONTENT_BLOCK_NAME}}}}`]
  return lines.map((line) => CTA_SNIPPET_INDENT + line).join('\n')
}
