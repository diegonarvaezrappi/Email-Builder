import type { ContentBlock, EmailDocument } from '../../model'
import { contentBlockRegistry } from '../../contentBlockRegistry'
import { wrapWithBlockMarkers } from '../../template/contentBlocks'

const SEPARADOR = '<div class="separador"></div>'

/**
 * Los deals traen su propio espaciado interno (`cellspacing` + el padding de
 * `padd_deal_mail_general`), así que el maestro los exceptúa de la regla del
 * separador: "Antes o después de un deal → NADA (los deals tienen su propio
 * aire)" (05-docs/USO-DE-CADA-PARTE.md, repetido en COMO-ARMAR-UN-MAIL.md y en
 * el visualizador). Es el único tipo de bloque con esta excepción.
 */
const BLOCK_TYPES_WITHOUT_SEPARADOR: ReadonlySet<ContentBlock['type']> = new Set(['DEALS'])

/**
 * Genera el snippet que reemplaza el marcador "WRAPPER DE CONTENIDOS" del
 * template maestro: cada bloque, en el orden de doc.contenidos, envuelto en
 * sus comentarios de instancia (ver template/contentBlocks.ts), unidos por un
 * separador — SOLO entre bloques, nunca antes del primero ni después del
 * último (así queda la regla documentada: "entre un contenido y otro se debe
 * insertar un div separador", y de paso la excepción "si justo debajo va el
 * cierre, no va separador" sale gratis, sin acoplarse a Cierre).
 *
 * Excepción de deals: el separador se omite también cuando CUALQUIERA de los dos
 * bloques vecinos es DEALS (ver BLOCK_TYPES_WITHOUT_SEPARADOR).
 */
export function renderContenidosSnippet(blocks: ContentBlock[], doc: EmailDocument): string {
  const rendered = blocks
    .map((block) => {
      const def = contentBlockRegistry[block.type]
      if (!def) return null
      return { type: block.type, html: wrapWithBlockMarkers(block.type, block.id, def.render(block.fields, doc, { blockId: block.id })) }
    })
    .filter((entry): entry is { type: ContentBlock['type']; html: string } => entry !== null && entry.html !== '')

  return rendered.reduce((out, entry, index) => {
    if (index === 0) return entry.html
    const previous = rendered[index - 1]
    const separador =
      BLOCK_TYPES_WITHOUT_SEPARADOR.has(entry.type) || BLOCK_TYPES_WITHOUT_SEPARADOR.has(previous.type) ? '' : `${SEPARADOR}\n`
    return `${out}\n${separador}${entry.html}`
  }, '')
}
