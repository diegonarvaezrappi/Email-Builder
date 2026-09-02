import { describe, expect, it } from 'vitest'
import { cloneLogosFields, createDefaultLogosFields, defaultLogosFields } from '../schema'

describe('defaultLogosFields', () => {
  it('reproduces the master default literally: TITULO_TEXTO + SEPARADOR_LINEA + SUBTITULO_TEXTO, same as TITLE/COL2', () => {
    expect(defaultLogosFields.items.map((it) => it.type)).toEqual(['TITULO_TEXTO', 'SEPARADOR_LINEA', 'SUBTITULO_TEXTO'])
    expect(defaultLogosFields.items.every((it) => it.areaKey === 'main')).toBe(true)
  })

  it('has fixed, literal item ids (deterministic, not newId())', () => {
    expect(defaultLogosFields.items.map((it) => it.id)).toEqual([
      'logos-item-titulo-default',
      'logos-item-separador-default',
      'logos-item-subtitulo-default',
    ])
  })

  it('gridSize defaults to 3, cellOrder defaults to textoPrimero (the master\'s own literal order)', () => {
    expect(defaultLogosFields.gridSize).toBe('3')
    expect(defaultLogosFields.cellOrder).toBe('textoPrimero')
  })

  it('logosBorderRadiusEnabled defaults ON (the master ships 7px on every logo cell)', () => {
    expect(defaultLogosFields.logosBorderRadiusEnabled).toBe(true)
  })

  it('has a fixed tuple of 6 logo slots, all sharing the master\'s own factory URL, all with links OFF by default', () => {
    expect(defaultLogosFields.logos).toHaveLength(6)
    for (const logo of defaultLogosFields.logos) {
      expect(logo.imageUrl).toBe('https://lh3.googleusercontent.com/d/1B4hOqqkpKSu2cQHale6dE-hfLX6yfO7O')
      expect(logo.linkEnabled).toBe(false)
    }
  })

  it('the module\'s own general link/background default OFF too', () => {
    expect(defaultLogosFields.linkEnabled).toBe(false)
    expect(defaultLogosFields.backgroundEnabled).toBe(false)
  })
})

describe('createDefaultLogosFields', () => {
  it('generates fresh ids on every call, so 2 inserted blocks never collide', () => {
    const a = createDefaultLogosFields()
    const b = createDefaultLogosFields()
    const aIds = a.items.map((it) => it.id)
    const bIds = b.items.map((it) => it.id)
    expect(new Set([...aIds, ...bIds]).size).toBe(6)
  })

  it('still ships 6 logo slots with the factory URL', () => {
    const fresh = createDefaultLogosFields()
    expect(fresh.logos).toHaveLength(6)
    expect(fresh.logos[5].imageUrl).toBe('https://lh3.googleusercontent.com/d/1B4hOqqkpKSu2cQHale6dE-hfLX6yfO7O')
  })
})

describe('cloneLogosFields', () => {
  it('preserves user field values (incl. all 6 logo slots + gridSize) but regenerates every item id', () => {
    const original = createDefaultLogosFields()
    original.gridSize = '6'
    original.logos[4] = { imageUrl: 'https://x.test/logo5.png', linkEnabled: true, link: 'https://x.test/l5' }
    const clone = cloneLogosFields(original)

    expect(clone.gridSize).toBe('6')
    expect(clone.logos).toEqual(original.logos)
    expect(clone.items.map((it) => it.id)).not.toEqual(original.items.map((it) => it.id))
    expect(clone.items.map((it) => it.type)).toEqual(original.items.map((it) => it.type))
  })
})
