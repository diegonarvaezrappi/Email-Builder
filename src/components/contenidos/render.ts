import wrapperRaw from '../../assets/templates/contenidos/_contenidos_wrapper.html?raw'
import type { ContentBlock, EmailDocument } from '../../model'
import { contentBlockRegistry } from '../../contentBlockRegistry'
import { wrapWithBlockMarkers } from '../../template/contentBlocks'
import { renderCierreSnippet } from '../cierre/render'
import { elementBounds, indexOfOrThrow, innerBounds } from '../../template/htmlEdits'

const SEPARADOR = '<div class="separador"></div>'

/**
 * Los deals traen su propio espaciado interno (`cellspacing` + el padding de
 * `padd_deal_mail_general`), así que el maestro los exceptúa de la regla del
 * separador: "Antes o después de un deal → NADA (los deals tienen su propio
 * aire)" (05-docs/USO-DE-CADA-PARTE.md, repetido en COMO-ARMAR-UN-MAIL.md y en
 * el visualizador). Es el único tipo de bloque con esta excepción.
 */
const BLOCK_TYPES_WITHOUT_SEPARADOR: ReadonlySet<ContentBlock['type']> = new Set(['DEALS'])

const WRAPPER_FILE_NAME = '_contenidos_wrapper.html'
/** Única en el archivo — el `<td>` del área libre ("MOLECULAS BODY" en el maestro). */
const AREA_TD_ANCHOR = '<td style="padding:0px;margin:0px;border-spacing:0;">'
const HTML_COMMENT_RE = /<!--[\s\S]*?-->/g

/**
 * Concatena los bloques de `doc.contenidos`, en el orden dado, cada uno
 * envuelto en sus comentarios de instancia (ver template/contentBlocks.ts),
 * unidos por un separador — SOLO entre bloques, nunca antes del primero ni
 * después del último. Función pura: no sabe nada de Cierre ni de la tabla que
 * los termina envolviendo (renderContenidosSnippet, más abajo).
 *
 * Excepción de deals: el separador se omite también cuando CUALQUIERA de los dos
 * bloques vecinos es DEALS (ver BLOCK_TYPES_WITHOUT_SEPARADOR).
 */
export function renderContentBlocksSnippet(blocks: ContentBlock[], doc: EmailDocument): string {
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

/**
 * Genera el snippet que reemplaza el marcador "WRAPPER DE CONTENIDOS" del
 * template maestro.
 *
 * Pedido explícito del usuario (2026-08-31): Título, Bullet, CTA, Deals y
 * Beneficios ya no van en tablas hermanas independientes — todos, MÁS Cierre,
 * viven dentro de la ÚNICA tabla que documenta
 * 02-components/04_content-modules/_contenidos_wrapper.html (el archivo que el
 * maestro ya describe como el contenedor real de "los módulos de contenido",
 * hasta ahora sincronizado pero sin usar). Cierre se agrega DESPUÉS de los
 * bloques, dentro del mismo `<td>` — ya trae su propio separador líder (ver
 * 02-components/05_closing/cierre.html, primera línea), así que no hace falta
 * uno adicional acá. El marcador `<!-- CIERRES -->` del maestro queda vacío a
 * propósito: Cierre ya no se planta ahí, ver template/assemble.ts.
 *
 * Vacío entero (sin tabla) si no hay nada que mostrar — ni bloques ni Cierre
 * (removido a mano, tema Pro/ProBlack, o Footer RTS) — mismo criterio que el
 * resto del pipeline: nunca dejar una tabla vacía en el HTML exportado.
 */
export function renderContenidosSnippet(blocks: ContentBlock[], doc: EmailDocument): string {
  const blocksHtml = renderContentBlocksSnippet(blocks, doc)
  const cierreHtml = renderCierreSnippet(doc.cierre, doc)
  const inner = [blocksHtml, cierreHtml].filter((html) => html !== '').join('\n')
  if (inner === '') return ''

  const raw = wrapperRaw.replace(HTML_COMMENT_RE, '')
  const tdIndex = indexOfOrThrow(raw, AREA_TD_ANCHOR, WRAPPER_FILE_NAME)
  const tdBounds = elementBounds(raw, tdIndex + AREA_TD_ANCHOR.length, 'td', WRAPPER_FILE_NAME)
  const areaBounds = innerBounds(raw, tdBounds, 'td', WRAPPER_FILE_NAME)

  return raw.slice(0, areaBounds.start) + inner + raw.slice(areaBounds.end)
}
