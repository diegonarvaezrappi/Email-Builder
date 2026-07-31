// ============================================================================
// Lógica de tamaño por longitud de texto — verificada línea por línea contra
// 01-foundations/global-styles/head-meta-tags.html (bloque "Variables de largo
// de texto"). Ese bloque completo vive dentro de un comentario HTML (todo
// head-meta-tags.html es un `<!-- ... -->`), así que ese Liquid nunca corre en
// Braze — implementarlo acá en TS no duplica lógica muerta, la hace vivir por
// primera vez, tal como pidió el usuario ("aplica toda la logica que hay en
// el liquid, pero deja el output limpio de esa logica liquid").
//
// Regla idéntica para PROMO/CREDITOS/TEXTOXL (solo cambian los nombres de
// variable destino, no el umbral ni los valores) — una sola función.
// ============================================================================
import type { BannerType } from '../schema'

export const LIVE_TEXT_LENGTH_THRESHOLD = 4

export interface LiveTextSizing {
  className: string
  fontSize: string
  lineHeight: string
}

/**
 * `.size` de Liquid sobre un String cuenta caracteres (no unidades UTF-16) —
 * [...text].length en vez de text.length para calzar con eso frente a
 * caracteres fuera del plano básico (emoji, etc.).
 */
function charCount(text: string): number {
  return [...text].length
}

/** class/fontsize/lineheight de PROMO ("prom_class", ojo el nombre real no
 *  lleva la "o"), CREDITOS y TEXTOXL — mismo umbral y valores para las 3. */
export function liveTextSizing(text: string, bannerType: BannerType): LiveTextSizing {
  const long = charCount(text) > LIVE_TEXT_LENGTH_THRESHOLD
  if (bannerType === 'vertical') {
    return long
      ? { className: 'bnr-lg', fontSize: '62px', lineHeight: '62px' }
      : { className: 'bnr-xl', fontSize: '125px', lineHeight: '125px' }
  }
  return long
    ? { className: 'bnr-lg', fontSize: '35px', lineHeight: '35px' }
    : { className: 'bnr-xl', fontSize: '80px', lineHeight: '80px' }
}

/** El label "Ahora" que acompaña a PROMO usa el MISMO umbral que promoText,
 *  con su propia escala de clase/tamaño (más chica cuanto más grande es el
 *  monto, para que el conjunto siga cabiendo). */
export function ahoraSizing(promoText: string, bannerType: BannerType): LiveTextSizing {
  const long = charCount(promoText) > LIVE_TEXT_LENGTH_THRESHOLD
  if (bannerType === 'vertical') {
    return long
      ? { className: 'bnr-hasta-lg', fontSize: '15px', lineHeight: '15px' }
      : { className: 'bnr-hasta-xl', fontSize: '25px', lineHeight: '25px' }
  }
  return long
    ? { className: 'bnr-hasta-lg', fontSize: '10px', lineHeight: '10px' }
    : { className: 'bnr-hasta-xl', fontSize: '19px', lineHeight: '19px' }
}

/**
 * Arma el mapa `{{var}}` -> valor para una tripleta class/fontsize/lineheight.
 * Nombres explícitos (no un prefijo compartido) porque el nombre real de la
 * variable de clase de PROMO es irregular en el maestro: "prom_class", no
 * "promo_class" como el resto — confirmado en el archivo real. Solo
 * fontsize/lineheight llevan el sufijo `_vertical`; el nombre de la clase es
 * el mismo en las 2 orientaciones.
 */
export function sizingVars(
  names: { classVar: string; fontsizeVar: string; lineheightVar: string },
  sizing: LiveTextSizing,
  bannerType: BannerType,
): Record<string, string> {
  const suffix = bannerType === 'vertical' ? '_vertical' : ''
  return {
    [names.classVar]: sizing.className,
    [`${names.fontsizeVar}${suffix}`]: sizing.fontSize,
    [`${names.lineheightVar}${suffix}`]: sizing.lineHeight,
  }
}
