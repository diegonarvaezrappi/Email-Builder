import { z } from 'zod'
import { DEFAULT_THEME, THEME_SLUGS } from '../themes/themes'

/**
 * Los 15 valores reales de `style_Look` en 02-components/03_ctas/cta-template.html
 * (leído del `{% if/elsif %}` completo). Nota: 'blanconeon' y 'blanco' son
 * ramas byte-idénticas en el archivo real (mismo color/imagen) — no es un bug
 * de esta app, se exponen ambas igual, como ya se hizo con las 10 variantes
 * de Cierre. Las últimas 6 (gris100…celeste100) se agregaron en el pull del
 * 2026-09-02 ("actualización del cta") — coinciden 1:1 con el slug de 6 de
 * los 7 temas pastel (todos menos verde100, que no tiene variante propia de
 * `style_Look` — ver STYLE_LOOK_FOR_THEME en themeDefaults.ts).
 */
export const CTA_STYLE_VALUES = [
  'neon',
  'blanconeon',
  'blanco',
  'negroneon',
  'verde',
  'problack',
  'pro',
  'blancogris',
  'negrogris',
  'gris100',
  'beige100',
  'beige150',
  'rosa100',
  'purpura100',
  'celeste100',
] as const

export type CtaStyle = (typeof CTA_STYLE_VALUES)[number]

export const CTA_STYLE_LABELS: Record<CtaStyle, string> = {
  neon: 'Neon (rojo Rappi)',
  blanconeon: 'Blanco neon',
  blanco: 'Blanco',
  negroneon: 'Negro neon',
  verde: 'Verde',
  problack: 'ProBlack',
  pro: 'Pro',
  blancogris: 'Blanco gris',
  negrogris: 'Negro gris',
  gris100: 'Gris 100',
  beige100: 'Beige 100',
  beige150: 'Beige 150',
  rosa100: 'Rosa 100',
  purpura100: 'Púrpura 100',
  celeste100: 'Celeste 100',
}

/**
 * Valor real de `global.ctaStyle` en el documento: el sentinel `'default'`
 * delante de los 15 estilos reales de arriba. `'default'` NO es un
 * `style_Look` que exista en cta-template.html — significa "seguir al tema
 * actual", resuelto recién al renderizar (ver themeDefaults.ts#resolveCtaStyle).
 * Reemplaza el mecanismo anterior de "pisar mientras el usuario no lo haya
 * tocado a mano": ahora es un valor EXPLÍCITO que el usuario puede volver a
 * elegir en cualquier momento, y cualquier otro valor del select queda fijo
 * pase lo que pase con el tema (pedido explícito del usuario).
 */
export const CTA_STYLE_SELECT_VALUES = ['default', ...CTA_STYLE_VALUES] as const

export type CtaStyleSelect = (typeof CTA_STYLE_SELECT_VALUES)[number]

export const CTA_STYLE_SELECT_LABELS: Record<CtaStyleSelect, string> = {
  default: 'Default',
  ...CTA_STYLE_LABELS,
}

/**
 * Ajustes que afectan a TODO el email (no a un componente puntual). Hoy solo
 * el tema; acá entrarán los demás globales cuando se implementen más slots.
 *
 * `tema` se valida contra los temas que realmente existen en el repo (no una
 * lista fija): así un documento guardado en localStorage que apunte a un tema
 * que David borró se descarta al cargar en vez de generar Liquid roto.
 */
export const globalSchema = z.object({
  tema: z
    .string()
    .refine((s) => THEME_SLUGS.includes(s), { message: 'Tema desconocido (no existe en head-meta-tags.html)' })
    .default(DEFAULT_THEME),

  /**
   * Imagen de fondo del mail: alimenta `bg_imgevento_mail_general`, la variable
   * del `<td class="fondomobile">` del maestro. Es la única variable
   * `_mail_general` que el repo referencia pero ningún tema asigna, así que sin
   * esto siempre sale vacía. Vacío = sin fondo (el comportamiento de hoy).
   *
   * Se acepta cualquier texto (una URL, o Liquid como
   * `{{content_blocks.${...}}}`); lo que rompería el `url(...)` se escapa al
   * generar — ver cssUrlValue en global/vars.ts.
   */
  fondoUrl: z.string().default(''),

  /**
   * `style_Look` del content block CTA-template — GLOBAL a propósito (pedido
   * explícito del usuario): un solo control, todas las instancias de CTA lo
   * leen al renderizar, así que cambiar el estilo en cualquier lado cambia
   * TODOS los CTA del mail a la vez. Ver components/cta/render.ts.
   *
   * Default es `'default'` (no un `style_Look` real): así el CTA sigue al
   * tema general hasta que el usuario elija un color específico a mano — ver
   * themeDefaults.ts#resolveCtaStyle, que resuelve el sentinel al momento de
   * renderizar.
   */
  ctaStyle: z.enum(CTA_STYLE_SELECT_VALUES).default('default'),
})

export type GlobalFields = z.infer<typeof globalSchema>

export const defaultGlobalFields: GlobalFields = globalSchema.parse({})
