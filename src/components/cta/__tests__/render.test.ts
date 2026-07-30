import { describe, expect, it } from 'vitest'
import { defaultCtaFields } from '../schema'
import { renderCtaAssignLines, renderCtaSnippet, CTA_CONTENT_BLOCK_NAME } from '../render'

describe('renderCtaAssignLines', () => {
  it('emits the 4 assign lines in the same shape as cta-llamado.html', () => {
    const lines = renderCtaAssignLines({ text: 'Pide ya', deeplink: 'https://rappi.com', align: 'left' }, 'verde')
    expect(lines).toEqual([
      "{% assign cta_alineado = 'left' %}",
      "{% assign text_cta = 'Pide ya' %}",
      "{% assign deeplink_cta = 'https://rappi.com' %}",
      "{% assign style_Look = 'verde' %}",
    ])
  })

  it('escapes single quotes in text/deeplink via toLiquidStringLiteral', () => {
    const lines = renderCtaAssignLines({ text: "Pide 'ya'", deeplink: '#', align: 'center' }, 'neon')
    expect(lines[1]).toBe(`{% assign text_cta = "Pide 'ya'" %}`)
  })

  it('does not duplicate the 35-char truncation — that lives in cta-template.html itself', () => {
    // Liquid trunca `text_cta` a 35 caracteres DENTRO del content block
    // (`{% assign text_cta = text_cta | truncate: 35 %}`), tanto en Braze real
    // como en el preview (que infla ese mismo content block). Acá se emite el
    // texto completo tal cual, sin recortar.
    const longText = 'x'.repeat(60)
    const lines = renderCtaAssignLines({ ...defaultCtaFields, text: longText }, 'neon')
    expect(lines[1]).toContain(longText)
  })
})

describe('renderCtaSnippet', () => {
  it('ends with the reference to the CTA-template content block', () => {
    const snippet = renderCtaSnippet(defaultCtaFields, 'neon')
    expect(snippet).toContain(`{{content_blocks.\${${CTA_CONTENT_BLOCK_NAME}}}}`)
    expect(CTA_CONTENT_BLOCK_NAME).toBe('CTA-template')
  })

  it('reflects the global ctaStyle passed in, not a per-instance field', () => {
    const snippet = renderCtaSnippet(defaultCtaFields, 'pro')
    expect(snippet).toContain("style_Look = 'pro'")
  })
})
