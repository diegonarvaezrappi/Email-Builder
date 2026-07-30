import { describe, expect, it } from 'vitest'
import { cssUrlValue, resolveGlobalVars } from '../vars'
import { defaultGlobalFields } from '../schema'

const globals = (over: Partial<typeof defaultGlobalFields> = {}) => ({ ...defaultGlobalFields, ...over })

describe('cssUrlValue', () => {
  it('leaves a normal URL alone', () => {
    const url = 'https://lh3.googleusercontent.com/d/1qztlsmSfPI2eNsQ_ej-Y6oE7U94MGLSn'
    expect(cssUrlValue(url)).toBe(url)
  })

  it('trims surrounding whitespace, which pasting often brings along', () => {
    expect(cssUrlValue('  https://x.test/a.png \n')).toBe('https://x.test/a.png')
  })

  it('escapes what would close the url(...) early', () => {
    // Sin escapar, el `)` cerraría el paréntesis y el resto se leería como CSS.
    expect(cssUrlValue('https://x.test/a(b).png')).toBe('https://x.test/a%28b%29.png')
    expect(cssUrlValue('a"b')).toBe('a%22b')
    expect(cssUrlValue("a'b")).toBe('a%27b')
    expect(cssUrlValue('a\\b')).toBe('a%5Cb')
  })

  it('escapes inner whitespace, which would split the value in two', () => {
    expect(cssUrlValue('https://x.test/a b.png')).toBe('https://x.test/a%20b.png')
  })

  it('is empty for an empty or blank value', () => {
    expect(cssUrlValue('')).toBe('')
    expect(cssUrlValue('   ')).toBe('')
  })

  it('keeps Liquid usable as a background', () => {
    expect(cssUrlValue('{{content_blocks.${FONDO}}}')).toBe('{{content_blocks.${FONDO}}}')
  })
})

describe('resolveGlobalVars', () => {
  it('starts from the theme variables', () => {
    expect(resolveGlobalVars(globals({ tema: 'beige100' }))).toMatchObject({
      bg_solid_mail_general: '#FFF0DD',
      color_texto_mail_general: '#2B2316',
    })
  })

  it('fills bg_imgevento_mail_general, which no theme defines', () => {
    const vars = resolveGlobalVars(globals({ fondoUrl: 'https://x.test/a.png' }))
    expect(vars.bg_imgevento_mail_general).toBe('https://x.test/a.png')
  })

  it('leaves bg_imgevento_mail_general unset when there is no background', () => {
    expect(resolveGlobalVars(globals({ fondoUrl: '' })).bg_imgevento_mail_general).toBeUndefined()
  })

  it('does not let the background leak into other theme variables', () => {
    const vars = resolveGlobalVars(globals({ tema: 'pro', fondoUrl: 'https://x.test/a.png' }))
    expect(vars.bg_solid_mail_general).toBe('#2A2B2B')
    expect(vars.color_texto_mail_general).toBe('#EEEEEE')
  })
})
