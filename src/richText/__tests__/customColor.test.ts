// @vitest-environment jsdom
// Color personalizado en hexadecimal (`run.color`), excluyente con los 3
// colores del tema — ver model.ts / edit.ts.
import { describe, expect, it } from 'vitest'
import { domToRichText } from '../dom'
import { clearMarks, rangeCustomColor, setColorMark, setCustomColor, toggleMark } from '../edit'
import { normalizeHexColor, richTextSchema, type RichText, type RichTextColorMap } from '../model'
import { LIQUID_COLOR_TOKENS, renderRichText } from '../render'

const HEX_COLORS: RichTextColorMap = { colorBase: '#2B2316', colorAcento1: '#D89950', colorAcento2: '#FF441F' }
const plain = (text: string): RichText => [{ text, marks: [] }]

function container(html: string): HTMLElement {
  const el = document.createElement('div')
  el.innerHTML = html
  return el
}

describe('normalizeHexColor', () => {
  it('accepts 6 and 3 digits, with or without #, and uppercases', () => {
    expect(normalizeHexColor('#ff441f')).toBe('#FF441F')
    expect(normalizeHexColor('ff441f')).toBe('#FF441F')
    expect(normalizeHexColor(' #abc ')).toBe('#AABBCC')
  })

  it('rejects anything else, including alpha and css injection', () => {
    for (const bad of ['', '#12', '#12345', '#1234567', '#FF441F80', 'red', 'rgb(1,2,3)', '#FF441F; background: url(x)']) {
      expect(normalizeHexColor(bad)).toBeNull()
    }
  })
})

describe('richTextSchema · color', () => {
  it('keeps a valid color, normalized', () => {
    expect(richTextSchema.parse([{ text: 'x', marks: [], color: '#ff441f' }])).toEqual([{ text: 'x', marks: [], color: '#FF441F' }])
  })

  it('drops an invalid color instead of rejecting the document', () => {
    const parsed = richTextSchema.parse([{ text: 'x', marks: ['bold'], color: 'javascript:alert(1)' }])
    expect(parsed).toEqual([{ text: 'x', marks: ['bold'] }])
    expect(parsed[0].color).toBeUndefined()
  })

  it('documents saved before this feature still parse', () => {
    expect(richTextSchema.parse([{ text: 'x', marks: ['colorBase'] }])).toEqual([{ text: 'x', marks: ['colorBase'] }])
  })
})

describe('setCustomColor', () => {
  it('colors only the selected range, splitting the run', () => {
    expect(setCustomColor(plain('hola mundo'), 5, 10, '#123abc')).toEqual([
      { text: 'hola ', marks: [] },
      { text: 'mundo', marks: [], color: '#123ABC' },
    ])
  })

  it('replaces a theme color but keeps the other marks', () => {
    const runs: RichText = [{ text: 'mundo', marks: ['bold', 'colorAcento1'] }]
    expect(setCustomColor(runs, 0, 5, '#000000')).toEqual([{ text: 'mundo', marks: ['bold'], color: '#000000' }])
  })

  it('null removes it and merges back with the neighbours', () => {
    const colored = setCustomColor(plain('hola mundo'), 5, 10, '#123ABC')
    expect(setCustomColor(colored, 5, 10, null)).toEqual(plain('hola mundo'))
  })

  it('an invalid hex is treated as removing the color', () => {
    const colored = setCustomColor(plain('hola'), 0, 4, '#123ABC')
    expect(setCustomColor(colored, 0, 4, 'nope')).toEqual(plain('hola'))
  })

  it('runs with different colors do not merge, same color does', () => {
    let runs = setCustomColor(plain('abcd'), 0, 2, '#111111')
    runs = setCustomColor(runs, 2, 4, '#222222')
    expect(runs).toHaveLength(2)
    expect(setCustomColor(runs, 2, 4, '#111111')).toEqual([{ text: 'abcd', marks: [], color: '#111111' }])
  })

  it('other edits keep the color on the pieces they split', () => {
    const colored = setCustomColor(plain('hola mundo'), 0, 10, '#123ABC')
    expect(toggleMark(colored, 0, 4, 'bold')).toEqual([
      { text: 'hola', marks: ['bold'], color: '#123ABC' },
      { text: ' mundo', marks: [], color: '#123ABC' },
    ])
  })
})

describe('theme color vs custom color', () => {
  it('a theme color mark replaces the custom color', () => {
    const colored = setCustomColor(plain('x'), 0, 1, '#123ABC')
    expect(setColorMark(colored, 0, 1, 'colorBase')).toEqual([{ text: 'x', marks: ['colorBase'] }])
  })

  it('setColorMark(null) clears a custom color too', () => {
    const colored = setCustomColor(plain('x'), 0, 1, '#123ABC')
    expect(setColorMark(colored, 0, 1, null)).toEqual(plain('x'))
  })

  it('"Quitar formato" removes the custom color', () => {
    const colored = setCustomColor([{ text: 'x', marks: ['bold'] }], 0, 1, '#123ABC')
    expect(clearMarks(colored, 0, 1)).toEqual(plain('x'))
  })
})

describe('rangeCustomColor', () => {
  it('returns the color shared by the whole range, null otherwise', () => {
    const runs = setCustomColor(plain('abcd'), 0, 2, '#111111')
    expect(rangeCustomColor(runs, 0, 2)).toBe('#111111')
    expect(rangeCustomColor(runs, 0, 1)).toBe('#111111')
    expect(rangeCustomColor(runs, 0, 4)).toBeNull()
    expect(rangeCustomColor(runs, 2, 4)).toBeNull()
    expect(rangeCustomColor(runs, 1, 1)).toBeNull()
  })
})

describe('render · custom color', () => {
  const runs: RichText = [{ text: 'x', marks: ['bold'], color: '#123ABC' }]

  it('the email output carries the literal hex, not a theme token, and no editor attribute', () => {
    expect(renderRichText(runs, LIQUID_COLOR_TOKENS)).toBe('<span style="color: #123ABC; font-weight: bold;">x</span>')
  })

  it('the editor output tags the span so it reads back as a custom color', () => {
    expect(renderRichText(runs, HEX_COLORS, { forEditor: true })).toBe(
      '<span data-rt-color="#123ABC" style="color: #123ABC; font-weight: bold;">x</span>',
    )
  })

  it('a color that skipped the schema (untyped tropicalize override) cannot inject css', () => {
    const unsafe = [{ text: 'x', marks: [], color: 'red; background: url(x)' }] as RichText
    expect(renderRichText(unsafe, LIQUID_COLOR_TOKENS)).toBe('x')
  })
})

describe('dom · custom color', () => {
  it('round-trips through the editor render', () => {
    const runs: RichText = [
      { text: 'hola ', marks: [] },
      { text: 'mundo', marks: ['italic'], color: '#123ABC' },
    ]
    expect(domToRichText(container(renderRichText(runs, HEX_COLORS, { forEditor: true })), HEX_COLORS)).toEqual(runs)
  })

  it('a custom color equal to a theme color stays custom (does not become the theme mark)', () => {
    const runs: RichText = [{ text: 'x', marks: [], color: '#FF441F' }]
    expect(domToRichText(container(renderRichText(runs, HEX_COLORS, { forEditor: true })), HEX_COLORS)).toEqual(runs)
  })

  it('a stray span color without the editor attribute is still not taken as a custom color', () => {
    expect(domToRichText(container('<span style="color: rgb(1, 2, 3);">x</span>'), HEX_COLORS)).toEqual(plain('x'))
  })
})
