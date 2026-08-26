import { describe, expect, it } from 'vitest'
import { cloneTitleFields, createDefaultTitleFields, defaultTitleFields } from '../schema'

describe('defaultTitleFields', () => {
  it('reproduces the master default literally: título + línea separadora + subtítulo, in that order', () => {
    expect(defaultTitleFields.items.map((it) => it.type)).toEqual(['TITULO_TEXTO', 'SEPARADOR_LINEA', 'SUBTITULO_TEXTO'])
    expect(defaultTitleFields.items.every((it) => it.areaKey === 'main')).toBe(true)
  })

  it('has fixed, literal ids (deterministic, not newId()) — same criterion as defaultDealsFields', () => {
    expect(defaultTitleFields.items.map((it) => it.id)).toEqual([
      'title-item-titulo-default',
      'title-item-separador-default',
      'title-item-subtitulo-default',
    ])
  })
})

describe('createDefaultTitleFields', () => {
  it('generates fresh ids on every call, so 2 inserted blocks never collide', () => {
    const a = createDefaultTitleFields()
    const b = createDefaultTitleFields()
    const aIds = a.items.map((it) => it.id)
    const bIds = b.items.map((it) => it.id)
    expect(new Set([...aIds, ...bIds]).size).toBe(6)
  })

  it('does not reuse defaultTitleFields\' fixed ids', () => {
    const fresh = createDefaultTitleFields()
    const fixedIds = new Set(defaultTitleFields.items.map((it) => it.id))
    for (const item of fresh.items) expect(fixedIds.has(item.id)).toBe(false)
  })
})

describe('cloneTitleFields', () => {
  it('preserves user field values but regenerates every item id', () => {
    const original = createDefaultTitleFields()
    original.items[0].fields = { text: 'Editado por el usuario' }
    const clone = cloneTitleFields(original)

    expect(clone.items[0].fields).toEqual({ text: 'Editado por el usuario' })
    expect(clone.items.map((it) => it.id)).not.toEqual(original.items.map((it) => it.id))
    expect(clone.items.map((it) => it.type)).toEqual(original.items.map((it) => it.type))
  })
})
