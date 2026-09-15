// ============================================================================
// Renderiza un elemento tropicalizado: llama al render que YA existe una vez
// por rama (con los fields de esa rama) más una vez para la base, y las
// envuelve en un `{% if %}...{% elsif %}...{% else %}...{% endif %}` de
// Braze. Ningún render nuevo — todos los `def.render(fields, doc, ctx)` de la
// app son funciones puras, así que "otra rama" es literalmente "el mismo
// render, otros fields".
//
// Camino vacío = la MISMA expresión de siempre (`renderVariant(baseFields)`),
// no una "equivalente" — es lo que hace el invariante byte-idéntico un hecho
// estructural, no una promesa: un documento sin tropicalizaciones no puede
// producir HTML distinto del de antes de esta feature.
//
// Solo concatena strings — nunca `String.replace` — así que texto de usuario
// con `$&`/`$'`/`$$` nunca se reinterpreta (mismo cuidado que
// template/assemble.ts:76 documenta para el resto del pipeline).
// ============================================================================
import type { EmailDocument } from '../model'
import { normalizeBranches, type TropicalizeBranch } from './schema'
import type { TropicalizeKey } from './keys'

/**
 * `${user_id} contains 'AR' or ${user_id} contains 'UY'`.
 *
 * NO pasa por `template/liquidText.ts#toLiquidStringLiteral`: esa función,
 * ante un valor con ambos tipos de comilla, sustituye `'` por `’` — para un
 * código de país eso produciría una condición SINTÁCTICAMENTE VÁLIDA que
 * jamás matchea (un mail mal tropicalizado en silencio). Acá los valores
 * vienen de un enum cerrado de 2 letras mayúsculas (`PREVIEW_COUNTRIES`), así
 * que se prefiere reventar ruidoso ante cualquier otra cosa — mismo criterio
 * "fallar fuerte" del resto de la app.
 */
export function countryCondition(countries: readonly string[]): string {
  if (countries.length === 0) {
    throw new Error('countryCondition: rama sin países — debía haberla filtrado normalizeBranches')
  }
  return countries
    .map((c) => {
      if (!/^[A-Z]{2}$/.test(c)) throw new Error(`countryCondition: país inesperado "${c}"`)
      return `\${user_id} contains '${c}'`
    })
    .join(' or ')
}

/**
 * Los fields de una rama: la base pisada por sus overrides.
 * - Sin overrides devuelve el MISMO objeto (identidad) — el render de esa
 *   rama es entonces byte a byte el de la base.
 * - Una clave de `overrides` que ya no existe en `baseFields` se descarta:
 *   sin este guard, un override viejo (un campo que el schema del target
 *   dejó de tener) podría hacer que `def.render()` reciba un objeto con una
 *   propiedad que no espera y reviente — lo que se llevaría puestos preview
 *   Y export ENTEROS, no solo esta rama.
 */
export function resolveBranchFields<T extends object>(baseFields: T, branch: TropicalizeBranch): T {
  const keys = Object.keys(branch.overrides).filter((k) => k in baseFields)
  if (keys.length === 0) return baseFields
  const next = { ...baseFields } as Record<string, unknown>
  for (const key of keys) next[key] = branch.overrides[key]
  return next as T
}

function branchesForKey(doc: EmailDocument, key: TropicalizeKey): TropicalizeBranch[] {
  return normalizeBranches(doc.tropicalizations[key]?.branches ?? [])
}

/**
 * Renderiza un target tropicalizable. `renderHidden` (default: cadena vacía)
 * es lo que produce una rama marcada `hidden` — components/deals/render.ts lo
 * pisa con `emptyCell` porque ahí una rama vacía no puede ser `''`: el `<td>`
 * tiene que sobrevivir o la fila de 2 celdas se deforma.
 */
export function renderTropicalized<TFields extends object>(
  doc: EmailDocument,
  key: TropicalizeKey,
  baseFields: TFields,
  renderVariant: (fields: TFields) => string,
  renderHidden: () => string = () => '',
): string {
  const branches = branchesForKey(doc, key)
  if (branches.length === 0) return renderVariant(baseFields)

  const parts: string[] = []
  branches.forEach((branch, index) => {
    parts.push(`{% ${index === 0 ? 'if' : 'elsif'} ${countryCondition(branch.countries)} %}`)
    parts.push(branch.hidden ? renderHidden() : renderVariant(resolveBranchFields(baseFields, branch)))
  })
  parts.push('{% else %}')
  parts.push(renderVariant(baseFields))
  parts.push('{% endif %}')
  return parts.join('\n')
}

/**
 * Base + una entrada por rama emitible y no oculta — para decisiones
 * ESTRUCTURALES que se toman antes de elegir rama (hoy: si la fila de
 * legales del par de deals debe existir, ver components/deals/render.ts). No
 * es una función de render: solo fields resueltos, para inspeccionar.
 */
export function fieldVariants<T extends object>(doc: EmailDocument, key: TropicalizeKey, baseFields: T): T[] {
  const branches = branchesForKey(doc, key)
  const variants = branches.filter((b) => !b.hidden).map((b) => resolveBranchFields(baseFields, b))
  return [baseFields, ...variants]
}
