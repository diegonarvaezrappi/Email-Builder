import { describe, expect, it } from 'vitest'
import { LIQUID_COLOR_TOKENS, renderRichText } from '../render'
import type { RichText, RichTextColorMap } from '../model'

const HEX_COLORS: RichTextColorMap = { colorBase: '#2B2316', colorAcento1: '#D89950', colorAcento2: '#FF441F' }

describe('renderRichText', () => {
  it('a plain run (no marks) renders as escaped text, no wrapper', () => {
    const runs: RichText = [{ text: 'a < b & "c"', marks: [] }]
    expect(renderRichText(runs, HEX_COLORS)).toBe('a &lt; b &amp; "c"')
  })

  it('bold/italic/strike/underline all become inline style properties on one span, not tags', () => {
    const runs: RichText = [{ text: 'x', marks: ['bold', 'italic', 'strike', 'underline'] }]
    const html = renderRichText(runs, HEX_COLORS)
    expect(html).toBe('<span style="text-decoration: underline line-through; font-weight: bold; font-style: italic;">x</span>')
  })

  it('superscript wraps the (possibly already-styled) span in <sup>', () => {
    const runs: RichText = [{ text: '***', marks: ['superscript'] }]
    expect(renderRichText(runs, HEX_COLORS)).toBe('<sup>***</sup>')

    const styledAndSup: RichText = [{ text: '***', marks: ['bold', 'superscript'] }]
    expect(renderRichText(styledAndSup, HEX_COLORS)).toBe('<sup><span style="font-weight: bold;">***</span></sup>')
  })

  it('color marks resolve through whatever color map is passed in — real hex for preview', () => {
    const runs: RichText = [{ text: 'x', marks: ['colorAcento2'] }]
    expect(renderRichText(runs, HEX_COLORS)).toBe('<span style="color: #FF441F;">x</span>')
  })

  it('color marks resolve to the Liquid token map for the baked banner output — theme-agnostic', () => {
    const runs: RichText = [{ text: 'x', marks: ['colorAcento1'] }]
    expect(renderRichText(runs, LIQUID_COLOR_TOKENS)).toBe('<span style="color: {{color_acento1_mail_general}};">x</span>')
  })

  it('multiple runs concatenate in order', () => {
    const runs: RichText = [
      { text: 'hola ', marks: [] },
      { text: 'mundo', marks: ['bold'] },
    ]
    expect(renderRichText(runs, HEX_COLORS)).toBe('hola <span style="font-weight: bold;">mundo</span>')
  })
})
