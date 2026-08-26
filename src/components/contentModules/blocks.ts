// ============================================================================
// Ubicar el bloque de CONTENIDOS dueño de un item de área libre (una molécula
// de un módulo de body, ver bodyMoleculeRegistry.ts) — mismo espíritu que
// components/deals/blocks.ts (findDealsBlockByCard), un motor más arriba: no
// hay un solo tipo de bloque dueño (hoy TITLE, más adelante Bullet/Beneficios/
// etc.), así que en vez de una lista propia se consulta
// `contentBlockRegistry[block.type]?.usesModuleItems` (ver la nota grande de
// esa interfaz) — una sola fuente de verdad de qué bloques usan este motor.
//
// Vive acá y no en model.ts por el mismo motivo que findDealsBlockByCard vive
// en components/deals/blocks.ts: necesita contentBlockRegistry.ts, que a su
// vez importa components/title/schema.ts → model.ts — meterlo en model.ts
// cerraría un ciclo.
// ============================================================================
import type { ContentBlock } from '../../model'
import { contentBlockRegistry } from '../../contentBlockRegistry'
import type { ModuleItem } from '../../moduleItems/schemas'

export interface ModuleBlockLocation {
  block: ContentBlock
  /** `block.fields.items`, ya angostado a ModuleItem[] — evita que cada call
   *  site vuelva a castear. */
  items: ModuleItem[]
  /** Índice del bloque en doc.contenidos. */
  index: number
}

/** El bloque que contiene ese item, o `null` si ninguno lo tiene (id de un
 *  item ya eliminado, o de otro documento). Los ids de item son únicos en todo
 *  el documento (newId()), así que la primera coincidencia es la única. */
export function findModuleBlockByItem(contenidos: ContentBlock[], itemId: string): ModuleBlockLocation | null {
  for (let index = 0; index < contenidos.length; index++) {
    const block = contenidos[index]
    if (!contentBlockRegistry[block.type]?.usesModuleItems) continue
    const items = (block.fields as { items: ModuleItem[] }).items
    if (items.some((item) => item.id === itemId)) return { block, items, index }
  }
  return null
}
