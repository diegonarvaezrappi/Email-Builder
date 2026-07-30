import type { ContentBlock, EmailDocument } from '../../model'
import { contentBlockRegistry } from '../../contentBlockRegistry'
import { wrapWithBlockMarkers } from '../../template/contentBlocks'

const SEPARADOR = '<div class="separador"></div>'

/**
 * Genera el snippet que reemplaza el marcador "WRAPPER DE CONTENIDOS" del
 * template maestro: cada bloque, en el orden de doc.contenidos, envuelto en
 * sus comentarios de instancia (ver template/contentBlocks.ts), unidos por un
 * separador — SOLO entre bloques, nunca antes del primero ni después del
 * último (así queda la regla documentada: "entre un contenido y otro se debe
 * insertar un div separador", y de paso la excepción "si justo debajo va el
 * cierre, no va separador" sale gratis, sin acoplarse a Cierre).
 */
export function renderContenidosSnippet(blocks: ContentBlock[], doc: EmailDocument): string {
  const rendered = blocks
    .map((block) => {
      const def = contentBlockRegistry[block.type]
      if (!def) return ''
      return wrapWithBlockMarkers(block.type, block.id, def.render(block.fields, doc))
    })
    .filter((snippet) => snippet !== '')

  return rendered.join(`\n${SEPARADOR}\n`)
}
