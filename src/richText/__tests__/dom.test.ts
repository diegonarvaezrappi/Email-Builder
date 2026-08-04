// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { domToRichText } from '../dom'
import { renderRichText } from '../render'
import type { RichText, RichTextColorMap } from '../model'

const HEX_COLORS: RichTextColorMap = { colorBase: '#2B2316', colorAcento1: '#D89950', colorAcento2: '#FF441F' }

function container(html: string): HTMLElement {
  const el = document.createElement('div')
  el.innerHTML = html
  return el
}

describe('domToRichText', () => {
  it('a plain text node (no wrapper elements) becomes one unmarked run', () => {
    expect(domToRichText(container('hola mundo'), HEX_COLORS)).toEqual([{ text: 'hola mundo', marks: [] }])
  })

  it('reads bold/italic/strike/underline back from the style attribute', () => {
    const html = '<span style="text-decoration: underline line-through; font-weight: bold; font-style: italic;">x</span>'
    const runs = domToRichText(container(html), HEX_COLORS)
    expect(runs).toHaveLength(1)
    expect(runs[0].text).toBe('x')
    expect(new Set(runs[0].marks)).toEqual(new Set(['underline', 'strike', 'bold', 'italic']))
  })

  it('reads <sup> back as the superscript mark', () => {
    expect(domToRichText(container('<sup>***</sup>'), HEX_COLORS)).toEqual([{ text: '***', marks: ['superscript'] }])
  })

  it('matches a span color against the color map to recover the right color mark', () => {
    const runs = domToRichText(container('<span style="color: #FF441F;">x</span>'), HEX_COLORS)
    expect(runs).toEqual([{ text: 'x', marks: ['colorAcento2'] }])
  })

  it('a color that matches none of the 3 theme colors is dropped (defensive — should not happen in practice)', () => {
    const runs = domToRichText(container('<span style="color: rgb(1, 2, 3);">x</span>'), HEX_COLORS)
    expect(runs).toEqual([{ text: 'x', marks: [] }])
  })

  it('round-trips every combination of marks through render -> dom unchanged (marks compared as a set — order is not semantic)', () => {
    const cases: RichText = [
      { text: 'a', marks: [] },
      { text: 'b', marks: ['bold'] },
      { text: 'c', marks: ['italic', 'underline'] },
      { text: 'd', marks: ['strike', 'colorAcento1'] },
      { text: 'e', marks: ['superscript', 'colorBase'] },
      { text: 'f', marks: ['bold', 'italic', 'strike', 'underline', 'superscript', 'colorAcento2'] },
    ]
    for (const run of cases) {
      const html = renderRichText([run], HEX_COLORS)
      const roundTripped = domToRichText(container(html), HEX_COLORS)
      expect(roundTripped, JSON.stringify(run)).toHaveLength(1)
      expect(roundTripped[0].text, JSON.stringify(run)).toBe(run.text)
      expect(new Set(roundTripped[0].marks), JSON.stringify(run)).toEqual(new Set(run.marks))
    }
  })

  it('adjacent text nodes with identical resulting marks merge into one run', () => {
    const runs = domToRichText(container('<span style="font-weight: bold;">ho</span><span style="font-weight: bold;">la</span>'), HEX_COLORS)
    expect(runs).toEqual([{ text: 'hola', marks: ['bold'] }])
  })
})
