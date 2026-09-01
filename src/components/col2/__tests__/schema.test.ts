import { describe, expect, it } from 'vitest'
import { cloneCol2Fields, createDefaultCol2Fields, defaultCol2Fields } from '../schema'

describe('defaultCol2Fields', () => {
  it('reproduces the master default literally: TITULO_TEXTO + SEPARADOR_LINEA + SUBTITULO_TEXTO, same as TITLE', () => {
    expect(defaultCol2Fields.items.map((it) => it.type)).toEqual(['TITULO_TEXTO', 'SEPARADOR_LINEA', 'SUBTITULO_TEXTO'])
    expect(defaultCol2Fields.items.every((it) => it.areaKey === 'main')).toBe(true)
  })

  it('has fixed, literal item ids (deterministic, not newId())', () => {
    expect(defaultCol2Fields.items.map((it) => it.id)).toEqual([
      'col2-item-titulo-default',
      'col2-item-separador-default',
      'col2-item-subtitulo-default',
    ])
  })

  it('image defaults to "modificable" mode with its own factory URL, border-radius ON (matches the master)', () => {
    expect(defaultCol2Fields.image.mode).toBe('modificable')
    expect(defaultCol2Fields.image.imageUrl).toBe('https://lh3.googleusercontent.com/d/14VKG5CPVNPIVbOQYkyHgtxfW1uLorjXP')
    expect(defaultCol2Fields.image.borderRadiusEnabled).toBe(true)
    expect(defaultCol2Fields.image.widthPercent).toBe('90')
  })

  it('imageBackgroundEnabled defaults ON (master ships the background-image by default) — independent of the general backgroundEnabled (default OFF)', () => {
    expect(defaultCol2Fields.imageBackgroundEnabled).toBe(true)
    expect(defaultCol2Fields.backgroundEnabled).toBe(false)
  })

  it('cellOrder defaults to textoPrimero (the master\'s own literal order)', () => {
    expect(defaultCol2Fields.cellOrder).toBe('textoPrimero')
  })
})

describe('createDefaultCol2Fields', () => {
  it('generates fresh ids on every call, so 2 inserted blocks never collide', () => {
    const a = createDefaultCol2Fields()
    const b = createDefaultCol2Fields()
    const aIds = a.items.map((it) => it.id)
    const bIds = b.items.map((it) => it.id)
    expect(new Set([...aIds, ...bIds]).size).toBe(6)
  })

  it('does not reuse defaultCol2Fields\' fixed ids', () => {
    const fresh = createDefaultCol2Fields()
    const fixedIds = new Set(defaultCol2Fields.items.map((it) => it.id))
    for (const item of fresh.items) expect(fixedIds.has(item.id)).toBe(false)
  })
})

describe('cloneCol2Fields', () => {
  it('preserves user field values (incl. image/cellOrder) but regenerates every item id', () => {
    const original = createDefaultCol2Fields()
    original.image = { ...original.image, mode: 'full', imageUrl: 'https://x.test/mine.png' }
    original.cellOrder = 'imagenPrimero'
    const clone = cloneCol2Fields(original)

    expect(clone.image).toEqual(original.image)
    expect(clone.cellOrder).toBe('imagenPrimero')
    expect(clone.items.map((it) => it.id)).not.toEqual(original.items.map((it) => it.id))
    expect(clone.items.map((it) => it.type)).toEqual(original.items.map((it) => it.type))
  })
})
