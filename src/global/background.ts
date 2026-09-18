// ============================================================================
// Vocabulario compartido de las 3 configuraciones de fondo del mail — General
// (global.fondoUrl), HERO-SECTION y CONTENTS-SECTION — pedido explícito del
// usuario (2026-09-16): las 3 deben poder cambiar tamaño, posición y repeat
// del background-image. Separado de global/schema.ts para que los helpers de
// repeat (puros, sin zod) se puedan testear solos y se reutilicen desde las 3
// secciones de BackgroundSettingsPanel.
// ============================================================================

/**
 * Los 3 valores de `background-size` pedidos explícitamente por el usuario —
 * no es un input libre: cerrado a estos 3, mismo criterio que
 * CTA_STYLE_SELECT_VALUES (global/schema.ts).
 */
export const BACKGROUND_SIZE_VALUES = ['100% auto', '100% 100%', 'cover'] as const

export type BackgroundSize = (typeof BACKGROUND_SIZE_VALUES)[number]

export const BACKGROUND_SIZE_LABELS: Record<BackgroundSize, string> = {
  '100% auto': 'Ajustar al ancho (100% auto)',
  '100% 100%': 'Estirar (100% 100%)',
  cover: 'Cubrir el espacio (cover)',
}

/** Las 9 combinaciones de `background-position` — "todas sus posiciones". */
export const BACKGROUND_POSITION_VALUES = [
  'left top',
  'center top',
  'right top',
  'left center',
  'center center',
  'right center',
  'left bottom',
  'center bottom',
  'right bottom',
] as const

export type BackgroundPosition = (typeof BACKGROUND_POSITION_VALUES)[number]

export const BACKGROUND_POSITION_LABELS: Record<BackgroundPosition, string> = {
  'left top': 'Izquierda arriba',
  'center top': 'Centro arriba',
  'right top': 'Derecha arriba',
  'left center': 'Izquierda centro',
  'center center': 'Centro centro',
  'right center': 'Derecha centro',
  'left bottom': 'Izquierda abajo',
  'center bottom': 'Centro abajo',
  'right bottom': 'Derecha abajo',
}

/**
 * `background-repeat` como los 4 valores reales de CSS. La UI NO expone un
 * select con estos 4 nombres — pedido explícito del usuario: son 3 checkboxes
 * ("Repetir horizontal" / "Repetir vertical" / "No repetir"), ver
 * repeatsX/repeatsY/isNoRepeat + withRepeatX/withRepeatY/withNoRepeat más
 * abajo, que traducen ese trío a/desde este único valor.
 */
export const BACKGROUND_REPEAT_VALUES = ['repeat', 'repeat-x', 'repeat-y', 'no-repeat'] as const

export type BackgroundRepeat = (typeof BACKGROUND_REPEAT_VALUES)[number]

export function repeatsX(value: BackgroundRepeat): boolean {
  return value === 'repeat' || value === 'repeat-x'
}

export function repeatsY(value: BackgroundRepeat): boolean {
  return value === 'repeat' || value === 'repeat-y'
}

export function isNoRepeat(value: BackgroundRepeat): boolean {
  return value === 'no-repeat'
}

/** Tildar/destildar "Repetir horizontal" sin perder el estado del eje vertical. */
export function withRepeatX(value: BackgroundRepeat, checked: boolean): BackgroundRepeat {
  const y = repeatsY(value)
  if (checked) return y ? 'repeat' : 'repeat-x'
  return y ? 'repeat-y' : 'no-repeat'
}

/** Análogo a withRepeatX, para el eje vertical. */
export function withRepeatY(value: BackgroundRepeat, checked: boolean): BackgroundRepeat {
  const x = repeatsX(value)
  if (checked) return x ? 'repeat' : 'repeat-y'
  return x ? 'repeat-x' : 'no-repeat'
}

/**
 * "No repetir" — pedido explícito del usuario como una opción ADICIONAL a los
 * 2 checkboxes de eje, no algo que el usuario deba deducir destildando los 2 a
 * mano. Tildarla fuerza `no-repeat`; destildarla vuelve a `repeat` (los 2 ejes
 * a la vez — el default real de CSS cuando `background-repeat` no se declara).
 */
export function withNoRepeat(checked: boolean): BackgroundRepeat {
  return checked ? 'no-repeat' : 'repeat'
}

/**
 * La imagen que template_base.html trae hardcodeada en HERO-SECTION y
 * CONTENTS-SECTION (ver CLAUDE.md del repo raíz §1.1: "el mismo
 * background-image, para que la pieza se lea continua") — NO es el default de
 * `heroBgUrl`/`contentsBgUrl` (ver global/schema.ts: pedido explícito del
 * usuario 2026-09-18, esos 2 campos arrancan vacíos). Se conserva acá solo
 * como referencia documentada de qué imagen trae el maestro si un usuario
 * quisiera reponerla a mano.
 */
export const DEFAULT_HERO_CONTENTS_BG_URL = 'https://lh3.googleusercontent.com/d/1neHPofSevbcNLyO2pymbZk6QHZSrJO5-'
