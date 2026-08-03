import { describe, expect, it } from 'vitest'
import { defaultHeaderFields } from '../schema'
import { renderHeaderSnippet } from '../render'

describe('renderHeaderSnippet', () => {
  it('renders the default fields (Rappi, centrado, claro, sin cobranding) with no cobranding markup', () => {
    const snippet = renderHeaderSnippet(defaultHeaderFields, 'beige100')
    expect(snippet).toContain('alt="Rappi"')
    expect(snippet).not.toContain('cobranding-s')
    expect(snippet).not.toContain('cobranding-m')
    expect(snippet).not.toContain('cobranding-l')
    // Sin cobranding tampoco va el separador, aunque el layout sea centrado.
    expect(snippet).not.toContain('alt="|"')
  })

  it('wraps the chosen header <tr> inside the shared wrapper table', () => {
    const snippet = renderHeaderSnippet(defaultHeaderFields, 'beige100')
    expect(snippet).toContain('class="column column-1"')
    expect(snippet).toContain('<tr>')
    expect(snippet).not.toContain('<!-- ACA VA EL HEADER -->')
  })

  it('picks the file matching brand + layout + logoBackground', () => {
    const columnas = renderHeaderSnippet({ ...defaultHeaderFields, layout: 'columnas' }, 'beige100')
    expect(columnas).toContain('text-align: left')
    expect(columnas).toContain('width="50%"')

    // El alt="Rappi" es genérico entre marcas; lo que cambia es el asset.
    const rappi = renderHeaderSnippet(defaultHeaderFields, 'beige100')
    const proBrand = renderHeaderSnippet({ ...defaultHeaderFields, brand: 'rappi-pro' }, 'beige100')
    expect(rappi).not.toBe(proBrand)
    expect(proBrand).toContain('https://lh3.googleusercontent.com/d/104ERZPJ3vjvWBv1rUA2JPFtAKR-avqlF')
  })

  it('switches to the dark-background logo asset when logoBackground is oscuro', () => {
    const claro = renderHeaderSnippet(defaultHeaderFields, 'beige100')
    const oscuro = renderHeaderSnippet({ ...defaultHeaderFields, logoBackground: 'oscuro' }, 'beige100')
    expect(claro).not.toBe(oscuro)
  })

  it('keeps the separator only when cobranding is on AND layout is centrado', () => {
    const centradoSinCobranding = renderHeaderSnippet({ ...defaultHeaderFields, cobranding: false }, 'beige100')
    const centradoConCobranding = renderHeaderSnippet({ ...defaultHeaderFields, cobranding: true }, 'beige100')
    const columnasConCobranding = renderHeaderSnippet(
      { ...defaultHeaderFields, layout: 'columnas', cobranding: true },
      'beige100',
    )

    expect(centradoSinCobranding).not.toContain('alt="|"')
    expect(centradoConCobranding).toContain('alt="|"')
    expect(columnasConCobranding).not.toContain('alt="|"')
  })

  it('keeps exactly one cobranding image, matching the chosen size', () => {
    for (const size of ['s', 'm', 'l'] as const) {
      const snippet = renderHeaderSnippet({ ...defaultHeaderFields, cobranding: true, cobrandingSize: size }, 'beige100')
      expect(snippet).toContain(`class="cobranding-${size}"`)
      for (const other of ['s', 'm', 'l'] as const) {
        if (other !== size) expect(snippet).not.toContain(`class="cobranding-${other}"`)
      }
    }
  })

  it('replaces the cobranding image src with the URL the user chose', () => {
    const snippet = renderHeaderSnippet(
      { ...defaultHeaderFields, cobranding: true, cobrandingImageUrl: 'https://example.com/mi-logo.png' },
      'beige100',
    )
    expect(snippet).toContain('src="https://example.com/mi-logo.png"')
    expect(snippet).not.toContain('https://lh3.googleusercontent.com/d/1jrRUyQvYuQ8gsVP1Sk0jvM3BdFO0ZaJA')
  })

  it('escapes special characters in a user-provided cobranding URL', () => {
    const snippet = renderHeaderSnippet(
      { ...defaultHeaderFields, cobranding: true, cobrandingImageUrl: 'https://example.com/a"b&c' },
      'beige100',
    )
    expect(snippet).toContain('src="https://example.com/a&quot;b&amp;c"')
  })

  it('resolves bg_header_mail_general to the literal value of the 6 pastel themes', () => {
    // contenido-aliado trae {{bg_header_mail_general}} en su variante claro.
    const fields = { ...defaultHeaderFields, brand: 'contenido-aliado' as const }
    const beige = renderHeaderSnippet(fields, 'beige100')
    const verde = renderHeaderSnippet(fields, 'verde100')
    expect(beige).toContain('https://lh3.googleusercontent.com/d/1aarZz2u-9HhLcCbUIMzhw4OKEqXOfOtn')
    expect(verde).toContain('https://lh3.googleusercontent.com/d/1QliQI_Qq79xbdO8LaX7vS4vBD7Ie_iov')
    expect(beige).not.toContain('{{bg_header_mail_general}}')
    expect(verde).not.toContain('{{bg_header_mail_general}}')
  })

  it('resolves bg_header_mail_general to empty for themes that never define it (dark/premium)', () => {
    const fields = { ...defaultHeaderFields, brand: 'contenido-aliado' as const }
    const pro = renderHeaderSnippet(fields, 'pro')
    expect(pro).not.toContain('{{bg_header_mail_general}}')
    expect(pro).toContain('background-image: url();')
  })

  it('does not leak any HTML comment (signature or instructional) into the output', () => {
    const snippet = renderHeaderSnippet({ ...defaultHeaderFields, cobranding: true }, 'beige100')
    expect(snippet).not.toContain('<!--')
  })
})
