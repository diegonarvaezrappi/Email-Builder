import { describe, expect, it } from 'vitest'
import { colorFooterForTheme, groupedThemes, parseThemes, THEMES, themeLabel, themeVars } from '../themes'

describe('parseThemes', () => {
  it('pairs each theme branch with the color_footer_mail_general inside it', () => {
    const fixture = `
      {% if tema_general_mail_general == 'beige100' %}
        {% assign bg_solid_mail_general = '#FFF0DD' %}
        {% assign color_footer_mail_general = 'negro' %}
      {% elsif tema_general_mail_general == 'problack' %}
        {% assign bg_solid_mail_general = '#ECEFF3' %}
        {% assign color_footer_mail_general = 'pro' %}
      {% endif %}
    `
    expect(parseThemes(fixture)).toEqual([
      { slug: 'beige100', vars: { bg_solid_mail_general: '#FFF0DD', color_footer_mail_general: 'negro' } },
      { slug: 'problack', vars: { bg_solid_mail_general: '#ECEFF3', color_footer_mail_general: 'pro' } },
    ])
  })

  it('does not bleed variables from the following branch', () => {
    // El chunk de cada tema se corta en la rama siguiente, así que un tema sin
    // variables propias queda vacío en vez de heredar las del que le sigue.
    const fixture = `
      {% if tema_general_mail_general == 'sinvars' %}
      {% elsif tema_general_mail_general == 'conpro' %}
        {% assign color_footer_mail_general = 'pro' %}
      {% endif %}
    `
    expect(parseThemes(fixture)).toEqual([
      { slug: 'sinvars', vars: {} },
      { slug: 'conpro', vars: { color_footer_mail_general: 'pro' } },
    ])
  })

  it('returns nothing when there are no theme branches', () => {
    expect(parseThemes('<!-- sin temas -->')).toEqual([])
  })
})

describe('THEMES (parsed from the real repo file)', () => {
  it('finds the 11 themes documented in 06-docs/GUIA-DE-TEMAS.md', () => {
    expect(THEMES.map((t) => t.slug)).toEqual([
      'beige100',
      'beige150',
      'rosa100',
      'purpura100',
      'celeste100',
      'verde100',
      'darkneon',
      'darkturbo',
      'darkneutro',
      'pro',
      'problack',
    ])
  })

  it('maps only Pro/ProBlack to the pro footer style', () => {
    expect(THEMES.filter((t) => t.vars.color_footer_mail_general === 'pro').map((t) => t.slug)).toEqual([
      'pro',
      'problack',
    ])
  })

  it('gives every theme the surface variables the master template consumes', () => {
    // bg_solid + color_texto los usa el wrapper del maestro y global-styles;
    // si a un tema le faltaran, el mail saldría sin fondo o sin color de texto.
    for (const t of THEMES) {
      expect(t.vars.bg_solid_mail_general, t.slug).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(t.vars.color_texto_mail_general, t.slug).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })
})

describe('themeVars', () => {
  it('resolves the real values of a theme, including its own slug', () => {
    expect(themeVars('beige100')).toMatchObject({
      bg_solid_mail_general: '#FFF0DD',
      tema_general_mail_general: 'beige100',
    })
  })

  it('returns nothing for an unknown theme', () => {
    expect(themeVars('no-existe')).toEqual({})
  })
})

describe('colorFooterForTheme', () => {
  it('resolves a known theme and falls back to negro for an unknown one', () => {
    expect(colorFooterForTheme('problack')).toBe('pro')
    expect(colorFooterForTheme('verde100')).toBe('negro')
    expect(colorFooterForTheme('no-existe')).toBe('negro')
  })
})

describe('presentation helpers', () => {
  it('shows every repo theme in some group, so a new one is never invisible', () => {
    const shown = groupedThemes().flatMap((g) => g.themes.map((t) => t.slug))
    expect(shown.sort()).toEqual(THEMES.map((t) => t.slug).sort())
  })

  it('falls back to the raw slug when a theme has no friendly label', () => {
    expect(themeLabel('purpura100')).toBe('Púrpura 100')
    expect(themeLabel('tema-nuevo-sin-label')).toBe('tema-nuevo-sin-label')
  })
})
