import { describe, expect, it } from 'vitest'
import {
  renderBeneficiosTextoSnippet,
  renderBeneficiosTituloSnippet,
  renderBulletIconoSnippet,
  renderBulletNumeradoSnippet,
  renderIconoSnippet,
  renderSeparadorLineaSnippet,
  renderSubtituloTextoSnippet,
  renderTituloTextoSnippet,
} from '../render'

const NO_LIQUID_TAG_RE = /\{%/

describe('renderTituloTextoSnippet', () => {
  it('substitutes the text into the <h2>', () => {
    const html = renderTituloTextoSnippet({ text: 'Mi título' })
    expect(html).toContain('<h2')
    expect(html).toContain('>Mi título<')
    expect(html).not.toContain('>Titulo<')
  })

  it('escapes HTML-significant characters', () => {
    const html = renderTituloTextoSnippet({ text: '<b>x</b>' })
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;')
    expect(html).not.toContain('<b>x</b>')
  })

  it('has no Liquid tags left; _mail_general and the module-align var survive for later passes', () => {
    const html = renderTituloTextoSnippet({ text: 'x' })
    expect(html).not.toMatch(NO_LIQUID_TAG_RE)
    expect(html).toContain('{{color_texto_mail_general}}')
    expect(html).toContain('{{body_alineado_molecular}}')
  })
})

describe('renderSubtituloTextoSnippet', () => {
  it('substitutes the text into the <h3>', () => {
    const html = renderSubtituloTextoSnippet({ text: 'Mi subtítulo' })
    expect(html).toContain('<h3')
    expect(html).toContain('>Mi subtítulo<')
    expect(html).not.toContain('bloque de texto')
  })

  it('escapes HTML-significant characters', () => {
    const html = renderSubtituloTextoSnippet({ text: '<i>y</i>' })
    expect(html).toContain('&lt;i&gt;y&lt;/i&gt;')
  })

  it('has no Liquid tags left', () => {
    expect(renderSubtituloTextoSnippet({ text: 'x' })).not.toMatch(NO_LIQUID_TAG_RE)
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
    const s = renderBulletIconoSnippet({ size: 'S', titulo: 'x', texto: 'y' })
    const m = renderBulletIconoSnippet({ size: 'M', titulo: 'x', texto: 'y' })
    const l = renderBulletIconoSnippet({ size: 'L', titulo: 'x', texto: 'y' })
    expect(s).toContain('role="molecula-iconoS"')
    expect(m).toContain('role="molecula-iconoM"')
    // sic — el archivo "l" trae internamente el role XL (typo real del maestro).
    expect(l).toContain('role="molecula-iconoXL"')
  })

  it('substitutes titulo (h3) and texto (h4)', () => {
    const html = renderBulletIconoSnippet({ size: 'L', titulo: 'Mi título', texto: 'Mi texto' })
    expect(html).toContain('>Mi título<')
    expect(html).toContain('>Mi texto<')
    expect(html).not.toContain('>Subtitulo<')
    expect(html).not.toContain('bloque de texto')
  })

  it('escapes HTML-significant characters in both fields', () => {
    const html = renderBulletIconoSnippet({ size: 'S', titulo: '<b>x</b>', texto: '<i>y</i>' })
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;')
    expect(html).toContain('&lt;i&gt;y&lt;/i&gt;')
  })

  it('has no Liquid tags left; theme/align vars survive for later passes', () => {
    const html = renderBulletIconoSnippet({ size: 'M', titulo: 'x', texto: 'y' })
    expect(html).not.toMatch(NO_LIQUID_TAG_RE)
    expect(html).toContain('{{color_texto_mail_general}}')
    expect(html).toContain('{{alineado_molecular_mail_body}}')
  })
})

describe('renderBulletNumeradoSnippet', () => {
  it('substitutes numero, titulo (h3) and texto (h4) independently', () => {
    const html = renderBulletNumeradoSnippet({ numero: '3', titulo: 'Mi título', texto: 'Mi texto' })
    expect(html).toContain('>3<')
    expect(html).toContain('>Mi título<')
    expect(html).toContain('>Mi texto<')
    expect(html).not.toContain('> 1 <')
    expect(html).not.toContain('>Subtitulo<')
  })

  it('has no Liquid tags left', () => {
    expect(renderBulletNumeradoSnippet({ numero: '1', titulo: 'x', texto: 'y' })).not.toMatch(NO_LIQUID_TAG_RE)
  })
})

describe('renderIconoSnippet', () => {
  it('picks the <img> matching fields.size', () => {
    for (const size of ['S', 'M', 'L', 'XL'] as const) {
      const html = renderIconoSnippet({ imageUrl: 'https://x.test/a.png', size, borderRadiusEnabled: false })
      expect(html).toContain(`role="molecula-icono${size}"`)
    }
  })

  it('borderRadiusEnabled=false removes any pre-existing radius (L/XL ship with one)', () => {
    const html = renderIconoSnippet({ imageUrl: 'https://x.test/a.png', size: 'L', borderRadiusEnabled: false })
    expect(html).not.toContain('border-radius')
  })

  it('borderRadiusEnabled=true adds it even on S/M (which ship with none)', () => {
    const html = renderIconoSnippet({ imageUrl: 'https://x.test/a.png', size: 'S', borderRadiusEnabled: true })
    expect(html).toContain('border-radius: 7px')
  })

  it('blank imageUrl removes the whole <img> (global convention)', () => {
    const html = renderIconoSnippet({ imageUrl: '', size: 'M', borderRadiusEnabled: false })
    expect(html).not.toContain('<img')
  })

  it('substitutes the URL otherwise', () => {
    const html = renderIconoSnippet({ imageUrl: 'https://x.test/mine.png', size: 'M', borderRadiusEnabled: false })
    expect(html).toContain('src="https://x.test/mine.png"')
  })
})

describe('renderBeneficiosTituloSnippet / renderBeneficiosTextoSnippet', () => {
  it('substitutes the text into their own <h3>/<h4>', () => {
    const titulo = renderBeneficiosTituloSnippet({ text: 'Mi título' })
    const texto = renderBeneficiosTextoSnippet({ text: 'Mi texto' })
    expect(titulo).toContain('<h3')
    expect(titulo).toContain('>Mi título<')
    expect(titulo).not.toContain('Descuentos de hasta xxx')
    expect(texto).toContain('<h4')
    expect(texto).toContain('>Mi texto<')
    expect(texto).not.toContain('En todos tus pedidos')
  })

  it('escapes HTML-significant characters', () => {
    expect(renderBeneficiosTituloSnippet({ text: '<b>x</b>' })).toContain('&lt;b&gt;x&lt;/b&gt;')
    expect(renderBeneficiosTextoSnippet({ text: '<i>y</i>' })).toContain('&lt;i&gt;y&lt;/i&gt;')
  })

  it('has no Liquid tags left; theme/align vars survive for later passes', () => {
    const titulo = renderBeneficiosTituloSnippet({ text: 'x' })
    const texto = renderBeneficiosTextoSnippet({ text: 'y' })
    expect(titulo).not.toMatch(NO_LIQUID_TAG_RE)
    expect(texto).not.toMatch(NO_LIQUID_TAG_RE)
    expect(titulo).toContain('{{color_texto_mail_general}}')
    expect(titulo).toContain('{{body_alineado_molecular}}')
    expect(texto).toContain('{{body_alineado_molecular}}')
  })
})
