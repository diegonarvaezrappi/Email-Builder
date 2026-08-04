import { describe, expect, it } from 'vitest'
import { colorFooterForTheme, groupedThemes, parseThemes, PASTEL_THEME_SLUGS, THEMES, themeLabel, themeVars } from '../themes'

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

  it('no longer defines color_footer_mail_general on any theme — the repo dropped it without replacement', () => {
    // Canario: si el repo lo vuelve a agregar, este test empieza a fallar y
    // hay que actualizarlo — en ese momento colorFooterForTheme volverá a usar
    // el valor real en vez de su fallback por grupo (ver ese describe abajo).
    expect(THEMES.filter((t) => t.vars.color_footer_mail_general !== undefined)).toEqual([])
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

  it('also captures bg_solid_generico100_mail_body (EXTRA_THEME_VAR_NAMES exception), one real value per theme', () => {
    // Sufijo _mail_body, no _mail_general — ver el comentario largo en
    // themes.ts sobre por qué se agrega por nombre exacto y no ampliando el
    // sufijo entero (alineado_molecular_mail_body vive fuera de las ramas de
    // tema y NO debería colarse acá).
    expect(themeVars('beige100').bg_solid_generico100_mail_body).toBe('#FFFFFF')
    expect(themeVars('darkneon').bg_solid_generico100_mail_body).toBe('#000000')
    expect(themeVars('pro').bg_solid_generico100_mail_body).toBe('#000000')
    expect(themeVars('problack').bg_solid_generico100_mail_body).toBe('#FFFFFF')
  })
})

describe('colorFooterForTheme', () => {
  it('falls back by theme group now that no theme defines the real variable', () => {
    expect(colorFooterForTheme('pro')).toBe('pro')
    expect(colorFooterForTheme('problack')).toBe('pro')
    expect(colorFooterForTheme('verde100')).toBe('negro')
    expect(colorFooterForTheme('darkturbo')).toBe('negro')
  })

  it('falls back to negro for an unknown theme', () => {
    expect(colorFooterForTheme('no-existe')).toBe('negro')
  })
})

describe('PASTEL_THEME_SLUGS', () => {
  it('lists exactly the 6 pastel themes documented in GUIA-DE-TEMAS.md, all real repo themes', () => {
    expect(PASTEL_THEME_SLUGS.sort()).toEqual(
      ['beige100', 'beige150', 'rosa100', 'purpura100', 'celeste100', 'verde100'].sort(),
    )
    for (const slug of PASTEL_THEME_SLUGS) {
      expect(THEMES.map((t) => t.slug), slug).toContain(slug)
    }
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
