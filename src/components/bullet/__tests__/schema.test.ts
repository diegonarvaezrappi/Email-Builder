import { describe, expect, it } from 'vitest'
import { cloneBulletFields, createDefaultBulletFields, defaultBulletFields } from '../schema'

describe('defaultBulletFields', () => {
  it('reproduces the master default literally: one BULLET_ICONO item, size L', () => {
    expect(defaultBulletFields.items.map((it) => it.type)).toEqual(['BULLET_ICONO'])
    expect(defaultBulletFields.items[0].areaKey).toBe('main')
    expect((defaultBulletFields.items[0].fields as { size: string }).size).toBe('L')
  })

  it('has a fixed, literal id (deterministic, not newId())', () => {
    expect(defaultBulletFields.items.map((it) => it.id)).toEqual(['bullet-item-icono-default'])
  })
})

describe('createDefaultBulletFields', () => {
  it('generates a fresh id on every call, so 2 inserted blocks never collide', () => {
    const a = createDefaultBulletFields()
    const b = createDefaultBulletFields()
    expect(a.items[0].id).not.toBe(b.items[0].id)
  })

  it('does not reuse defaultBulletFields\' fixed id', () => {
    const fresh = createDefaultBulletFields()
    expect(fresh.items[0].id).not.toBe(defaultBulletFields.items[0].id)
  })
})

describe('cloneBulletFields', () => {
  it('preserves user field values but regenerates the item id', () => {
    const original = createDefaultBulletFields()
    original.items[0].fields = { size: 'S', titulo: 'Editado', texto: 'y' }
    const clone = cloneBulletFields(original)

    expect(clone.items[0].fields).toEqual({ size: 'S', titulo: 'Editado', texto: 'y' })
    expect(clone.items[0].id).not.toBe(original.items[0].id)
    expect(clone.items[0].type).toBe(original.items[0].type)
  })
})
