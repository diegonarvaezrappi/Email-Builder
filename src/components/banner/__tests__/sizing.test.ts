import { describe, expect, it } from 'vitest'
import { ahoraSizing, liveTextSizing, sizingVars } from '../items/sizing'

describe('liveTextSizing', () => {
  // Tabla verificada línea por línea contra 01-foundations/global-styles/head-meta-tags.html.
  it.each([
    ['1234', 'horizontal', { className: 'bnr-xl', fontSize: '80px', lineHeight: '80px' }], // 4 chars, límite <=4
    ['12345', 'horizontal', { className: 'bnr-lg', fontSize: '35px', lineHeight: '35px' }], // 5 chars, límite >4
    ['1234', 'vertical', { className: 'bnr-xl', fontSize: '125px', lineHeight: '125px' }],
    ['12345', 'vertical', { className: 'bnr-lg', fontSize: '62px', lineHeight: '62px' }],
    ['120', 'horizontal', { className: 'bnr-xl', fontSize: '80px', lineHeight: '80px' }],
    ['$14.000', 'horizontal', { className: 'bnr-lg', fontSize: '35px', lineHeight: '35px' }],
  ] as const)('"%s" (%s) -> %o', (text, bannerType, expected) => {
    expect(liveTextSizing(text, bannerType)).toEqual(expected)
  })

  it('counts characters, not UTF-16 code units (astral characters like emoji still count as 1)', () => {
    // 5 emoji = 5 caracteres reales -> > 4 -> bnr-lg, aunque cada uno ocupe 2 code units en UTF-16.
    expect(liveTextSizing('💰💰💰💰💰', 'horizontal').className).toBe('bnr-lg')
  })
})

describe('ahoraSizing', () => {
  it.each([
    ['1234', 'horizontal', { className: 'bnr-hasta-xl', fontSize: '19px', lineHeight: '19px' }],
    ['12345', 'horizontal', { className: 'bnr-hasta-lg', fontSize: '10px', lineHeight: '10px' }],
    ['1234', 'vertical', { className: 'bnr-hasta-xl', fontSize: '25px', lineHeight: '25px' }],
    ['12345', 'vertical', { className: 'bnr-hasta-lg', fontSize: '15px', lineHeight: '15px' }],
  ] as const)('"%s" (%s) -> %o', (promoText, bannerType, expected) => {
    expect(ahoraSizing(promoText, bannerType)).toEqual(expected)
  })
})

describe('sizingVars', () => {
  it('maps class (no suffix) + fontsize/lineheight (suffixed only for vertical)', () => {
    const names = { classVar: 'banner_copy_modulo_prom_class', fontsizeVar: 'banner_copy_modulo_promo_fontsize', lineheightVar: 'banner_copy_modulo_promo_lineheight' }
    expect(sizingVars(names, { className: 'bnr-xl', fontSize: '80px', lineHeight: '80px' }, 'horizontal')).toEqual({
      banner_copy_modulo_prom_class: 'bnr-xl',
      banner_copy_modulo_promo_fontsize: '80px',
      banner_copy_modulo_promo_lineheight: '80px',
    })
    expect(sizingVars(names, { className: 'bnr-xl', fontSize: '125px', lineHeight: '125px' }, 'vertical')).toEqual({
      banner_copy_modulo_prom_class: 'bnr-xl',
      banner_copy_modulo_promo_fontsize_vertical: '125px',
      banner_copy_modulo_promo_lineheight_vertical: '125px',
    })
  })
})
