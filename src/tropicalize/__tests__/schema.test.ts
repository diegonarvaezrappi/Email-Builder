import { describe, expect, it } from 'vitest'
import { normalizeBranches, tropicalizationsSchema, type TropicalizeBranch } from '../schema'

describe('tropicalizationsSchema', () => {
  it('drops a country the app no longer knows about, without discarding the branch', () => {
    const parsed = tropicalizationsSchema.parse({
      'block:a': { branches: [{ countries: ['AR', 'ZZ'], hidden: false, overrides: {} }] },
    })
    expect(parsed['block:a'].branches[0].countries).toEqual(['AR'])
  })

  it('defaults a non-array countries value to an empty array instead of throwing', () => {
    const parsed = tropicalizationsSchema.parse({ 'block:a': { branches: [{ countries: 'AR' }] } })
    expect(parsed['block:a'].branches[0].countries).toEqual([])
  })

  it('defaults a non-object overrides value to {} instead of throwing', () => {
    const parsed = tropicalizationsSchema.parse({ 'block:a': { branches: [{ overrides: 'nope' }] } })
    expect(parsed['block:a'].branches[0].overrides).toEqual({})
  })

  it('drops ONE corrupt entry without discarding the rest of the map', () => {
    const parsed = tropicalizationsSchema.parse({
      'block:a': { branches: [{ countries: ['AR'] }] },
      'block:b': { branches: 'not an array' },
    })
    expect(Object.keys(parsed)).toEqual(['block:a'])
  })

  it('a completely invalid top-level value resolves to {}, not a thrown error', () => {
    expect(tropicalizationsSchema.parse('nope')).toEqual({})
    expect(tropicalizationsSchema.parse(null)).toEqual({})
    expect(tropicalizationsSchema.parse(undefined)).toEqual({})
  })

  it('defaults to {} when the field is missing entirely', () => {
    expect(tropicalizationsSchema.parse(undefined)).toEqual({})
  })
})

describe('normalizeBranches', () => {
  const branch = (over: Partial<TropicalizeBranch> = {}): TropicalizeBranch => ({
    countries: ['AR'],
    hidden: false,
    overrides: {},
    ...over,
  })

  it('drops a branch that ends up with zero countries', () => {
    expect(normalizeBranches([branch({ countries: [] })])).toEqual([])
  })

  it('drops a country from a LATER branch if an earlier branch already claimed it (first-match-wins)', () => {
    const result = normalizeBranches([branch({ countries: ['AR', 'UY'] }), branch({ countries: ['UY', 'BR'] })])
    expect(result).toEqual([branch({ countries: ['AR', 'UY'] }), branch({ countries: ['BR'] })])
  })

  it('drops the second branch entirely if every one of its countries was already claimed', () => {
    const result = normalizeBranches([branch({ countries: ['AR'] }), branch({ countries: ['AR'] })])
    expect(result).toHaveLength(1)
  })

  it('leaves a normal, non-overlapping list of branches untouched', () => {
    const input = [branch({ countries: ['AR'] }), branch({ countries: ['BR'], hidden: true })]
    expect(normalizeBranches(input)).toEqual(input)
  })

  it('an empty list stays empty', () => {
    expect(normalizeBranches([])).toEqual([])
  })
})
