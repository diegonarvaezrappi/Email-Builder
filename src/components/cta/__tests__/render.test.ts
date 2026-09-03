import { describe, expect, it } from 'vitest'
import { defaultCtaFields } from '../schema'
import { renderCtaAssignLines, renderCtaSnippet, CTA_CONTENT_BLOCK_NAME } from '../render'

describe('renderCtaAssignLines', () => {
  it('emits the 5 assign lines in the same shape/order as cta-llamado.html', () => {
    const lines = renderCtaAssignLines({ text: 'Pide ya', deeplink: 'https://rappi.com', align: 'left', size: 'small' }, 'verde')
    expect(lines).toEqual([
      "{% assign cta_alineado = 'left' %}",
      "{% assign cta_size = 'small' %}",
      "{% assign text_cta = 'Pide ya' %}",
      "{% assign deeplink_cta = 'https://rappi.com' %}",
      "{% assign style_Look = 'verde' %}",
    ])
  })

  it('emits the chosen cta_size verbatim ("big"/"small")', () => {
    const big = renderCtaAssignLines({ ...defaultCtaFields, size: 'big' }, 'neon')
    const small = renderCtaAssignLines({ ...defaultCtaFields, size: 'small' }, 'neon')
    expect(big).toContain("{% assign cta_size = 'big' %}")
    expect(small).toContain("{% assign cta_size = 'small' %}")
  })

  it('escapes single quotes in text/deeplink via toLiquidStringLiteral', () => {
    const lines = renderCtaAssignLines({ text: "Pide 'ya'", deeplink: '#', align: 'center', size: 'big' }, 'neon')
    expect(lines[2]).toBe(`{% assign text_cta = "Pide 'ya'" %}`)
  })

  it('does not duplicate the 35-char truncation — that lives in cta-template.html itself', () => {
    // Liquid trunca `text_cta` a 35 caracteres DENTRO del content block
    // (`{% assign text_cta = text_cta | truncate: 35 %}`), tanto en Braze real
    // como en el preview (que infla ese mismo content block). Acá se emite el
    // texto completo tal cual, sin recortar.
    const longText = 'x'.repeat(60)
    const lines = renderCtaAssignLines({ ...defaultCtaFields, text: longText }, 'neon')
    expect(lines[2]).toContain(longText)
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

  it('defaults size to "big" — reproduces the only visual that existed before cta_size existed', () => {
    expect(defaultCtaFields.size).toBe('big')
    expect(renderCtaSnippet(defaultCtaFields, 'neon')).toContain("cta_size = 'big'")
  })
})
