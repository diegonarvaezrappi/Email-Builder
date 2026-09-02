import { describe, expect, it } from 'vitest'
import {
  cloneCuponesFields,
  createDefaultCuponCellFields,
  createDefaultCuponesFields,
  createDefaultTituloCellFields,
  defaultCuponesFields,
} from '../schema'

describe('defaultCuponesFields', () => {
  it('has exactly 2 cells, both type "cupon" (matches the master\'s pristine file)', () => {
    expect(defaultCuponesFields.cells).toHaveLength(2)
    expect(defaultCuponesFields.cells.every((c) => c.type === 'cupon')).toBe(true)
  })

  it('every cell ships borderRadiusEnabled/linkEnabled/legalEnabled OFF by default', () => {
    for (const cell of defaultCuponesFields.cells) {
      if (cell.type !== 'cupon') throw new Error('expected cupon cell')
      expect(cell.borderRadiusEnabled).toBe(false)
      expect(cell.linkEnabled).toBe(false)
      expect(cell.legalEnabled).toBe(false)
    }
  })

  it('has no backgroundEnabled/align field at all (fondo/alineado are not toggleable in this module)', () => {
    expect(defaultCuponesFields).not.toHaveProperty('backgroundEnabled')
    expect(defaultCuponesFields).not.toHaveProperty('align')
    expect(defaultCuponesFields.cells[0]).not.toHaveProperty('backgroundEnabled')
  })

  it('reproduces the master default literally in every cell: texto+pastilla, texto destacado, separador, mini-bullet', () => {
    for (const areaKey of ['cell1', 'cell2']) {
      const cellItems = defaultCuponesFields.items.filter((it) => it.areaKey === areaKey)
      expect(cellItems.map((it) => it.type)).toEqual(['TEXTO_PASTILLA', 'CUPON_MONTO', 'SEPARADOR', 'BULLET_ICONO_SIMPLE'])
    }
  })

  it('the TEXTO_PASTILLA default reproduces the master\'s "Solo en"/"Restaurantes", pill on the left', () => {
    const pastillas = defaultCuponesFields.items.filter((it) => it.type === 'TEXTO_PASTILLA')
    expect(pastillas).toHaveLength(2)
    for (const item of pastillas) {
      const fields = item.fields as { text: string; pillText: string; pillPosition: string }
      expect(fields.pillText).toBe('Solo en')
      expect(fields.text).toBe('Restaurantes')
      expect(fields.pillPosition).toBe('izquierda')
    }
  })

  it('has fixed, literal item ids (deterministic, not newId())', () => {
    expect(new Set(defaultCuponesFields.items.map((it) => it.id)).size).toBe(8)
    expect(defaultCuponesFields.items.every((it) => it.id.startsWith('cupones-item-'))).toBe(true)
  })
})

describe('createDefaultCuponesFields', () => {
  it('generates fresh ids on every call, so 2 inserted blocks never collide', () => {
    const a = createDefaultCuponesFields()
    const b = createDefaultCuponesFields()
    const aIds = a.items.map((it) => it.id)
    const bIds = b.items.map((it) => it.id)
    expect(new Set([...aIds, ...bIds]).size).toBe(16)
  })

  it('does not reuse defaultCuponesFields\' fixed ids', () => {
    const fresh = createDefaultCuponesFields()
    const fixedIds = new Set(defaultCuponesFields.items.map((it) => it.id))
    for (const item of fresh.items) expect(fixedIds.has(item.id)).toBe(false)
  })
})

describe('cloneCuponesFields', () => {
  it('preserves user field values (incl. per-cell fields) but regenerates every item id', () => {
    const original = createDefaultCuponesFields()
    original.cells[1] = { ...original.cells[1], type: 'cupon', linkEnabled: true, link: 'https://x.test/c2' } as typeof original.cells[1]
    const clone = cloneCuponesFields(original)

    expect(clone.cells[1]).toEqual(original.cells[1])
    expect(clone.items.map((it) => it.id)).not.toEqual(original.items.map((it) => it.id))
    expect(clone.items.map((it) => `${it.areaKey}:${it.type}`)).toEqual(original.items.map((it) => `${it.areaKey}:${it.type}`))
    expect(new Set(clone.items.map((it) => it.id)).size).toBe(8)
  })
})

describe('createDefaultCuponCellFields / createDefaultTituloCellFields', () => {
  it('createDefaultCuponCellFields returns a fresh "cupon" cell with factory defaults', () => {
    const cell = createDefaultCuponCellFields()
    expect(cell.type).toBe('cupon')
    expect(cell.linkEnabled).toBe(false)
    expect(cell.legalEnabled).toBe(false)
  })

  it('createDefaultTituloCellFields returns a fresh "titulo" cell with factory defaults', () => {
    const cell = createDefaultTituloCellFields()
    expect(cell.type).toBe('titulo')
    expect(cell.titleText).toBe('Aca un titulo')
    expect(cell.linkEnabled).toBe(false)
  })
})
