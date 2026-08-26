import { describe, expect, it } from 'vitest'
import { applyEdits, elementBounds, indexOfOrThrow, textRunBounds, voidElementBounds } from '../htmlEdits'

const FILE = 'fixture.html'

describe('indexOfOrThrow', () => {
  it('returns the index when found', () => {
    expect(indexOfOrThrow('<p>hola</p>', 'hola', FILE)).toBe(3)
  })

  it('respects the "from" offset', () => {
    expect(indexOfOrThrow('a a a', 'a', FILE, 2)).toBe(2)
  })

  it('throws, naming the file, when the literal is gone', () => {
    expect(() => indexOfOrThrow('<p>hola</p>', 'chau', FILE)).toThrow(/fixture\.html.*"chau"/)
  })
})

describe('elementBounds', () => {
  it('finds the tag boundaries around an anchor index', () => {
    const html = '<div>before<span>x</span>after</div>'
    const bounds = elementBounds(html, html.indexOf('x'), 'span', FILE)
    expect(html.slice(bounds.start, bounds.end)).toBe('<span>x</span>')
  })

  it('counts nesting so a nested same-tag child does not cut the outer close early', () => {
    const html = '<div id="outer"><div id="inner">x</div></div>'
    const bounds = elementBounds(html, html.indexOf('x'), 'div', FILE)
    expect(html.slice(bounds.start, bounds.end)).toBe('<div id="inner">x</div>')
    const outerBounds = elementBounds(html, html.indexOf('id="outer"'), 'div', FILE)
    expect(html.slice(outerBounds.start, outerBounds.end)).toBe(html)
  })

  it('throws when the closing tag is missing', () => {
    expect(() => elementBounds('<div>x', 0, 'div', FILE)).toThrow(/fixture\.html/)
  })
})

describe('voidElementBounds', () => {
  it('finds a self-closing-style void element by its attribute', () => {
    const html = '<p><img src="x.png" alt="y"></p>'
    const bounds = voidElementBounds(html, html.indexOf('src='), 'img', FILE)
    expect(html.slice(bounds.start, bounds.end)).toBe('<img src="x.png" alt="y">')
  })
})

describe('textRunBounds', () => {
  it('finds only the text content, not an inner tag before it', () => {
    const html = '<h4><img src="x.png"> hola </h4>'
    const bounds = elementBounds(html, html.indexOf('img'), 'h4', FILE)
    const textBounds = textRunBounds(html, bounds, 'h4', FILE)
    expect(html.slice(textBounds.start, textBounds.end)).toBe(' hola ')
  })
})

describe('applyEdits', () => {
  it('applies multiple edits back-to-front so earlier indices stay valid', () => {
    const html = 'abcdefgh'
    const out = applyEdits(
      html,
      [
        { start: 0, end: 1, replacement: 'X' },
        { start: 4, end: 5, replacement: 'Y' },
      ],
      FILE,
    )
    expect(out).toBe('XbcdYfgh')
  })

  it('throws on overlapping edits instead of silently corrupting the output', () => {
    expect(() =>
      applyEdits(
        'abcdef',
        [
          { start: 0, end: 3, replacement: 'X' },
          { start: 2, end: 4, replacement: 'Y' },
        ],
        FILE,
      ),
    ).toThrow(/fixture\.html.*superpuestas/)
  })
})
