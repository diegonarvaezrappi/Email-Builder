import { describe, expect, it } from 'vitest'
import { BLOCK_CLOSE_RE, BLOCK_OPEN_RE, wrapWithBlockMarkers } from '../contentBlocks'

describe('wrapWithBlockMarkers', () => {
  it('wraps the html in a matched pair of comments carrying type and id', () => {
    const wrapped = wrapWithBlockMarkers('CTA', 'abc-123', '<a>botón</a>')
    expect(wrapped).toBe('<!-- BLOCK:CTA:abc-123 -->\n<a>botón</a>\n<!-- /BLOCK:CTA:abc-123 -->')
  })

  it('produces an open comment matched by BLOCK_OPEN_RE with the right captures', () => {
    const wrapped = wrapWithBlockMarkers('CTA', 'abc-123', 'x')
    const openLine = wrapped.split('\n')[0].replace(/^<!--\s*/, '').replace(/\s*-->$/, '')
    const match = openLine.match(BLOCK_OPEN_RE)
    expect(match?.[1]).toBe('CTA')
    expect(match?.[2]).toBe('abc-123')
  })

  it('produces a close comment matched by BLOCK_CLOSE_RE with the right captures', () => {
    const wrapped = wrapWithBlockMarkers('CTA', 'abc-123', 'x')
    const lines = wrapped.split('\n')
    const closeLine = lines[lines.length - 1].replace(/^<!--\s*/, '').replace(/\s*-->$/, '')
    const match = closeLine.match(BLOCK_CLOSE_RE)
    expect(match?.[1]).toBe('CTA')
    expect(match?.[2]).toBe('abc-123')
  })

  it('BLOCK_OPEN_RE does not match a close marker and vice versa', () => {
    expect('/BLOCK:CTA:abc-123'.match(BLOCK_OPEN_RE)).toBeNull()
    expect('BLOCK:CTA:abc-123'.match(BLOCK_CLOSE_RE)).toBeNull()
  })
})
