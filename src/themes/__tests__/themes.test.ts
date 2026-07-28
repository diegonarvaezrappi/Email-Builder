import { describe, expect, it } from 'vitest'
import { colorFooterForTheme, groupedThemes, parseThemes, THEMES, themeLabel } from '../themes'

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
      { slug: 'beige100', colorFooter: 'negro' },
      { slug: 'problack', colorFooter: 'pro' },
    ])
  })

  it('does not bleed a color_footer from the following branch', () => {
    // Un tema sin color_footer propio cae al default 'negro', NO toma el del
    // tema siguiente (por eso el chunk se corta en la rama siguiente).
    const fixture = `
      {% if tema_general_mail_general == 'sinfooter' %}
      {% elsif tema_general_mail_general == 'conpro' %}
        {% assign color_footer_mail_general = 'pro' %}
      {% endif %}
    `
    expect(parseThemes(fixture)).toEqual([
      { slug: 'sinfooter', colorFooter: 'negro' },
      { slug: 'conpro', colorFooter: 'pro' },
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
    expect(THEMES.filter((t) => t.colorFooter === 'pro').map((t) => t.slug)).toEqual(['pro', 'problack'])
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
