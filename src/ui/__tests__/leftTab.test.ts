import { describe, expect, it } from 'vitest'
import { leftTabForSelection } from '../leftTab'
import { selectBannerItem, selectBlock, selectDealCardPiece, selectGlobalBackground, selectModuleItem, selectSlot } from '../selection'

describe('leftTabForSelection', () => {
  it('sends everything inside the HERO section to the Hero tab', () => {
    expect(leftTabForSelection(selectSlot('HEADER'))).toBe('hero')
    expect(leftTabForSelection(selectSlot('BANNER'))).toBe('hero')
    expect(leftTabForSelection(selectBannerItem('x'))).toBe('hero')
    expect(leftTabForSelection(selectGlobalBackground('HERO_BG'))).toBe('hero')
  })

  it('sends body modules, their children, the contents background and the footer to the Contents tab', () => {
    expect(leftTabForSelection(selectBlock('b'))).toBe('contents')
    expect(leftTabForSelection(selectDealCardPiece('c', 'precio'))).toBe('contents')
    expect(leftTabForSelection(selectModuleItem('m'))).toBe('contents')
    expect(leftTabForSelection(selectGlobalBackground('CONTENTS_BG'))).toBe('contents')
    expect(leftTabForSelection(selectSlot('FOOTER'))).toBe('contents')
  })

  it('keeps the current tab when nothing is selected', () => {
    expect(leftTabForSelection(null)).toBeNull()
  })
})
