import { beforeEach, describe, expect, it } from 'vitest'
import { useBuilder } from '../store'
import { defaultEmailDocument } from '../../registry'
import { defaultCtaFields } from '../../components/cta/schema'
import type { CtaBlock } from '../../model'

const ctaBlock = (id: string, text = id): CtaBlock => ({
  id,
  type: 'CTA',
  fields: { text, deeplink: '#', align: 'center' },
})

function setContenidos(blocks: CtaBlock[]) {
  useBuilder.setState({ document: { ...defaultEmailDocument, contenidos: blocks } })
}

function ids(): string[] {
  return useBuilder.getState().document.contenidos.map((b) => b.id)
}

beforeEach(() => {
  setContenidos([])
})

describe('insertContentBlock', () => {
  it('inserts a new CTA block with its default fields', () => {
    useBuilder.getState().insertContentBlock('CTA', 0)
    const contenidos = useBuilder.getState().document.contenidos
    expect(contenidos).toHaveLength(1)
    expect(contenidos[0].type).toBe('CTA')
    expect(contenidos[0].fields).toEqual(defaultCtaFields)
  })

  it('inserts at the start (index 0)', () => {
    setContenidos([ctaBlock('a'), ctaBlock('b')])
    useBuilder.getState().insertContentBlock('CTA', 0)
    expect(ids().slice(1)).toEqual(['a', 'b'])
    expect(ids()[0]).not.toBe('a')
  })

  it('inserts in the middle', () => {
    setContenidos([ctaBlock('a'), ctaBlock('b')])
    useBuilder.getState().insertContentBlock('CTA', 1)
    const [first, middle, last] = ids()
    expect(first).toBe('a')
    expect(last).toBe('b')
    expect(middle).not.toBe('a')
    expect(middle).not.toBe('b')
  })

  it('inserts at the end (index >= length)', () => {
    setContenidos([ctaBlock('a'), ctaBlock('b')])
    useBuilder.getState().insertContentBlock('CTA', 99)
    expect(ids().slice(0, 2)).toEqual(['a', 'b'])
    expect(ids()).toHaveLength(3)
  })

  it('does nothing for an unregistered block type', () => {
    // @ts-expect-error tipo inválido a propósito
    useBuilder.getState().insertContentBlock('NOPE', 0)
    expect(useBuilder.getState().document.contenidos).toHaveLength(0)
  })
})

describe('duplicateContentBlock', () => {
  it('inserts a copy immediately after the original, with a different id but the same fields', () => {
    setContenidos([ctaBlock('a', 'texto original'), ctaBlock('b')])
    useBuilder.getState().duplicateContentBlock('a')
    const contenidos = useBuilder.getState().document.contenidos
    expect(contenidos.map((b) => b.id)[0]).toBe('a')
    expect(contenidos[1].id).not.toBe('a')
    expect(contenidos[1].fields).toEqual(contenidos[0].fields)
    expect(contenidos[2].id).toBe('b')
  })

  it('does nothing for an id that does not exist', () => {
    setContenidos([ctaBlock('a')])
    useBuilder.getState().duplicateContentBlock('does-not-exist')
    expect(useBuilder.getState().document.contenidos).toHaveLength(1)
  })
})

describe('reorderContentBlock', () => {
  // [A,B,C,D] — los 4 casos: mover adelante, mover atrás, extremos.
  it('moves an item forward (A to the position of D)', () => {
    setContenidos([ctaBlock('A'), ctaBlock('B'), ctaBlock('C'), ctaBlock('D')])
    useBuilder.getState().reorderContentBlock('A', 3) // "insertar antes del índice 3 (D)", pre-remoción
    expect(ids()).toEqual(['B', 'C', 'A', 'D'])
  })

  it('moves an item backward (D to the position of A)', () => {
    setContenidos([ctaBlock('A'), ctaBlock('B'), ctaBlock('C'), ctaBlock('D')])
    useBuilder.getState().reorderContentBlock('D', 0)
    expect(ids()).toEqual(['D', 'A', 'B', 'C'])
  })

  it('moves an item to the very end', () => {
    setContenidos([ctaBlock('A'), ctaBlock('B'), ctaBlock('C'), ctaBlock('D')])
    useBuilder.getState().reorderContentBlock('A', 4)
    expect(ids()).toEqual(['B', 'C', 'D', 'A'])
  })

  it('moves a middle item backward past two others', () => {
    setContenidos([ctaBlock('A'), ctaBlock('B'), ctaBlock('C'), ctaBlock('D')])
    useBuilder.getState().reorderContentBlock('C', 0)
    expect(ids()).toEqual(['C', 'A', 'B', 'D'])
  })

  it('is a no-op when dropped back onto its own current position', () => {
    setContenidos([ctaBlock('A'), ctaBlock('B'), ctaBlock('C')])
    useBuilder.getState().reorderContentBlock('B', 1)
    expect(ids()).toEqual(['A', 'B', 'C'])
  })

  it('does nothing for an id that does not exist', () => {
    setContenidos([ctaBlock('A'), ctaBlock('B')])
    useBuilder.getState().reorderContentBlock('does-not-exist', 0)
    expect(ids()).toEqual(['A', 'B'])
  })
})

describe('removeContentBlock', () => {
  it('removes only the targeted block', () => {
    setContenidos([ctaBlock('a'), ctaBlock('b'), ctaBlock('c')])
    useBuilder.getState().removeContentBlock('b')
    expect(ids()).toEqual(['a', 'c'])
  })
})

describe('updateContentBlockFields', () => {
  it('updates only the targeted block, leaving the others untouched', () => {
    setContenidos([ctaBlock('a', 'uno'), ctaBlock('b', 'dos')])
    useBuilder.getState().updateContentBlockFields('a', { text: 'editado', deeplink: '#', align: 'left' })
    const contenidos = useBuilder.getState().document.contenidos
    expect(contenidos[0].fields).toEqual({ text: 'editado', deeplink: '#', align: 'left' })
    expect(contenidos[1].fields.text).toBe('dos')
  })
})
