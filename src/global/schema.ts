import { z } from 'zod'
import { DEFAULT_THEME, THEME_SLUGS } from '../themes/themes'

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
})

export type GlobalFields = z.infer<typeof globalSchema>

export const defaultGlobalFields: GlobalFields = globalSchema.parse({})
