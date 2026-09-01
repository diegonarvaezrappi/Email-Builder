import { describe, expect, it } from 'vitest'
import { defaultEmailDocument } from '../../../registry'
import type { ContentBlock } from '../../../model'
import { defaultCtaFields } from '../../cta/schema'
import { defaultDealsFields } from '../../deals/schema'
import { defaultCierreFields } from '../../cierre/schema'
import { defaultCol1Fields } from '../../col1/schema'
import { renderContentBlocksSnippet, renderContenidosSnippet } from '../render'

const SEPARADOR = '<div class="separador"></div>'

const cta = (id: string): ContentBlock => ({ id, type: 'CTA', fields: { ...defaultCtaFields, text: id } })
const deals = (id: string): ContentBlock => ({ id, type: 'DEALS', fields: defaultDealsFields })
const col1 = (id: string): ContentBlock => ({ id, type: 'COL1', fields: defaultCol1Fields })

/** Cierre removido a propósito en todos estos casos: son pruebas puras de
 *  cómo se unen los bloques ENTRE SÍ, sin acoplarse a lo que
 *  renderContenidosSnippet le agrega después (ver describe de más abajo). */
const cierreRemovido = { ...defaultCierreFields, removed: true }
const render = (blocks: ContentBlock[]) =>
  renderContentBlocksSnippet(blocks, { ...defaultEmailDocument, contenidos: blocks, cierre: cierreRemovido })
const count = (html: string, literal: string) => html.split(literal).length - 1

describe('renderContentBlocksSnippet · separadores', () => {
  it('pone un separador entre 2 bloques normales, y ninguno en los extremos', () => {
    const html = render([cta('a'), cta('b')])
    expect(count(html, SEPARADOR)).toBe(1)
    expect(html.startsWith(SEPARADOR)).toBe(false)
    expect(html.endsWith(SEPARADOR)).toBe(false)
  })

  it('3 bloques normales = 2 separadores', () => {
    expect(count(render([cta('a'), cta('b'), cta('c')]), SEPARADOR)).toBe(2)
  })

  // "Antes o después de un deal → NADA (los deals tienen su propio aire)"
  // — 05-docs/USO-DE-CADA-PARTE.md, repetido en COMO-ARMAR-UN-MAIL.md.
  it('no pone separador ANTES de un bloque DEALS', () => {
    expect(count(render([cta('a'), deals('d')]), SEPARADOR)).toBe(0)
  })

  it('no pone separador DESPUÉS de un bloque DEALS', () => {
    expect(count(render([deals('d'), cta('a')]), SEPARADOR)).toBe(0)
  })

  it('no pone separador entre 2 bloques DEALS', () => {
    expect(count(render([deals('d1'), deals('d2')]), SEPARADOR)).toBe(0)
  })

  it('sigue poniendo el separador entre los vecinos que NO son deals', () => {
    // CTA | DEALS | CTA | CTA → solo el separador entre los 2 últimos CTA.
    const html = render([cta('a'), deals('d'), cta('b'), cta('c')])
    expect(count(html, SEPARADOR)).toBe(1)
    expect(html.indexOf(SEPARADOR)).toBeGreaterThan(html.indexOf('BLOCK:CTA:b'))
  })

  it('mantiene el orden de doc.contenidos y envuelve cada bloque en sus marcadores', () => {
    const html = render([cta('a'), deals('d'), cta('b')])
    expect(html.indexOf('BLOCK:CTA:a')).toBeLessThan(html.indexOf('BLOCK:DEALS:d'))
    expect(html.indexOf('BLOCK:DEALS:d')).toBeLessThan(html.indexOf('BLOCK:CTA:b'))
    expect(count(html, '<!-- /BLOCK:DEALS:d -->')).toBe(1)
  })

  it('un bloque DEALS lleva adentro los marcadores DCARD de sus tarjetas', () => {
    const html = render([deals('d')])
    for (const card of defaultDealsFields.items) {
      expect(html).toContain(`DCARD:d:${card.id}`)
    }
  })

  it('sin bloques devuelve vacío', () => {
    expect(render([])).toBe('')
  })
})

describe('renderContenidosSnippet · tabla compartida con Cierre', () => {
  // Marcador único del `<td>` de área libre en _contenidos_wrapper.html.
  const WRAPPER_TD = '<td style="padding:0px;margin:0px;border-spacing:0;">'

  const doc = (overrides: Partial<typeof defaultEmailDocument> = {}) => ({ ...defaultEmailDocument, ...overrides })

  it('envuelve los bloques en la tabla de _contenidos_wrapper.html', () => {
    const html = renderContenidosSnippet([cta('a')], doc({ contenidos: [cta('a')], cierre: cierreRemovido }))
    expect(html).toContain(WRAPPER_TD)
    expect(html).toContain('BLOCK:CTA:a')
  })

  it('agrega Cierre DESPUÉS de los bloques, dentro de la misma tabla (no una tabla aparte)', () => {
    const html = renderContenidosSnippet([cta('a')], doc({ contenidos: [cta('a')] }))
    expect(html.indexOf('BLOCK:CTA:a')).toBeLessThan(html.indexOf('alt="RappiFirma"'))
    // Una sola tabla-wrapper (no 2 <table> hermanas): el <td> de área libre
    // aparece una sola vez y contiene tanto el CTA como la firma.
    expect(count(html, WRAPPER_TD)).toBe(1)
  })

  it('no duplica el separador entre el último bloque y Cierre (Cierre ya trae el suyo propio)', () => {
    const html = renderContenidosSnippet([cta('a')], doc({ contenidos: [cta('a')] }))
    const betweenCtaAndCierre = html.slice(html.indexOf('BLOCK:CTA:a'), html.indexOf('alt="RappiFirma"'))
    expect(count(betweenCtaAndCierre, SEPARADOR)).toBe(1)
  })

  it('renderiza solo Cierre, ya envuelto en la tabla, cuando no hay bloques', () => {
    const html = renderContenidosSnippet([], doc({ contenidos: [] }))
    expect(html).toContain(WRAPPER_TD)
    expect(html).toContain('alt="RappiFirma"')
  })

  it('sin bloques y con Cierre oculto (removido a mano) devuelve vacío entero, sin tabla', () => {
    const html = renderContenidosSnippet([], doc({ contenidos: [], cierre: cierreRemovido }))
    expect(html).toBe('')
  })

  it('sin bloques y con Cierre oculto por tema Pro devuelve vacío entero, sin tabla', () => {
    const html = renderContenidosSnippet(
      [],
      doc({ contenidos: [], global: { ...defaultEmailDocument.global, tema: 'pro' } }),
    )
    expect(html).toBe('')
  })

  it('con bloques y Cierre oculto, la tabla sigue apareciendo (solo con los bloques)', () => {
    const html = renderContenidosSnippet([cta('a')], doc({ contenidos: [cta('a')], cierre: cierreRemovido }))
    expect(html).toContain(WRAPPER_TD)
    expect(html).toContain('BLOCK:CTA:a')
    expect(html).not.toContain('alt="RappiFirma"')
  })

  // Pedido explícito del usuario al arrancar la fase 4: confirmar que COL1
  // (el primer módulo nuevo desde el merge de tablas) también queda DENTRO de
  // la misma tabla compartida, no en una tabla hermana aparte.
  it('COL1 (fase 4) también queda dentro de la misma tabla que CTA/DEALS y Cierre', () => {
    const blocks = [cta('a'), col1('c'), deals('d')]
    const html = renderContenidosSnippet(blocks, doc({ contenidos: blocks }))
    expect(count(html, WRAPPER_TD)).toBe(1)
    expect(html).toContain('BLOCK:COL1:c')
    expect(html.indexOf('BLOCK:CTA:a')).toBeLessThan(html.indexOf('BLOCK:COL1:c'))
    expect(html.indexOf('BLOCK:COL1:c')).toBeLessThan(html.indexOf('BLOCK:DEALS:d'))
    expect(html.indexOf('BLOCK:DEALS:d')).toBeLessThan(html.indexOf('alt="RappiFirma"'))
  })
})
