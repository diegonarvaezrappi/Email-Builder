import { z } from 'zod'
import { DEFAULT_THEME, THEME_SLUGS } from '../themes/themes'

/**
 * Los 9 valores reales de `style_Look` en 02-components/03_ctas/cta-template.html
 * (leído del `{% if/elsif %}` completo). Nota: 'blanconeon' y 'blanco' son
 * ramas byte-idénticas en el archivo real (mismo color/imagen) — no es un bug
 * de esta app, se exponen ambas igual, como ya se hizo con las 10 variantes
 * de Cierre.
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
   */
  ctaStyle: z.enum(CTA_STYLE_VALUES).default('neon'),
})

export type GlobalFields = z.infer<typeof globalSchema>

export const defaultGlobalFields: GlobalFields = globalSchema.parse({})
