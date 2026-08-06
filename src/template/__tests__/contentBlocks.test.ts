import { describe, expect, it } from 'vitest'
import {
  BANNER_ITEM_CLOSE_RE,
  BANNER_ITEM_OPEN_RE,
  BLOCK_CLOSE_RE,
  BLOCK_OPEN_RE,
  DEAL_CARD_CLOSE_RE,
  DEAL_CARD_OPEN_RE,
  wrapWithBannerItemMarkers,
  wrapWithBlockMarkers,
  wrapWithDealCardMarkers,
} from '../contentBlocks'

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

describe('wrapWithBannerItemMarkers', () => {
  it('wraps the html in a matched pair of comments carrying type and id', () => {
    const wrapped = wrapWithBannerItemMarkers('PROMO', 'abc-123', '<table>promo</table>')
    expect(wrapped).toBe('<!-- BITEM:PROMO:abc-123 -->\n<table>promo</table>\n<!-- /BITEM:PROMO:abc-123 -->')
  })

  it('produces an open comment matched by BANNER_ITEM_OPEN_RE with the right captures', () => {
    const wrapped = wrapWithBannerItemMarkers('PROMO', 'abc-123', 'x')
    const openLine = wrapped.split('\n')[0].replace(/^<!--\s*/, '').replace(/\s*-->$/, '')
    const match = openLine.match(BANNER_ITEM_OPEN_RE)
    expect(match?.[1]).toBe('PROMO')
    expect(match?.[2]).toBe('abc-123')
  })

  it('produces a close comment matched by BANNER_ITEM_CLOSE_RE with the right captures', () => {
    const wrapped = wrapWithBannerItemMarkers('PROMO', 'abc-123', 'x')
    const lines = wrapped.split('\n')
    const closeLine = lines[lines.length - 1].replace(/^<!--\s*/, '').replace(/\s*-->$/, '')
    const match = closeLine.match(BANNER_ITEM_CLOSE_RE)
    expect(match?.[1]).toBe('PROMO')
    expect(match?.[2]).toBe('abc-123')
  })

  it('BANNER_ITEM_OPEN_RE does not match a close marker and vice versa', () => {
    expect('/BITEM:PROMO:abc-123'.match(BANNER_ITEM_OPEN_RE)).toBeNull()
    expect('BITEM:PROMO:abc-123'.match(BANNER_ITEM_CLOSE_RE)).toBeNull()
  })

  it('the BLOCK_* and BANNER_ITEM_* marker systems never cross-match each other', () => {
    expect('BLOCK:CTA:a'.match(BANNER_ITEM_OPEN_RE)).toBeNull()
    expect('BITEM:PROMO:a'.match(BLOCK_OPEN_RE)).toBeNull()
  })
})

describe('wrapWithDealCardMarkers', () => {
  it('wraps the html in a matched pair of comments carrying the OWNING BLOCK id and the card id', () => {
    const wrapped = wrapWithDealCardMarkers('blk-1', 'card-9', '<td>deal</td>')
    expect(wrapped).toBe('<!-- DCARD:blk-1:card-9 -->\n<td>deal</td>\n<!-- /DCARD:blk-1:card-9 -->')
  })

  it('produces open/close comments matched by DEAL_CARD_*_RE with the right captures', () => {
    const lines = wrapWithDealCardMarkers('blk-1', 'card-9', 'x').split('\n')
    const strip = (line: string) => line.replace(/^<!--\s*/, '').replace(/\s*-->$/, '')
    const open = strip(lines[0]).match(DEAL_CARD_OPEN_RE)
    expect(open?.[1]).toBe('blk-1')
    expect(open?.[2]).toBe('card-9')
    const close = strip(lines[lines.length - 1]).match(DEAL_CARD_CLOSE_RE)
    expect(close?.[1]).toBe('blk-1')
    expect(close?.[2]).toBe('card-9')
  })

  it('DEAL_CARD_OPEN_RE does not match a close marker and vice versa', () => {
    expect('/DCARD:blk-1:card-9'.match(DEAL_CARD_OPEN_RE)).toBeNull()
    expect('DCARD:blk-1:card-9'.match(DEAL_CARD_CLOSE_RE)).toBeNull()
  })

  it('never cross-matches the other 2 marker systems (los 3 conviven en el mismo documento)', () => {
    expect('DCARD:blk-1:card-9'.match(BLOCK_OPEN_RE)).toBeNull()
    expect('DCARD:blk-1:card-9'.match(BANNER_ITEM_OPEN_RE)).toBeNull()
    expect('BLOCK:DEALS:blk-1'.match(DEAL_CARD_OPEN_RE)).toBeNull()
    expect('BITEM:PROMO:a'.match(DEAL_CARD_OPEN_RE)).toBeNull()
  })

  it('una misma tarjeta puede llevar varios pares (su HTML no es contiguo) y todos comparten id', () => {
    // Las 3 filas del par de deals: imagen, textos y legales.
    const rows = ['<td>img</td>', '<td>textos</td>', '<td>legal</td>'].map((html) =>
      wrapWithDealCardMarkers('blk-1', 'card-9', html),
    )
    const joined = rows.join('\n')
    // Solo las aperturas: el `<!-- ` inicial las distingue de `<!-- /DCARD:...`.
    expect(joined.match(/<!-- DCARD:blk-1:card-9 -->/g)).toHaveLength(3)
    expect(joined.match(/<!-- \/DCARD:blk-1:card-9 -->/g)).toHaveLength(3)
  })
})
