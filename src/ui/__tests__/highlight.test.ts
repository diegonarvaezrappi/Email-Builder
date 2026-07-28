import { describe, expect, it } from 'vitest'
import templateBaseRaw from '../../assets/templates/template_base.html?raw'
import { defaultEmailDocument } from '../../registry'
import { assembleEmailHtml } from '../../template/assemble'
import { tokenizeHtml, type Token } from '../highlight'

const text = (tokens: Token[]) => tokens.map((t) => t.value).join('')
const kindsOf = (src: string, value: string) =>
  tokenizeHtml(src)
    .filter((t) => t.value.includes(value))
    .map((t) => t.kind)

describe('tokenizeHtml · el formato del HTML nunca se pierde', () => {
  // Es LA garantía de esta vista: solo colorea, no reformatea. Si algún día un
  // token se come o duplica un carácter, esto lo caza.
  it('reproduces the assembled email byte for byte', () => {
    const html = assembleEmailHtml(defaultEmailDocument)
    expect(text(tokenizeHtml(html))).toBe(html)
  })

  it('reproduces the raw master template byte for byte', () => {
    expect(text(tokenizeHtml(templateBaseRaw))).toBe(templateBaseRaw)
  })

  it('preserves indentation, tabs and blank lines exactly', () => {
    const src = '<div>\n\t\t<p>  hola  </p>\n\n\n   </div>\n'
    expect(text(tokenizeHtml(src))).toBe(src)
  })

  it.each([
    '',
    '<',
    '<div',
    '<!-- sin cerrar',
    '{% assign x =',
    '{{ sin cerrar',
    '<style>body{color:',
    '<div attr="sin cerrar',
  ])('survives malformed input without losing text: %j', (src) => {
    expect(text(tokenizeHtml(src))).toBe(src)
  })
})

describe('tokenizeHtml · clasificación', () => {
  it('marks tag names, attributes and values', () => {
    const tokens = tokenizeHtml('<td bgcolor="#FFF0DD">x</td>')
    expect(tokens).toEqual([
      { kind: 'punct', value: '<' },
      { kind: 'tagName', value: 'td' },
      { kind: 'text', value: ' ' },
      { kind: 'attrName', value: 'bgcolor' },
      { kind: 'punct', value: '=' },
      { kind: 'attrValue', value: '"#FFF0DD"' },
      { kind: 'punct', value: '>' },
      { kind: 'text', value: 'x' },
      { kind: 'punct', value: '</' },
      { kind: 'tagName', value: 'td' },
      { kind: 'punct', value: '>' },
    ])
  })

  it('marks Liquid as liquid, in text and inside attributes', () => {
    expect(kindsOf("{% assign cond = '' %}", 'assign')).toEqual(['liquid'])
    expect(kindsOf('{{content_blocks}}', 'content_blocks')).toEqual(['liquid'])
    // Dentro de un atributo el Liquid no debe quedar pintado como string.
    expect(kindsOf('<td bgcolor="{{bg_solid_mail_general}}">', 'bg_solid')).toEqual(['liquid'])
  })

  it('marks the Braze ${...} shorthand distinctly', () => {
    expect(kindsOf('${user_id}', 'user_id')).toEqual(['braze'])
  })

  it('consumes the whole {{content_blocks.${X}}}, closing brace included', () => {
    // Buscar el primer `}}` cortaría el token una llave antes y dejaría un `}`
    // huérfano sin colorear; el cierre real es el tercero.
    const src = '{{content_blocks.${FOOTER_q1_2024_legales}}}'
    const tokens = tokenizeHtml(src)
    expect(text(tokens)).toBe(src)
    expect(tokens.map((t) => t.kind)).not.toContain('text')
    // Y el nombre del content block se distingue dentro del Liquid.
    expect(kindsOf(src, 'FOOTER_q1_2024_legales')).toEqual(['braze'])
  })

  it('keeps the {{ }} wrapper as liquid around the inner ${...}', () => {
    expect(tokenizeHtml('{{content_blocks.${X}}}')).toEqual([
      { kind: 'liquid', value: '{{content_blocks.' },
      { kind: 'braze', value: '${X}' },
      { kind: 'liquid', value: '}}' },
    ])
  })

  it('marks comments and the doctype', () => {
    expect(kindsOf('<!-- FOOTER -->', 'FOOTER')).toEqual(['comment'])
    expect(kindsOf('<!doctype html>', 'doctype')).toEqual(['doctype'])
  })

  it('does not treat a comment as markup, even with tags inside', () => {
    expect(kindsOf('<!-- <table> {% if x %} -->', '<table>')).toEqual(['comment'])
  })

  it('separates CSS selectors, properties and values inside <style>', () => {
    expect(kindsOf('<style>.wrapper{color:#fff}</style>', '.wrapper')).toEqual(['cssSelector'])
    expect(kindsOf('<style>.wrapper{color:#fff}</style>', 'color')).toEqual(['cssProp'])
    expect(kindsOf('<style>.wrapper{color:#fff}</style>', '#fff')).toEqual(['cssValue'])
    expect(kindsOf('<style>@media screen{a{color:red}}</style>', '@media')).toEqual(['cssAtRule'])
  })

  it('goes back to HTML after the style block closes', () => {
    expect(kindsOf('<style>a{color:red}</style><div>', 'div')).toEqual(['tagName'])
  })
})
