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
})

export type GlobalFields = z.infer<typeof globalSchema>

export const defaultGlobalFields: GlobalFields = globalSchema.parse({})
