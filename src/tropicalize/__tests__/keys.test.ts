import { describe, expect, it } from 'vitest'
import {
  bannerItemKey,
  blockKey,
  dealCardKey,
  heroPieceKey,
  isTropicalizeKey,
  moduleItemKey,
  parseTargetKey,
  selectionFromTargetKey,
  slotKey,
  targetKeyFromSelection,
} from '../keys'
import {
  selectBannerItem,
  selectBlock,
  selectDealCard,
  selectDealCardPiece,
  selectHeroPiece,
  selectModuleItem,
  selectSlot,
} from '../../ui/selection'

describe('parseTargetKey', () => {
  it('splits on the FIRST colon only, so an id containing one survives whole', () => {
    expect(parseTargetKey('block:abc:def')).toEqual({ kind: 'block', id: 'abc:def' })
  })

  it('rejects an unknown kind', () => {
    expect(parseTargetKey('dpiece:x')).toBeNull()
  })

  it('rejects a key with no colon at all', () => {
    expect(parseTargetKey('blockx')).toBeNull()
  })

  it('rejects an empty id', () => {
    expect(parseTargetKey('block:')).toBeNull()
  })

  it('rejects a slot id that is not HEADER/BANNER/FOOTER', () => {
    expect(parseTargetKey('slot:CONTENIDOS')).toBeNull()
    expect(parseTargetKey('slot:NOPE')).toBeNull()
  })

  it('accepts FOOTER, the only singleton slot left', () => {
    expect(parseTargetKey('slot:FOOTER')).toEqual({ kind: 'slot', id: 'FOOTER' })
  })

  it('rejects slot:HEADER / slot:BANNER — header and banner are hero pieces now (header:<id>, banner:<id>)', () => {
    expect(parseTargetKey('slot:HEADER')).toBeNull()
    expect(parseTargetKey('slot:BANNER')).toBeNull()
    expect(parseTargetKey('header:h1')).toEqual({ kind: 'header', id: 'h1' })
    expect(parseTargetKey('banner:b1')).toEqual({ kind: 'banner', id: 'b1' })
  })
})

describe('isTropicalizeKey', () => {
  it('agrees with parseTargetKey', () => {
    expect(isTropicalizeKey('block:x')).toBe(true)
    expect(isTropicalizeKey('nope')).toBe(false)
  })
})

describe('key constructors', () => {
  it('produce the expected <kind>:<id> shape', () => {
    expect(slotKey('FOOTER')).toBe('slot:FOOTER')
    expect(heroPieceKey('HEADER', 'h1')).toBe('header:h1')
    expect(heroPieceKey('BANNER', 'b1')).toBe('banner:b1')
    expect(blockKey('b1')).toBe('block:b1')
    expect(bannerItemKey('i1')).toBe('bitem:i1')
    expect(dealCardKey('c1')).toBe('dcard:c1')
    expect(moduleItemKey('m1')).toBe('mitem:m1')
  })
})

describe('targetKeyFromSelection / selectionFromTargetKey round-trip', () => {
  it('round-trips the footer slot', () => {
    const key = targetKeyFromSelection(selectSlot('FOOTER'))
    expect(key).toBe('slot:FOOTER')
    expect(selectionFromTargetKey(key!)).toEqual(selectSlot('FOOTER'))
  })

  it('round-trips a header and a banner of the hero', () => {
    const header = targetKeyFromSelection(selectHeroPiece('HEADER', 'h1'))
    expect(header).toBe('header:h1')
    expect(selectionFromTargetKey(header!)).toEqual(selectHeroPiece('HEADER', 'h1'))
    const banner = targetKeyFromSelection(selectHeroPiece('BANNER', 'b1'))
    expect(banner).toBe('banner:b1')
    expect(selectionFromTargetKey(banner!)).toEqual(selectHeroPiece('BANNER', 'b1'))
  })

  it('a bare HEADER/BANNER selection (no heroId) is not tropicalizable', () => {
    expect(targetKeyFromSelection(selectSlot('HEADER'))).toBeNull()
  })

  it('round-trips a content block', () => {
    const key = targetKeyFromSelection(selectBlock('b1'))
    expect(key).toBe('block:b1')
    expect(selectionFromTargetKey(key!)).toEqual(selectBlock('b1'))
  })

  it('round-trips a banner item', () => {
    const key = targetKeyFromSelection(selectBannerItem('i1'))
    expect(key).toBe('bitem:i1')
    expect(selectionFromTargetKey(key!)).toEqual(selectBannerItem('i1'))
  })

  it('round-trips a deal card', () => {
    const key = targetKeyFromSelection(selectDealCard('c1'))
    expect(key).toBe('dcard:c1')
    expect(selectionFromTargetKey(key!)).toEqual(selectDealCard('c1'))
  })

  it('round-trips a module item', () => {
    const key = targetKeyFromSelection(selectModuleItem('m1'))
    expect(key).toBe('mitem:m1')
    expect(selectionFromTargetKey(key!)).toEqual(selectModuleItem('m1'))
  })

  it('a deal card PIECE (DPIECE) is not tropicalizable — resolves to null', () => {
    expect(targetKeyFromSelection(selectDealCardPiece('c1', 'copy1'))).toBeNull()
  })

  it('bare CONTENIDOS (no blockId/dealCardId/moduleItemId) is not tropicalizable — resolves to null', () => {
    expect(targetKeyFromSelection({ slot: 'CONTENIDOS' })).toBeNull()
  })

  it('a global background (HERO_BG/CONTENTS_BG) is not tropicalizable — resolves to null', () => {
    expect(targetKeyFromSelection({ slot: 'HERO_BG' })).toBeNull()
    expect(targetKeyFromSelection({ slot: 'CONTENTS_BG' })).toBeNull()
  })

  it('null selection resolves to null', () => {
    expect(targetKeyFromSelection(null)).toBeNull()
  })

  it('an invalid key resolves to null, not a thrown error', () => {
    expect(selectionFromTargetKey('nope')).toBeNull()
  })
})
