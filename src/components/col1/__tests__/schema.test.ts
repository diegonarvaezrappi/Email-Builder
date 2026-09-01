import { describe, expect, it } from 'vitest'
import { cloneCol1Fields, createDefaultCol1Fields, defaultCol1Fields } from '../schema'

describe('defaultCol1Fields', () => {
  it('has no default items in either area — the master ships no example content, only the image', () => {
    expect(defaultCol1Fields.items).toEqual([])
  })

  it('the image ships border-radius OFF by default (matches the master\'s 0px 0px 0px 0px), unlike Beneficios', () => {
    expect(defaultCol1Fields.image.borderRadiusEnabled).toBe(false)
  })

  it('the image ships the master\'s own placeholder URL', () => {
    expect(defaultCol1Fields.image.imageUrl).toBe('https://lh3.googleusercontent.com/d/1OEXxNDtUklgU4W8sta2zOzdZ4rZYq7PO')
  })
})

describe('createDefaultCol1Fields', () => {
  it('returns the same empty-items shape every call (nothing to generate fresh ids for yet)', () => {
    const a = createDefaultCol1Fields()
    const b = createDefaultCol1Fields()
    expect(a.items).toEqual([])
    expect(b.items).toEqual([])
    expect(a.image).toEqual(b.image)
  })
})

describe('cloneCol1Fields', () => {
  it('preserves user field values (incl. the image) but regenerates every item id, across BOTH areas', () => {
    const original = createDefaultCol1Fields()
    original.image = { imageUrl: 'https://x.test/mine.png', borderRadiusEnabled: true }
    original.items = [
      { id: 'a', areaKey: 'above', type: 'TITULO_TEXTO', fields: { text: 'Arriba' } } as (typeof original.items)[number],
      { id: 'b', areaKey: 'below', type: 'TITULO_TEXTO', fields: { text: 'Abajo' } } as (typeof original.items)[number],
    ]
    const clone = cloneCol1Fields(original)

    expect(clone.image).toEqual({ imageUrl: 'https://x.test/mine.png', borderRadiusEnabled: true })
    expect(clone.items.map((it) => it.areaKey)).toEqual(['above', 'below'])
    expect(clone.items.map((it) => it.id)).not.toEqual(['a', 'b'])
    expect(new Set(clone.items.map((it) => it.id)).size).toBe(2)
  })
})
