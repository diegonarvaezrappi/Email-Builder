import { describe, expect, it } from 'vitest'
import { defaultEmailDocument } from '../../registry'
import type { EmailDocument } from '../../model'
import { countryCondition, fieldVariants, renderTropicalized, resolveBranchFields } from '../render'
import type { TropicalizeBranch } from '../schema'

const branch = (over: Partial<TropicalizeBranch> = {}): TropicalizeBranch => ({
  countries: ['AR'],
  hidden: false,
  overrides: {},
  ...over,
})

const docWith = (key: string, branches: TropicalizeBranch[]): EmailDocument => ({
  ...defaultEmailDocument,
  tropicalizations: { [key]: { branches } },
})

describe('countryCondition', () => {
  it('joins countries with "or", Braze-style ${user_id} contains', () => {
    expect(countryCondition(['AR', 'UY'])).toBe("${user_id} contains 'AR' or ${user_id} contains 'UY'")
  })

  it('a single country has no "or"', () => {
    expect(countryCondition(['AR'])).toBe("${user_id} contains 'AR'")
  })

  it('throws on an empty list — normalizeBranches should have filtered it out already', () => {
    expect(() => countryCondition([])).toThrow()
  })

  it('throws on a country that is not exactly 2 uppercase letters (fail loud, no toLiquidStringLiteral escaping)', () => {
    expect(() => countryCondition(["AR' or 1==1 or '"])).toThrow()
    expect(() => countryCondition(['ar'])).toThrow()
  })
})

describe('resolveBranchFields', () => {
  const base = { text: 'base', enabled: true }

  it('returns the SAME object by identity when there are no overrides', () => {
    expect(resolveBranchFields(base, branch())).toBe(base)
  })

  it('merges an override on top of the base', () => {
    expect(resolveBranchFields(base, branch({ overrides: { text: 'variante' } }))).toEqual({ text: 'variante', enabled: true })
  })

  it('drops an override key that no longer exists on the base (schema drift) instead of leaking it through', () => {
    const result = resolveBranchFields(base, branch({ overrides: { text: 'variante', ghostField: 'x' } }))
    expect(result).toEqual({ text: 'variante', enabled: true })
    expect('ghostField' in result).toBe(false)
  })
})

describe('renderTropicalized', () => {
  it('with no tropicalizations at all, returns EXACTLY renderVariant(baseFields) — the byte-identical fast path', () => {
    const doc = defaultEmailDocument
    const base = { text: 'hola' }
    const renderVariant = (f: typeof base) => `<p>${f.text}</p>`
    expect(renderTropicalized(doc, 'block:nope', base, renderVariant)).toBe(renderVariant(base))
  })

  it('emits if/elsif/else in branch order, each rendering its own resolved fields', () => {
    const doc = docWith('block:a', [
      branch({ countries: ['AR', 'UY'], overrides: { text: 'variante AR' } }),
      branch({ countries: ['BR'], overrides: { text: 'variante BR' } }),
    ])
    const base = { text: 'base' }
    const html = renderTropicalized(doc, 'block:a', base, (f) => `<p>${f.text}</p>`)
    expect(html).toBe(
      [
        "{% if ${user_id} contains 'AR' or ${user_id} contains 'UY' %}",
        '<p>variante AR</p>',
        "{% elsif ${user_id} contains 'BR' %}",
        '<p>variante BR</p>',
        '{% else %}',
        '<p>base</p>',
        '{% endif %}',
      ].join('\n'),
    )
  })

  it('uses "elsif", never "elseif"', () => {
    const doc = docWith('block:a', [branch({ countries: ['AR'] }), branch({ countries: ['BR'] })])
    const html = renderTropicalized(doc, 'block:a', { text: 'x' }, (f) => f.text)
    expect(html).toContain('{% elsif ')
    expect(html).not.toContain('elseif')
  })

  it('a hidden branch renders via renderHidden (default empty string), not renderVariant', () => {
    const doc = docWith('block:a', [branch({ countries: ['AR'], hidden: true, overrides: { text: 'nunca se ve' } })])
    const html = renderTropicalized(doc, 'block:a', { text: 'base' }, (f) => `<p>${f.text}</p>`)
    expect(html).not.toContain('nunca se ve')
    expect(html).toContain('{% if')
    expect(html).toContain('{% else %}\n<p>base</p>')
  })

  it('respects a custom renderHidden (e.g. deals emptyCell) instead of the default empty string', () => {
    const doc = docWith('block:a', [branch({ countries: ['AR'], hidden: true })])
    const html = renderTropicalized(doc, 'block:a', { text: 'base' }, (f) => `<p>${f.text}</p>`, () => '<td></td>')
    expect(html).toContain('<td></td>')
  })

  it('a tropicalization with only empty-country branches behaves exactly like having none', () => {
    const doc = docWith('block:a', [branch({ countries: [] })])
    const base = { text: 'hola' }
    const renderVariant = (f: typeof base) => `<p>${f.text}</p>`
    expect(renderTropicalized(doc, 'block:a', base, renderVariant)).toBe(renderVariant(base))
  })
})

describe('fieldVariants', () => {
  it('with no tropicalizations, returns just [baseFields]', () => {
    expect(fieldVariants(defaultEmailDocument, 'block:nope', { legalEnabled: false })).toEqual([{ legalEnabled: false }])
  })

  it('includes the base plus every non-hidden branch, resolved', () => {
    const doc = docWith('dcard:c1', [
      branch({ countries: ['AR'], overrides: { legalEnabled: true } }),
      branch({ countries: ['BR'], hidden: true, overrides: { legalEnabled: true } }),
    ])
    const variants = fieldVariants(doc, 'dcard:c1', { legalEnabled: false })
    expect(variants).toEqual([{ legalEnabled: false }, { legalEnabled: true }])
  })
})
