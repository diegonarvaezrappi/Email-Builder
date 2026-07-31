import { describe, expect, it } from 'vitest'
import { resolveDropIndex, resolveDropIndexReadingOrder, type DropRect } from '../dropIndex'

// Una pila de 3 items a todo el ancho, 100px de alto cada uno: A[0,100) B[100,200) C[200,300).
const stack = new Map<string, DropRect>([
  ['A', { top: 0, left: 0, width: 480, height: 100 }],
  ['B', { top: 100, left: 0, width: 480, height: 100 }],
  ['C', { top: 200, left: 0, width: 480, height: 100 }],
])
const order = ['A', 'B', 'C']

describe('resolveDropIndex', () => {
  it('drop above everything -> index 0', () => {
    expect(resolveDropIndex(order, stack, -10)).toBe(0)
  })

  it('drop in the upper half of an item -> before that item', () => {
    expect(resolveDropIndex(order, stack, 120)).toBe(1) // mitad de B (100-150) -> antes de B
  })

  it('drop in the lower half of an item -> after that item (before the next)', () => {
    expect(resolveDropIndex(order, stack, 180)).toBe(2) // 150-200 de B -> antes de C
  })

  it('drop below everything -> order.length', () => {
    expect(resolveDropIndex(order, stack, 1000)).toBe(3)
  })

  it('a missing rect is skipped without throwing', () => {
    const partial = new Map(stack)
    partial.delete('B')
    // dropY=10 cae claramente antes del punto medio de A (50) — el resultado
    // no depende de que B exista o no, solo prueba que buscar su rect
    // faltante no relanza ni corta la búsqueda.
    expect(resolveDropIndex(order, partial, 10)).toBe(0)
  })
})

describe('resolveDropIndexReadingOrder', () => {
  it('for a full-width stack (no shared row), behaves the same as resolveDropIndex', () => {
    expect(resolveDropIndexReadingOrder(order, stack, 0, -10)).toBe(0)
    expect(resolveDropIndexReadingOrder(order, stack, 0, 120)).toBe(1)
    expect(resolveDropIndexReadingOrder(order, stack, 0, 1000)).toBe(3)
  })

  // 2 columnas lado a lado compartiendo la misma banda Y (el banner horizontal:
  // moléculas 0-240px, imagen 240-480px), como en big-banner-horizontal.html.
  const twoColumns = new Map<string, DropRect>([
    ['LEFT', { top: 0, left: 0, width: 240, height: 240 }],
    ['RIGHT', { top: 0, left: 240, width: 240, height: 240 }],
  ])
  const twoColumnsOrder = ['LEFT', 'RIGHT']

  it('within the shared row, decides by X — left half of a column means "before it"', () => {
    expect(resolveDropIndexReadingOrder(twoColumnsOrder, twoColumns, 50, 120)).toBe(0) // mitad izq de LEFT
    expect(resolveDropIndexReadingOrder(twoColumnsOrder, twoColumns, 300, 120)).toBe(1) // mitad izq de RIGHT
  })

  it('a drop past the right half of the last column falls through to the end', () => {
    expect(resolveDropIndexReadingOrder(twoColumnsOrder, twoColumns, 400, 120)).toBe(2)
  })

  it('a drop below the shared row (past its height) falls back to the Y-midpoint rule', () => {
    expect(resolveDropIndexReadingOrder(twoColumnsOrder, twoColumns, 400, 500)).toBe(2)
  })
})
