// ============================================================================
// Modelo de datos de Tropicalizar: condicionales de país por elemento.
//
// Cada rama guarda OVERRIDES parciales (solo las claves que difieren de la
// base), no un snapshot completo de `fields` — la edición típica cambia un
// campo (un copy, una URL), y con un snapshot cualquier cambio posterior en
// la base dejaría de llegar a las ramas (el diseñador tendría que repetirlo
// a mano en cada una, justo lo que esta feature viene a evitar). Al
// renderizar se hace `{...baseFields, ...overrides}` — ver
// tropicalize/render.ts#resolveBranchFields.
//
// Sin `id` de rama: se direccionan por índice (el ORDEN es la precedencia
// if/elsif), mismo criterio que `pieceOrder` en components/deals/schema.ts.
// ============================================================================
import { z } from 'zod'
import { PREVIEW_COUNTRIES } from '../preview/countries'

export const tropicalizeCountrySchema = z.enum(PREVIEW_COUNTRIES)
export type TropicalizeCountry = z.infer<typeof tropicalizeCountrySchema>

/** Tolerante ante un país que David haya retirado de PREVIEW_COUNTRIES: se
 *  descarta ESE país, no el documento entero (mismo espíritu que el resto de
 *  los `z.preprocess` de migración de la app, ej. `ctaStyle` en
 *  global/schema.ts). */
function normalizeCountries(v: unknown): unknown {
  if (!Array.isArray(v)) return []
  return v.filter((c) => (PREVIEW_COUNTRIES as readonly unknown[]).includes(c))
}

function plainObjectOrEmpty(v: unknown): unknown {
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? v : {}
}

export const tropicalizeBranchSchema = z.object({
  countries: z.preprocess(normalizeCountries, z.array(tropicalizeCountrySchema)).default([]),
  /** Rama vacía = el elemento no se muestra en esos países. Gana sobre
   *  `overrides` (conserva el contenido ya escrito, ver PropertiesPanel de
   *  la rama) — decisión explícita del usuario 2026-09-14: "empty branch =
   *  hidden", distinguible de "todavía no la llené". */
  hidden: z.boolean().default(false),
  /** Solo las claves que difieren de la base — ver el comentario del
   *  archivo. `z.record(z.unknown())` a propósito: el tipo real de `fields`
   *  depende del target (bloque/pieza/molécula/slot), que no se conoce a
   *  nivel de schema — `resolveBranchFields` descarta cualquier clave
   *  huérfana al fusionar, así que un override inválido nunca llega a
   *  reventar un `def.render()`. */
  overrides: z.preprocess(plainObjectOrEmpty, z.record(z.string(), z.unknown())).default({}),
})
export type TropicalizeBranch = z.infer<typeof tropicalizeBranchSchema>

export const tropicalizationSchema = z.object({
  branches: z.array(tropicalizeBranchSchema).default([]),
})
export type Tropicalization = z.infer<typeof tropicalizationSchema>

/**
 * Ramas realmente emitibles: descarta las que se quedaron sin países (un
 * `{% if %}` sin condición es un error de parseo de Liquid, no un no-op) y,
 * dentro de una rama, cualquier país que YA apareció en una rama anterior
 * (Liquid `{% elsif %}` es first-match-wins — un país duplicado sería
 * código muerto silencioso). Se aplica en 2 lugares a propósito, igual que
 * `enforceHorizontalItemOrder` (components/banner/horizontalOrder.ts): en el
 * store (para que el panel muestre la verdad) y en el render (red de
 * seguridad para lo que llegue de localStorage o de un import).
 */
export function normalizeBranches(branches: readonly TropicalizeBranch[]): TropicalizeBranch[] {
  const seen = new Set<string>()
  const out: TropicalizeBranch[] = []
  for (const branch of branches) {
    const countries = branch.countries.filter((c) => {
      if (seen.has(c)) return false
      seen.add(c)
      return true
    })
    if (countries.length === 0) continue
    out.push({ ...branch, countries })
  }
  return out
}

/**
 * Cada entrada del mapa se valida SOLA (mismo criterio que
 * `normalizePieceOrder`/persistence.ts: una entrada corrupta se descarta,
 * no se lleva el documento ENTERO). La clave en sí no se valida acá contra
 * `isTropicalizeKey` (tropicalize/keys.ts) a propósito: ese módulo depende
 * de `Selection`, que depende de tipos de model.ts — validar la FORMA de la
 * clave alcanza para no perder datos, y `pruneTropicalizations`
 * (tropicalize/doc.ts) ya descarta cualquier clave que no resuelva contra el
 * documento vivo.
 */
export const tropicalizationsSchema = z
  .preprocess((v) => {
    if (v === null || typeof v !== 'object' || Array.isArray(v)) return {}
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(v as Record<string, unknown>)) {
      const parsed = tropicalizationSchema.safeParse(value)
      if (parsed.success) out[key] = parsed.data
    }
    return out
  }, z.record(z.string(), tropicalizationSchema))
  .default({})
export type Tropicalizations = z.infer<typeof tropicalizationsSchema>
