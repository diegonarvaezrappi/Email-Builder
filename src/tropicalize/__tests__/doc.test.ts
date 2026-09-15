import { describe, expect, it } from 'vitest'
import { defaultEmailDocument } from '../../registry'
import type { EmailDocument } from '../../model'
import { copyTropicalization, diffShallow, pruneTropicalizations, withoutTropicalizations } from '../doc'

describe('pruneTropicalizations', () => {
  it('drops a key pointing at a content block that no longer exists', () => {
    const doc: EmailDocument = { ...defaultEmailDocument, tropicalizations: { 'block:ghost': { branches: [] } } }
    expect(pruneTropicalizations(doc).tropicalizations).toEqual({})
  })

  it('keeps a key pointing at a block that DOES exist', () => {
    const realId = defaultEmailDocument.contenidos[0].id
    const doc: EmailDocument = {
      ...defaultEmailDocument,
      tropicalizations: { [`block:${realId}`]: { branches: [{ countries: ['AR'], hidden: false, overrides: {} }] } },
    }
    expect(Object.keys(pruneTropicalizations(doc).tropicalizations)).toEqual([`block:${realId}`])
  })

  it('the 3 slot keys are never orphaned — HEADER/BANNER/FOOTER always resolve', () => {
    const doc: EmailDocument = {
      ...defaultEmailDocument,
      tropicalizations: {
        'slot:HEADER': { branches: [] },
        'slot:BANNER': { branches: [] },
        'slot:FOOTER': { branches: [] },
      },
    }
    expect(Object.keys(pruneTropicalizations(doc).tropicalizations).sort()).toEqual(['slot:BANNER', 'slot:FOOTER', 'slot:HEADER'])
  })

  it('returns the SAME document (identity) when nothing needs pruning', () => {
    const doc: EmailDocument = { ...defaultEmailDocument, tropicalizations: {} }
    expect(pruneTropicalizations(doc)).toBe(doc)
  })
})

describe('withoutTropicalizations', () => {
  it('empties the map, keeping everything else untouched', () => {
    const doc: EmailDocument = { ...defaultEmailDocument, tropicalizations: { 'block:x': { branches: [] } } }
    const result = withoutTropicalizations(doc)
    expect(result.tropicalizations).toEqual({})
    expect(result.contenidos).toBe(doc.contenidos)
  })
})

describe('diffShallow', () => {
  it('returns only the keys that changed', () => {
    expect(diffShallow({ a: 1, b: 2 }, { a: 1, b: 3 })).toEqual({ b: 3 })
  })

  it('returns {} when nothing changed', () => {
    expect(diffShallow({ a: 1 }, { a: 1 })).toEqual({})
  })

  it('skips a key whose next value is undefined', () => {
    expect(diffShallow({ a: 1 }, { a: undefined as unknown as number })).toEqual({})
  })

  it('compares nested objects by value, not by reference', () => {
    expect(diffShallow({ nested: { x: 1 } }, { nested: { x: 1 } })).toEqual({})
    expect(diffShallow({ nested: { x: 1 } }, { nested: { x: 2 } })).toEqual({ nested: { x: 2 } })
  })
})

describe('copyTropicalization', () => {
  it('copies an existing entry to a new key', () => {
    const map = { 'bitem:old': { branches: [{ countries: ['AR' as const], hidden: false, overrides: {} }] } }
    const result = copyTropicalization(map, 'bitem:old', 'bitem:new')
    expect(result['bitem:new']).toEqual(map['bitem:old'])
    expect(result['bitem:old']).toEqual(map['bitem:old'])
  })

  it('returns the SAME map (identity) when there is nothing to copy', () => {
    const map = {}
    expect(copyTropicalization(map, 'bitem:old', 'bitem:new')).toBe(map)
  })
})
