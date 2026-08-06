import { describe, expect, it } from 'vitest'
import { defaultEmailDocument } from '../../../registry'
import type { ContentBlock } from '../../../model'
import { defaultCtaFields } from '../../cta/schema'
import { defaultDealsFields } from '../../deals/schema'
import { renderContenidosSnippet } from '../render'

const SEPARADOR = '<div class="separador"></div>'

const cta = (id: string): ContentBlock => ({ id, type: 'CTA', fields: { ...defaultCtaFields, text: id } })
const deals = (id: string): ContentBlock => ({ id, type: 'DEALS', fields: defaultDealsFields })

const render = (blocks: ContentBlock[]) => renderContenidosSnippet(blocks, { ...defaultEmailDocument, contenidos: blocks })
const count = (html: string, literal: string) => html.split(literal).length - 1

describe('renderContenidosSnippet · separadores', () => {
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
