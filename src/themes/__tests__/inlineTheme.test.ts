import { describe, expect, it } from 'vitest'
import { inlineTheme, resolveThemeVars, stripThemeDefinitions } from '../inlineTheme'

describe('resolveThemeVars', () => {
  it('replaces theme variables with their values', () => {
    const html = '<td bgcolor="{{bg_solid_mail_general}}" style="color:{{color_texto_mail_general}}">'
    expect(resolveThemeVars(html, { bg_solid_mail_general: '#FFF0DD', color_texto_mail_general: '#2B2316' })).toBe(
      '<td bgcolor="#FFF0DD" style="color:#2B2316">',
    )
  })

  it('replaces every occurrence, not just the first', () => {
    const html = '{{bg_solid_mail_general}} {{bg_solid_mail_general}} {{bg_solid_mail_general}}'
    expect(resolveThemeVars(html, { bg_solid_mail_general: '#FFF' })).toBe('#FFF #FFF #FFF')
  })

  it('empties a variable no theme defines, like Liquid does', () => {
    // bg_imgevento_mail_general se referencia en el maestro pero ningún tema lo
    // asigna; en Braze sale vacío, así que acá también.
    expect(resolveThemeVars('url({{bg_imgevento_mail_general}})', { bg_solid_mail_general: '#FFF' })).toBe('url()')
  })

  it('leaves the Braze Liquid that must survive untouched', () => {
    const braze = '{{content_blocks.${FOOTER_q1_2024_legales}}} {% if font_style_look == \'pro\' %}x{% endif %} ${user_id}'
    expect(resolveThemeVars(braze, { bg_solid_mail_general: '#FFF' })).toBe(braze)
  })

  it('tolerates inner spaces in the reference', () => {
    expect(resolveThemeVars('{{ bg_solid_mail_general }}', { bg_solid_mail_general: '#FFF' })).toBe('#FFF')
  })

  it('also resolves bg_solid_generico100_mail_body (EXTRA_THEME_VAR_NAMES exception, not _mail_general-suffixed)', () => {
    expect(resolveThemeVars('<table bgcolor="{{bg_solid_generico100_mail_body}}">', { bg_solid_generico100_mail_body: '#FFFFFF' })).toBe(
      '<table bgcolor="#FFFFFF">',
    )
  })

  it('also resolves the 2 deal vars of EXTRA_THEME_VAR_NAMES, including the hyphenated one', () => {
    expect(resolveThemeVars('<img src="{{coronapro_mail_body}}">', { coronapro_mail_body: 'https://x.test/c.png' })).toBe(
      '<img src="https://x.test/c.png">',
    )
    // El guión del nombre tiene que sobrevivir la interpolación al regex —
    // dentro de una alternancia es literal, pero es justo el tipo de cosa que
    // se rompe en silencio si alguien mueve la variable a una clase de caracteres.
    expect(
      resolveThemeVars('<div style="border-radius: {{body_container_background_radius-peq}};">', {
        'body_container_background_radius-peq': ' 8px',
      }),
    ).toBe('<div style="border-radius:  8px;">')
  })

  it('also resolves the 5 vars added for the new content-modules (fase 1, sin guión y sin _mail_general)', () => {
    const html =
      '<div style="border-radius:{{body_container_background_radius}}; padding:{{body_container_background_padding}}; border:{{body_container_background_border}}; background:{{bg_solid_generico50_mail_body}};"><img src="{{icon_link_generico_mail_body}}"></div>'
    expect(
      resolveThemeVars(html, {
        body_container_background_radius: '0px',
        body_container_background_padding: '0px',
        body_container_background_border: ' 0px solid rgba(255, 255, 255, 0.0)',
        bg_solid_generico50_mail_body: 'rgba(255,255,255,0.5)',
        icon_link_generico_mail_body: 'https://x.test/icon.png',
      }),
    ).toBe(
      '<div style="border-radius:0px; padding:0px; border: 0px solid rgba(255, 255, 255, 0.0); background:rgba(255,255,255,0.5);"><img src="https://x.test/icon.png"></div>',
    )
  })
})

describe('stripThemeDefinitions', () => {
  it('removes the HTML comment that wraps the theme branches', () => {
    // head-meta-tags.html es un único comentario HTML con las 11 ramas dentro.
    const html = [
      '<!--',
      "\t{% if tema_general_mail_general == 'beige100' %}",
      "\t\t{% assign bg_solid_mail_general = '#FFF0DD' %}",
      "\t{% elsif tema_general_mail_general == 'pro' %}",
      "\t\t{% assign bg_solid_mail_general = '#2A2B2B' %}",
      '\t{% endif %}',
      '-->',
      '<body>hola</body>',
    ].join('\n')

    const out = stripThemeDefinitions(html)
    expect(out).not.toContain('tema_general_mail_general')
    expect(out).not.toContain('bg_solid_mail_general')
    expect(out).toContain('<body>hola</body>')
  })

  it('removes the input assign', () => {
    const out = stripThemeDefinitions("{% assign tema_general_mail_general = 'beige100' %}\n<html>")
    expect(out).toBe('<html>')
  })

  it('removes the theme block even when it is not inside a comment', () => {
    const html = "{% if tema_general_mail_general == 'pro' %}{% assign x_mail_general = 'a' %}{% endif %}<body>"
    expect(stripThemeDefinitions(html)).toBe('<body>')
  })

  it('keeps the other comments of the master template', () => {
    const html = '<!-- HEADER WRAPPER --><!-- FOOTER --><!-- INICIO SECCION BANNER -->'
    expect(stripThemeDefinitions(html)).toBe(html)
  })

  it('keeps the pedagogical comments of the footer component', () => {
    const html = '<!--DENTRO DE LAS COMILLAS SE CAMBIA EL ESTILO variantes \'negro\' \'pro\'-->'
    expect(stripThemeDefinitions(html)).toBe(html)
  })
})

describe('inlineTheme', () => {
  it('bakes the theme in and leaves no theme Liquid behind', () => {
    const html = [
      "{% assign tema_general_mail_general = 'beige100' %}",
      '<!--',
      "\t{% if tema_general_mail_general == 'beige100' %}",
      "\t\t{% assign bg_solid_mail_general = '#FFF0DD' %}",
      '\t{% endif %}',
      '-->',
      '<td bgcolor="{{bg_solid_mail_general}}">{{content_blocks.${X}}}</td>',
    ].join('\n')

    const out = inlineTheme(html, { bg_solid_mail_general: '#FFF0DD' })
    expect(out).toContain('<td bgcolor="#FFF0DD">')
    expect(out).toContain('{{content_blocks.${X}}}')
    expect(out).not.toMatch(/tema_general_mail_general|_mail_general\}\}/)
  })

  it('empties the variables it was given no value for', () => {
    expect(inlineTheme('<td bgcolor="{{bg_solid_mail_general}}">', {})).toBe('<td bgcolor="">')
  })

  it('starts the document at its doctype, with no whitespace left behind', () => {
    const html = ["{% assign tema_general_mail_general = 'beige100' %}", '', '\t\t  ', '', '<!doctype html>'].join('\n')
    expect(inlineTheme(html, {})).toBe('<!doctype html>')
  })

  it('keeps any non-theme Liquid that sits before the doctype', () => {
    const html = "{% assign otra_cosa = 'x' %}\n<!doctype html>"
    expect(inlineTheme(html, {})).toBe(html)
  })
})
