import { themeVars } from '../themes/themes'
import type { RichText, RichTextColorMap } from './model'
import { LIQUID_COLOR_TOKENS, renderRichText } from './render'

/** Colores reales del tema activo para la vista previa de RichTextInput — el
 *  HTML final deja `{{color_x_mail_general}}` sin resolver (ver
 *  `richTextHtml`), pero mientras se escribe el usuario necesita ver el color
 *  de verdad. */
export function richTextColorsForTema(tema: string): RichTextColorMap {
  const vars = themeVars(tema)
  return {
    colorBase: vars.color_texto_mail_general ?? '#000000',
    colorAcento1: vars.color_acento1_mail_general ?? '#000000',
    colorAcento2: vars.color_acento2_mail_general ?? '#000000',
  }
}

/** El HTML de un texto enriquecido para el mail: los colores quedan como
 *  tokens Liquid del tema, igual que el resto de cada molécula. */
export function richTextHtml(runs: RichText): string {
  return renderRichText(runs, LIQUID_COLOR_TOKENS)
}
