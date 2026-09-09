import { describe, expect, it } from 'vitest'
import { escapeHtmlAttr, escapeHtmlText, substituteImgSrcOrRemove } from '../htmlText'

describe('escapeHtmlText', () => {
  it('escapes & < >', () => {
    expect(escapeHtmlText('a & b < c > d')).toBe('a &amp; b &lt; c &gt; d')
  })
})

describe('escapeHtmlAttr', () => {
  it('escapes & < > " \'', () => {
    expect(escapeHtmlAttr(`a & b < c > d " e '`)).toBe('a &amp; b &lt; c &gt; d &quot; e &#39;')
  })
})

describe('substituteImgSrcOrRemove', () => {
  const FILE_NAME = 'test.html'
  const tag = (attrs: string) => `<div><img ${attrs}></div>`

  it('replaces src AND alt when the URL is non-blank', () => {
    const html = tag('src="PLACEHOLDER" alt="old alt"')
    const result = substituteImgSrcOrRemove(html, 'PLACEHOLDER', 'https://x.test/a.png', 'new alt', FILE_NAME)
    expect(result).toBe('<div><img src="https://x.test/a.png" alt="new alt"></div>')
  })

  it('removes the whole <img> (not just src="") when the URL is blank, alt included', () => {
    const html = tag('src="PLACEHOLDER" alt="old alt"')
    const result = substituteImgSrcOrRemove(html, 'PLACEHOLDER', '', 'new alt', FILE_NAME)
    expect(result).toBe('<div></div>')
  })

  it('treats a whitespace-only URL the same as blank', () => {
    const html = tag('src="PLACEHOLDER" alt="old alt"')
    const result = substituteImgSrcOrRemove(html, 'PLACEHOLDER', '   ', 'new alt', FILE_NAME)
    expect(result).not.toContain('<img')
  })

  it('escapes HTML-significant characters in both url and alt', () => {
    const html = tag('src="PLACEHOLDER" alt="old alt"')
    const result = substituteImgSrcOrRemove(html, 'PLACEHOLDER', 'https://x.test/a.png?x="1"', 'Say "hi" & <bye>', FILE_NAME)
    expect(result).toContain('src="https://x.test/a.png?x=&quot;1&quot;"')
    expect(result).toContain('alt="Say &quot;hi&quot; &amp; &lt;bye&gt;"')
  })

  it('only touches the ONE <img> that owns the placeholder, not sibling attributes/tags', () => {
    const html = '<div><img src="OTHER" alt="untouched"><img src="PLACEHOLDER" alt="mine"></div>'
    const result = substituteImgSrcOrRemove(html, 'PLACEHOLDER', 'https://x.test/a.png', 'new', FILE_NAME)
    expect(result).toContain('src="OTHER" alt="untouched"')
    expect(result).toContain('src="https://x.test/a.png" alt="new"')
  })

  it('throws if the placeholder is not found', () => {
    expect(() => substituteImgSrcOrRemove('<img src="X">', 'MISSING', 'https://x.test/a.png', 'alt', FILE_NAME)).toThrow(/no se encontró "MISSING"/)
  })

  it('throws if the placeholder is not inside an <img> tag', () => {
    expect(() => substituteImgSrcOrRemove('<div>PLACEHOLDER</div>', 'PLACEHOLDER', 'https://x.test/a.png', 'alt', FILE_NAME)).toThrow(
      /no se encontró la apertura "<img"/,
    )
  })

  it('throws if the <img> has no alt="..." attribute to substitute (blank-URL path is exempt — nothing to substitute there)', () => {
    const html = '<img src="PLACEHOLDER">'
    expect(() => substituteImgSrcOrRemove(html, 'PLACEHOLDER', 'https://x.test/a.png', 'alt', FILE_NAME)).toThrow(/no se encontró alt="\.\.\."/)
    expect(() => substituteImgSrcOrRemove(html, 'PLACEHOLDER', '', 'alt', FILE_NAME)).not.toThrow()
  })
})
