import { describe, expect, it } from 'vitest'
import { moduleBackgroundVars, resolveModuleLink, substituteModuleAlignVars } from '../generalRender'

describe('substituteModuleAlignVars', () => {
  it("left -> body_alineado_molecular='left', alineado_molecular_mail_body='0px' (literal del maestro)", () => {
    const html = 'text-align: {{body_alineado_molecular}}; margin: {{alineado_molecular_mail_body}};'
    expect(substituteModuleAlignVars(html, 'left')).toBe('text-align: left; margin: 0px;')
  })

  it("center -> body_alineado_molecular='center', alineado_molecular_mail_body='0 auto'", () => {
    const html = 'text-align: {{body_alineado_molecular}}; margin: {{alineado_molecular_mail_body}};'
    expect(substituteModuleAlignVars(html, 'center')).toBe('text-align: center; margin: 0 auto;')
  })

  it('replaces every occurrence, not just the first', () => {
    const html = '{{body_alineado_molecular}} {{body_alineado_molecular}}'
    expect(substituteModuleAlignVars(html, 'left')).toBe('left left')
  })
})

describe('moduleBackgroundVars', () => {
  it('returns the "on" variant when enabled, the real theme values', () => {
    const vars = moduleBackgroundVars('beige100', true)
    expect(vars.bg_contenedor1_mail_general).toBe('rgba(242,211,174,0.5)')
    expect(vars.body_container_background_radius).toBe(' 16px')
  })

  it('returns the "off" variant when disabled, transparent/0px', () => {
    const vars = moduleBackgroundVars('beige100', false)
    expect(vars.bg_contenedor1_mail_general).toBe('rgba(0,0,0,0.0)')
    expect(vars.body_container_background_radius).toBe('0px')
  })

  it('returns an empty map for an unknown theme', () => {
    expect(moduleBackgroundVars('no-existe', true)).toEqual({})
  })
})

describe('resolveModuleLink', () => {
  const html = '<a href="LINKMODULO"><div>contenido</div></a>'

  it('disabled (default): unwraps the <a>, keeping its content, adding nothing new', () => {
    expect(resolveModuleLink(html, 'LINKMODULO', false, '', 'fixture.html')).toBe('<div>contenido</div>')
  })

  it('enabled: substitutes the token with the real link, keeps the <a>', () => {
    expect(resolveModuleLink(html, 'LINKMODULO', true, 'https://x.test', 'fixture.html')).toBe(
      '<a href="https://x.test"><div>contenido</div></a>',
    )
  })

  it('escapes HTML-significant characters in the link', () => {
    expect(resolveModuleLink(html, 'LINKMODULO', true, 'https://x.test?a=1&b=2', 'fixture.html')).toContain(
      'href="https://x.test?a=1&amp;b=2"',
    )
  })

  it('throws when the token is gone', () => {
    expect(() => resolveModuleLink('<div>x</div>', 'LINKMODULO', false, '', 'fixture.html')).toThrow(/fixture\.html/)
  })
})
