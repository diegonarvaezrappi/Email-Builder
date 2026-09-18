import { describe, expect, it } from 'vitest'
import { isNoRepeat, repeatsX, repeatsY, withNoRepeat, withRepeatX, withRepeatY } from '../background'

describe('repeatsX / repeatsY / isNoRepeat', () => {
  it('reads the 2 axes independently off the 4 real CSS values', () => {
    expect(repeatsX('repeat')).toBe(true)
    expect(repeatsY('repeat')).toBe(true)
    expect(repeatsX('repeat-x')).toBe(true)
    expect(repeatsY('repeat-x')).toBe(false)
    expect(repeatsX('repeat-y')).toBe(false)
    expect(repeatsY('repeat-y')).toBe(true)
    expect(repeatsX('no-repeat')).toBe(false)
    expect(repeatsY('no-repeat')).toBe(false)
    expect(isNoRepeat('no-repeat')).toBe(true)
    expect(isNoRepeat('repeat')).toBe(false)
  })
})

describe('withRepeatX / withRepeatY', () => {
  it('checking one axis while the other is off lands on the single-axis value', () => {
    expect(withRepeatX('no-repeat', true)).toBe('repeat-x')
    expect(withRepeatY('no-repeat', true)).toBe('repeat-y')
  })

  it('checking one axis while the other is already on merges into "repeat"', () => {
    expect(withRepeatX('repeat-y', true)).toBe('repeat')
    expect(withRepeatY('repeat-x', true)).toBe('repeat')
  })

  it('unchecking one axis while the other stays on keeps the single-axis value', () => {
    expect(withRepeatX('repeat', false)).toBe('repeat-y')
    expect(withRepeatY('repeat', false)).toBe('repeat-x')
  })

  it('unchecking the only active axis lands on "no-repeat"', () => {
    expect(withRepeatX('repeat-x', false)).toBe('no-repeat')
    expect(withRepeatY('repeat-y', false)).toBe('no-repeat')
  })
})

describe('withNoRepeat', () => {
  // Pedido explícito del usuario (2026-09-16): una 3ra casilla ADICIONAL a
  // los 2 checkboxes de eje, no algo que el usuario deba deducir destildando
  // los 2 a mano.
  it('checking it forces no-repeat regardless of the previous value', () => {
    expect(withNoRepeat(true)).toBe('no-repeat')
  })

  it('unchecking it goes back to "repeat" (both axes on — the real CSS default)', () => {
    expect(withNoRepeat(false)).toBe('repeat')
  })
})
