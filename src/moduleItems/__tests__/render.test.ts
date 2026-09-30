import { describe, expect, it } from 'vitest'
import { richTextFromPlain } from '../../richText/model'
import {
  renderBeneficiosTextoSnippet,
  renderBeneficiosTituloSnippet,
  renderBulletIconoSimpleSnippet,
  renderBulletIconoSnippet,
  renderBulletNumeradoSnippet,
  renderColumnaTextoSnippet,
  renderCuponMontoSnippet,
  renderIconoSnippet,
  renderSeparadorLineaSnippet,
  renderSubtituloTextoSnippet,
  renderTituloTextoSnippet,
} from '../render'
import { BULLET_ICONO_DEFAULT_URLS, bulletIconoFieldsSchema } from '../schemas'

const NO_LIQUID_TAG_RE = /\{%/

describe('renderTituloTextoSnippet', () => {
  it('substitutes the text into the <h2>', () => {
    const html = renderTituloTextoSnippet({ text: richTextFromPlain('Mi título') })
    expect(html).toContain('<h2')
    expect(html).toContain('>Mi título<')
    expect(html).not.toContain('>Titulo<')
  })

  it('escapes HTML-significant characters', () => {
    const html = renderTituloTextoSnippet({ text: richTextFromPlain('<b>x</b>') })
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;')
    expect(html).not.toContain('<b>x</b>')
  })

  it('has no Liquid tags left; _mail_general and the module-align var survive for later passes', () => {
    const html = renderTituloTextoSnippet({ text: richTextFromPlain('x') })
    expect(html).not.toMatch(NO_LIQUID_TAG_RE)
    expect(html).toContain('{{color_texto_mail_general}}')
    expect(html).toContain('{{body_alineado_molecular}}')
  })
})

describe('renderSubtituloTextoSnippet', () => {
  it('substitutes the text into the <h3>', () => {
    const html = renderSubtituloTextoSnippet({ text: richTextFromPlain('Mi subtítulo') })
    expect(html).toContain('<h3')
    expect(html).toContain('>Mi subtítulo<')
    expect(html).not.toContain('bloque de texto')
  })

  it('escapes HTML-significant characters', () => {
    const html = renderSubtituloTextoSnippet({ text: richTextFromPlain('<i>y</i>') })
    expect(html).toContain('&lt;i&gt;y&lt;/i&gt;')
  })

  it('has no Liquid tags left', () => {
    expect(renderSubtituloTextoSnippet({ text: richTextFromPlain('x') })).not.toMatch(NO_LIQUID_TAG_RE)
  })
})

describe('renderSeparadorLineaSnippet', () => {
  it('returns the decorative line, no fields to substitute', () => {
    const html = renderSeparadorLineaSnippet({})
    expect(html).toContain('role="molecula-separador"')
    expect(html).not.toMatch(NO_LIQUID_TAG_RE)
    // Sobreviven para la pasada de tema / de alineado del módulo dueño.
    expect(html).toContain('{{color_acento1_mail_general}}')
    expect(html).toContain('{{alineado_molecular_mail_body}}')
  })
})

describe('renderBulletIconoSnippet', () => {
  it('S/M/L each pick their own file — different <img> widths', () => {
    const s = renderBulletIconoSnippet({ size: 'S', imageUrl: BULLET_ICONO_DEFAULT_URLS.S, imageAlt: 'img', titulo: richTextFromPlain('x'), texto: richTextFromPlain('y') })
    const m = renderBulletIconoSnippet({ size: 'M', imageUrl: BULLET_ICONO_DEFAULT_URLS.M, imageAlt: 'img', titulo: richTextFromPlain('x'), texto: richTextFromPlain('y') })
    const l = renderBulletIconoSnippet({ size: 'L', imageUrl: BULLET_ICONO_DEFAULT_URLS.L, imageAlt: 'img', titulo: richTextFromPlain('x'), texto: richTextFromPlain('y') })
    expect(s).toContain('role="molecula-iconoS"')
    expect(m).toContain('role="molecula-iconoM"')
    // sic — el archivo "l" trae internamente el role XL (typo real del maestro).
    expect(l).toContain('role="molecula-iconoXL"')
  })

  it('substitutes titulo (h3) and texto (h4)', () => {
    const html = renderBulletIconoSnippet({ size: 'L', imageUrl: BULLET_ICONO_DEFAULT_URLS.L, imageAlt: 'img', titulo: richTextFromPlain('Mi título'), texto: richTextFromPlain('Mi texto') })
    expect(html).toContain('>Mi título<')
    expect(html).toContain('>Mi texto<')
    expect(html).not.toContain('>Subtitulo<')
    expect(html).not.toContain('bloque de texto')
  })

  it('escapes HTML-significant characters in both fields', () => {
    const html = renderBulletIconoSnippet({ size: 'S', imageUrl: BULLET_ICONO_DEFAULT_URLS.S, imageAlt: 'img', titulo: richTextFromPlain('<b>x</b>'), texto: richTextFromPlain('<i>y</i>') })
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;')
    expect(html).toContain('&lt;i&gt;y&lt;/i&gt;')
  })

  it('has no Liquid tags left; theme/align vars survive for later passes', () => {
    const html = renderBulletIconoSnippet({ size: 'M', imageUrl: BULLET_ICONO_DEFAULT_URLS.M, imageAlt: 'img', titulo: richTextFromPlain('x'), texto: richTextFromPlain('y') })
    expect(html).not.toMatch(NO_LIQUID_TAG_RE)
    expect(html).toContain('{{color_texto_mail_general}}')
    expect(html).toContain('{{alineado_molecular_mail_body}}')
  })
})

describe('renderBulletIconoSnippet · URL del ícono', () => {
  const base = { titulo: richTextFromPlain('x'), texto: richTextFromPlain('y') }
  it.each(['S', 'M', 'L'] as const)('%s: reemplaza src y alt del ícono', (size) => {
    const html = renderBulletIconoSnippet({ ...base, size, imageUrl: 'https://x.test/a.png?b=1&c=2', imageAlt: 'Mi "ícono"' })
    expect(html).toContain('src="https://x.test/a.png?b=1&amp;c=2"')
    expect(html).toContain('alt="Mi &quot;ícono&quot;"')
    expect(html).not.toContain(BULLET_ICONO_DEFAULT_URLS[size])
  })

  it('en blanco quita la celda del ícono entera, no deja un <td> vacío', () => {
    const html = renderBulletIconoSnippet({ ...base, size: 'L', imageUrl: '  ', imageAlt: 'img' })
    expect(html).not.toContain('<img')
    expect(html).not.toContain('width="50px"')
    expect(html).toContain('>x<')
  })

  it('el default es el ícono de fábrica de L', () => {
    expect(bulletIconoFieldsSchema.parse({}).imageUrl).toBe(BULLET_ICONO_DEFAULT_URLS.L)
  })
})

describe('renderBulletIconoSnippet · solo título', () => {
  it.each(['S', 'M', 'L'] as const)('%s: sin texto quita el <h4> y el separador y centra el título con el ícono', (size) => {
    const html = renderBulletIconoSnippet({ size, imageUrl: BULLET_ICONO_DEFAULT_URLS[size], imageAlt: 'img', titulo: richTextFromPlain('Solo título'), texto: richTextFromPlain('  ') })
    expect(html).toContain('>Solo título<')
    expect(html).not.toContain('<h4')
    expect(html).not.toContain('separador-S"></div>')
    expect(html).not.toContain('valign="top"')
    expect(html.match(/valign="middle"/g)?.length).toBe(2)
  })

  it('con texto, el markup queda como el maestro', () => {
    const html = renderBulletIconoSnippet({ size: 'S', imageUrl: BULLET_ICONO_DEFAULT_URLS.S, imageAlt: 'img', titulo: richTextFromPlain('t'), texto: richTextFromPlain('x') })
    expect(html).toContain('<h4')
    expect(html).toContain('valign="top"')
  })
})

describe('renderBulletNumeradoSnippet', () => {
  it('substitutes numero, titulo (h3) and texto (h4) independently', () => {
    const html = renderBulletNumeradoSnippet({ numero: richTextFromPlain('3'), titulo: richTextFromPlain('Mi título'), texto: richTextFromPlain('Mi texto') })
    expect(html).toContain('>3<')
    expect(html).toContain('>Mi título<')
    expect(html).toContain('>Mi texto<')
    expect(html).not.toContain('> 1 <')
    expect(html).not.toContain('>Subtitulo<')
  })

  it('has no Liquid tags left', () => {
    expect(renderBulletNumeradoSnippet({ numero: richTextFromPlain('1'), titulo: richTextFromPlain('x'), texto: richTextFromPlain('y') })).not.toMatch(NO_LIQUID_TAG_RE)
  })
})

describe('renderIconoSnippet', () => {
  it('picks the <img> matching fields.size', () => {
    for (const size of ['S', 'M', 'L', 'XL'] as const) {
      const html = renderIconoSnippet({ imageUrl: 'https://x.test/a.png', imageAlt: 'img', size, borderRadiusEnabled: false })
      expect(html).toContain(`role="molecula-icono${size}"`)
    }
  })

  it('borderRadiusEnabled=false removes any pre-existing radius (L/XL ship with one)', () => {
    const html = renderIconoSnippet({ imageUrl: 'https://x.test/a.png', imageAlt: 'img', size: 'L', borderRadiusEnabled: false })
    expect(html).not.toContain('border-radius')
  })

  it('borderRadiusEnabled=true adds it even on S/M (which ship with none)', () => {
    const html = renderIconoSnippet({ imageUrl: 'https://x.test/a.png', imageAlt: 'img', size: 'S', borderRadiusEnabled: true })
    expect(html).toContain('border-radius: 7px')
  })

  it('blank imageUrl removes the whole <img> (global convention)', () => {
    const html = renderIconoSnippet({ imageUrl: '', imageAlt: 'img', size: 'M', borderRadiusEnabled: false })
    expect(html).not.toContain('<img')
  })

  it('substitutes the URL and alt otherwise', () => {
    const html = renderIconoSnippet({ imageUrl: 'https://x.test/mine.png', imageAlt: 'mi alt', size: 'M', borderRadiusEnabled: false })
    expect(html).toContain('src="https://x.test/mine.png"')
    expect(html).toContain('alt="mi alt"')
  })
})

describe('renderBeneficiosTituloSnippet / renderBeneficiosTextoSnippet', () => {
  it('substitutes the text into their own <h3>/<h4>', () => {
    const titulo = renderBeneficiosTituloSnippet({ text: richTextFromPlain('Mi título') })
    const texto = renderBeneficiosTextoSnippet({ text: richTextFromPlain('Mi texto') })
    expect(titulo).toContain('<h3')
    expect(titulo).toContain('>Mi título<')
    expect(titulo).not.toContain('Descuentos de hasta xxx')
    expect(texto).toContain('<h4')
    expect(texto).toContain('>Mi texto<')
    expect(texto).not.toContain('En todos tus pedidos')
  })

  it('escapes HTML-significant characters', () => {
    expect(renderBeneficiosTituloSnippet({ text: richTextFromPlain('<b>x</b>') })).toContain('&lt;b&gt;x&lt;/b&gt;')
    expect(renderBeneficiosTextoSnippet({ text: richTextFromPlain('<i>y</i>') })).toContain('&lt;i&gt;y&lt;/i&gt;')
  })

  it('has no Liquid tags left; theme/align vars survive for later passes', () => {
    const titulo = renderBeneficiosTituloSnippet({ text: richTextFromPlain('x') })
    const texto = renderBeneficiosTextoSnippet({ text: richTextFromPlain('y') })
    expect(titulo).not.toMatch(NO_LIQUID_TAG_RE)
    expect(texto).not.toMatch(NO_LIQUID_TAG_RE)
    expect(titulo).toContain('{{color_texto_mail_general}}')
    expect(titulo).toContain('{{body_alineado_molecular}}')
    expect(texto).toContain('{{body_alineado_molecular}}')
  })
})

describe('renderColumnaTextoSnippet', () => {
  it('substitutes the text into the <h4 role="molecula-texto">', () => {
    const html = renderColumnaTextoSnippet({ text: richTextFromPlain('Mi texto corto') })
    expect(html).toContain('<h4')
    expect(html).toContain('role="molecula-texto"')
    expect(html).toContain('>Mi texto corto<')
    expect(html).not.toContain('Texto corto')
  })

  it('escapes HTML-significant characters', () => {
    expect(renderColumnaTextoSnippet({ text: richTextFromPlain('<b>x</b>') })).toContain('&lt;b&gt;x&lt;/b&gt;')
  })

  it('has no Liquid tags left; theme/align vars survive for later passes', () => {
    const html = renderColumnaTextoSnippet({ text: richTextFromPlain('x') })
    expect(html).not.toMatch(NO_LIQUID_TAG_RE)
    expect(html).toContain('{{color_texto_mail_general}}')
    expect(html).toContain('{{body_alineado_molecular}}')
  })
})

describe('renderBulletIconoSimpleSnippet', () => {
  const DEFAULT_ICON_URL = 'https://lh3.googleusercontent.com/d/1wZxPSRbT-maSuZWDyZz99Ewi2A2RH37-'

  it('renders the icon + a single text, no title line (unlike BULLET_ICONO)', () => {
    const html = renderBulletIconoSimpleSnippet({ imageUrl: DEFAULT_ICON_URL, imageAlt: 'img', text: richTextFromPlain('Mi cupón') })
    expect(html).toContain(`src="${DEFAULT_ICON_URL}"`)
    expect(html).toContain('>Mi cupón<')
    expect(html).not.toContain('Subtitulo')
    expect(html).not.toContain('<h3')
  })

  it('blank icon URL removes the WHOLE <td>, not just the <img> (master: "quitando todo el <td>")', () => {
    const html = renderBulletIconoSimpleSnippet({ imageUrl: '', imageAlt: 'img', text: richTextFromPlain('Mi cupón') })
    expect(html).not.toContain('<img')
    expect(html).not.toContain('width="15px"')
    expect(html).toContain('>Mi cupón<')
  })

  it('escapes HTML-significant characters', () => {
    expect(renderBulletIconoSimpleSnippet({ imageUrl: DEFAULT_ICON_URL, imageAlt: 'img', text: richTextFromPlain('<b>x</b>') })).toContain('&lt;b&gt;x&lt;/b&gt;')
  })

  it('has no Liquid tags left; theme/align vars survive for later passes', () => {
    const html = renderBulletIconoSimpleSnippet({ imageUrl: DEFAULT_ICON_URL, imageAlt: 'img', text: richTextFromPlain('x') })
    expect(html).not.toMatch(NO_LIQUID_TAG_RE)
    expect(html).toContain('{{color_texto_mail_general}}')
    expect(html).toContain('{{alineado_molecular_mail_body}}')
  })
})

describe('renderCuponMontoSnippet', () => {
  it('substitutes the text into the <h1 role="molecula-texto"> with the fixed accent color', () => {
    const html = renderCuponMontoSnippet({ text: richTextFromPlain('Mi monto') })
    expect(html).toContain('<h1')
    expect(html).toContain('role="molecula-texto"')
    expect(html).toContain('{{color_acento2_mail_general}}')
    expect(html).toContain('>Mi monto<')
    expect(html).not.toContain('Aca un markdown')
  })

  it('replaces the WHOLE h1 content, incl. the master\'s fixed "Aca un<br>" lead-in — not just the text run after it (real bug found via CDP visual check: textRunBounds alone left "Aca un" permanently baked in)', () => {
    const html = renderCuponMontoSnippet({ text: richTextFromPlain('Mi monto') })
    expect(html).not.toContain('Aca un')
    expect(html).not.toContain('<br>Mi monto')
  })

  it('escapes HTML-significant characters', () => {
    expect(renderCuponMontoSnippet({ text: richTextFromPlain('<b>x</b>') })).toContain('&lt;b&gt;x&lt;/b&gt;')
  })

  it('has no Liquid tags left', () => {
    expect(renderCuponMontoSnippet({ text: richTextFromPlain('x') })).not.toMatch(NO_LIQUID_TAG_RE)
  })
})
