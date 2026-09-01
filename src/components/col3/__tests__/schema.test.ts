import { describe, expect, it } from 'vitest'
import { cloneCol3Fields, createDefaultCol3Fields, defaultCol3Fields } from '../schema'

describe('defaultCol3Fields', () => {
  it('has 3 cells, each with its own factory image URL (the master ships a different one per cell)', () => {
    expect(defaultCol3Fields.cells).toHaveLength(3)
    expect(defaultCol3Fields.cells.map((c) => c.image.imageUrl)).toEqual([
      'https://lh3.googleusercontent.com/d/1GvgYi4hdEYq1b71GrXp-UVfidhkEVeE1?v1',
      'https://lh3.googleusercontent.com/d/1c5vhJ8Hvr-weWRB5n3xKICSbou2mrcxd?v1',
      'https://lh3.googleusercontent.com/d/1Ff8AXjzhjsXyBrUwk4S4A02gjOpAg3a0?v1',
    ])
  })

  it('every cell ships border-radius/backgroundEnabled/linkEnabled OFF by default (matches the master, no radius / no Sinfondo override / no <a> shown)', () => {
    for (const cell of defaultCol3Fields.cells) {
      expect(cell.image.borderRadiusEnabled).toBe(false)
      expect(cell.backgroundEnabled).toBe(false)
      expect(cell.linkEnabled).toBe(false)
    }
  })

  it('reproduces the master default literally in every cell: icono + separador + texto corto, in that order', () => {
    for (const areaKey of ['cell1', 'cell2', 'cell3']) {
      const cellItems = defaultCol3Fields.items.filter((it) => it.areaKey === areaKey)
      expect(cellItems.map((it) => it.type)).toEqual(['ICONO', 'SEPARADOR', 'COLUMNA_TEXTO'])
    }
  })

  it('the 3 icons share the same factory URL (identical across cells in the master, unlike the bottom image)', () => {
    const icons = defaultCol3Fields.items.filter((it) => it.type === 'ICONO')
    expect(icons).toHaveLength(3)
    for (const icon of icons) {
      expect((icon.fields as { imageUrl: string }).imageUrl).toBe('https://lh3.googleusercontent.com/d/13Wpazp2ezX37GZylmssneVLoF0fxq2yi')
    }
  })

  it('has fixed, literal item ids (deterministic, not newId())', () => {
    expect(new Set(defaultCol3Fields.items.map((it) => it.id)).size).toBe(9)
    expect(defaultCol3Fields.items.every((it) => it.id.startsWith('col3-item-'))).toBe(true)
  })

  it('align defaults to left, a single module-level field (not per cell)', () => {
    expect(defaultCol3Fields.align).toBe('left')
  })
})

describe('createDefaultCol3Fields', () => {
  it('generates fresh ids on every call, so 2 inserted blocks never collide', () => {
    const a = createDefaultCol3Fields()
    const b = createDefaultCol3Fields()
    const aIds = a.items.map((it) => it.id)
    const bIds = b.items.map((it) => it.id)
    expect(new Set([...aIds, ...bIds]).size).toBe(18)
  })

  it('does not reuse defaultCol3Fields\' fixed ids', () => {
    const fresh = createDefaultCol3Fields()
    const fixedIds = new Set(defaultCol3Fields.items.map((it) => it.id))
    for (const item of fresh.items) expect(fixedIds.has(item.id)).toBe(false)
  })

  it('still ships the same 3 distinct per-cell image URLs', () => {
    const fresh = createDefaultCol3Fields()
    expect(fresh.cells.map((c) => c.image.imageUrl)).toEqual(defaultCol3Fields.cells.map((c) => c.image.imageUrl))
  })
})

describe('cloneCol3Fields', () => {
  it('preserves user field values (incl. per-cell fields) but regenerates every item id', () => {
    const original = createDefaultCol3Fields()
    original.cells[1] = { ...original.cells[1], backgroundEnabled: true, linkEnabled: true, link: 'https://x.test/c2' }
    const clone = cloneCol3Fields(original)

    expect(clone.cells[1]).toEqual({ ...original.cells[1] })
    expect(clone.items.map((it) => it.id)).not.toEqual(original.items.map((it) => it.id))
    expect(clone.items.map((it) => `${it.areaKey}:${it.type}`)).toEqual(original.items.map((it) => `${it.areaKey}:${it.type}`))
    expect(new Set(clone.items.map((it) => it.id)).size).toBe(9)
  })
})
