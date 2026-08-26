import { describe, expect, it } from 'vitest'
import { cloneBeneficiosFields, createDefaultBeneficiosFields, defaultBeneficiosFields } from '../schema'

describe('defaultBeneficiosFields', () => {
  it('reproduces the master default literally: icono + separador + título + separador + texto, in that order', () => {
    expect(defaultBeneficiosFields.items.map((it) => it.type)).toEqual(['ICONO', 'SEPARADOR', 'BENEFICIOS_TITULO', 'SEPARADOR', 'BENEFICIOS_TEXTO'])
    expect(defaultBeneficiosFields.items.every((it) => it.areaKey === 'main')).toBe(true)
  })

  it('the 2 separators are size S (the invisible spacer between molecules), not the general/M sizes', () => {
    const separators = defaultBeneficiosFields.items.filter((it) => it.type === 'SEPARADOR')
    expect(separators.map((it) => (it.fields as { size: string }).size)).toEqual(['S', 'S'])
  })

  it('has fixed, literal item ids (deterministic, not newId())', () => {
    expect(defaultBeneficiosFields.items.map((it) => it.id)).toEqual([
      'beneficios-item-icono-default',
      'beneficios-item-separador1-default',
      'beneficios-item-titulo-default',
      'beneficios-item-separador2-default',
      'beneficios-item-texto-default',
    ])
  })

  it('the fixed image cell ships border-radius ON by default — matches the master, unlike IMG_AUTOMATICA', () => {
    expect(defaultBeneficiosFields.image.borderRadiusEnabled).toBe(true)
  })
})

describe('createDefaultBeneficiosFields', () => {
  it('generates fresh ids on every call, so 2 inserted blocks never collide', () => {
    const a = createDefaultBeneficiosFields()
    const b = createDefaultBeneficiosFields()
    const aIds = a.items.map((it) => it.id)
    const bIds = b.items.map((it) => it.id)
    expect(new Set([...aIds, ...bIds]).size).toBe(10)
  })

  it('does not reuse defaultBeneficiosFields\' fixed ids', () => {
    const fresh = createDefaultBeneficiosFields()
    const fixedIds = new Set(defaultBeneficiosFields.items.map((it) => it.id))
    for (const item of fresh.items) expect(fixedIds.has(item.id)).toBe(false)
  })
})

describe('cloneBeneficiosFields', () => {
  it('preserves user field values (incl. the fixed image) but regenerates every item id', () => {
    const original = createDefaultBeneficiosFields()
    original.image = { imageUrl: 'https://x.test/mine.png', borderRadiusEnabled: false }
    original.items[0].fields = { imageUrl: 'https://x.test/icon.png', size: 'L', borderRadiusEnabled: true }
    const clone = cloneBeneficiosFields(original)

    expect(clone.image).toEqual({ imageUrl: 'https://x.test/mine.png', borderRadiusEnabled: false })
    expect(clone.items[0].fields).toEqual({ imageUrl: 'https://x.test/icon.png', size: 'L', borderRadiusEnabled: true })
    expect(clone.items.map((it) => it.id)).not.toEqual(original.items.map((it) => it.id))
    expect(clone.items.map((it) => it.type)).toEqual(original.items.map((it) => it.type))
  })
})
