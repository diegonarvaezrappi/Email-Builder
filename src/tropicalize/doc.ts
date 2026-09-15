// ============================================================================
// Transformaciones de EmailDocument que necesita Tropicalizar, aparte del
// render en sí (ver tropicalize/render.ts).
// ============================================================================
import type { EmailDocument } from '../model'
import type { Tropicalizations } from './schema'
import { baseFieldsForKey } from './keys'

/**
 * Descarta toda clave de `tropicalizations` que ya no apunte a nada del
 * documento vivo (el elemento fue eliminado) — se llama DENTRO del mismo
 * `set` que borra un bloque/pieza/tarjeta/molécula (store/store.ts), así que
 * "Deshacer" también restaura las tropicalizaciones que se podaron. Devuelve
 * el MISMO `doc` (no una copia) cuando no hay nada que podar, para no
 * disparar renders de más.
 */
export function pruneTropicalizations(doc: EmailDocument): EmailDocument {
  const keys = Object.keys(doc.tropicalizations)
  const alive = keys.filter((key) => baseFieldsForKey(doc, key) !== null)
  if (alive.length === keys.length) return doc
  const tropicalizations: Tropicalizations = {}
  for (const key of alive) tropicalizations[key] = doc.tropicalizations[key]
  return { ...doc, tropicalizations }
}

/**
 * El documento tal cual se ve en Preview: todas las condicionales resueltas
 * a su `{% else %}` (porque nunca se emiten). Es lo que el LIENZO de la
 * pestaña Tropicalizar renderiza en modo "Diseño base": así todo elemento
 * es siempre seleccionable sin importar qué país esté oculto en qué rama, y
 * el lienzo queda byte a byte el de Preview.
 */
export const withoutTropicalizations = (doc: EmailDocument): EmailDocument => ({ ...doc, tropicalizations: {} })

/**
 * Las claves de `next` que difieren de `base` — lo que una rama guarda como
 * `overrides` (tropicalize/schema.ts). Comparación por `JSON.stringify`: los
 * `PropertiesPanel` arman su `onChange` como `{...value, campo: x}`, que
 * preserva el orden de claves de `value`, así que esto no da falsos
 * positivos en la práctica; si algún día lo hiciera, el resultado es a lo
 * sumo un override redundante con el mismo valor que la base — inofensivo.
 * Una clave con valor `undefined` se saltea (nunca la escribió el panel).
 */
export function diffShallow<T extends object>(base: T, next: T): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const baseRecord = base as Record<string, unknown>
  const nextRecord = next as Record<string, unknown>
  for (const key of Object.keys(nextRecord)) {
    const value = nextRecord[key]
    if (value === undefined) continue
    if (JSON.stringify(value) !== JSON.stringify(baseRecord[key])) out[key] = value
  }
  return out
}

/**
 * Copia la tropicalización de `fromKey` a `toKey` — usada al duplicar un
 * banner item / tarjeta de deal / molécula (todos sin ids propios adentro
 * de `fields`, así que la copia es EXACTA). Para un bloque de CONTENIDOS
 * contenedor (TITLE, DEALS, etc.) la copia es aproximada: los hijos
 * duplicados (moléculas, tarjetas) no heredan sus propias tropicalizaciones
 * — mismo criterio que ya tiene `restoreDealCardPiece`
 * (components/deals/schema.ts): una copia no recuerda lo que el original
 * tenía a un nivel más adentro. Devuelve el MISMO mapa si no había nada que
 * copiar.
 */
export function copyTropicalization(map: Tropicalizations, fromKey: string, toKey: string): Tropicalizations {
  const entry = map[fromKey]
  if (!entry) return map
  return { ...map, [toKey]: entry }
}
