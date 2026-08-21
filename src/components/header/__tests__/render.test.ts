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

  // Regresión: el maestro agregó una 4ta variante ("cobranding-xl") en el pull
  // 2026-08-21 que COBRANDING_IMG_RE no matcheaba — quedaba siempre presente
  // sin importar el tamaño elegido (un logo duplicado). No está expuesta como
  // tamaño seleccionable (COBRANDING_SIZE_VALUES sigue en s/m/l), así que debe
  // desaparecer siempre, para los 3 tamaños reales.
  it('never leaks the not-yet-exposed "cobranding-xl" master variant', () => {
    for (const size of ['s', 'm', 'l'] as const) {
      const snippet = renderHeaderSnippet({ ...defaultHeaderFields, cobranding: true, cobrandingSize: size }, 'beige100')
      expect(snippet).not.toContain('cobranding-xl')
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

  it('keeps the master border-radius on the cobranding image by default', () => {
    const snippet = renderHeaderSnippet({ ...defaultHeaderFields, cobranding: true }, 'beige100')
    const img = snippet.match(/<img class="cobranding-m"[^>]*>/)?.[0]
    expect(img).toBeDefined()
    expect(img).toContain('border-radius')
  })

  it('strips the border-radius from the cobranding image when cobrandingRounded is false', () => {
    const snippet = renderHeaderSnippet(
      { ...defaultHeaderFields, cobranding: true, cobrandingRounded: false },
      'beige100',
    )
    const img = snippet.match(/<img class="cobranding-m"[^>]*>/)?.[0]
    expect(img).toBeDefined()
    expect(img).not.toContain('border-radius')
    // El resto del estilo de la <img> sobrevive intacto.
    expect(img).toContain('max-width: 180px')
    expect(img).toContain('margin: 0 auto')
  })

  it('never strips the border-radius of the header wrapper table, only the cobranding image', () => {
    // rappi-turbo es una de las 4 marcas cuyo <table> envolvente trae
    // `border-radius: 10px; overflow: hidden` (las mismas 4 que usan
    // bg_header_mail_general) — es lo que le redondea las esquinas al header
    // completo, y no debe desaparecer al desactivar el del cobranding. Se usa
    // esta marca justamente porque tiene los 2 border-radius a la vez, así que
    // el test falla si el strip deja de estar acotado a la <img>.
    const base = { ...defaultHeaderFields, brand: 'rappi-turbo' as const, cobranding: true }
    const rounded = renderHeaderSnippet(base, 'beige100')
    const notRounded = renderHeaderSnippet({ ...base, cobrandingRounded: false }, 'beige100')

    for (const snippet of [rounded, notRounded]) {
      expect(snippet).toContain('border-radius: 10px')
    }
    // La única diferencia es el de la <img>: 2 ocurrencias (wrapper + img)
    // contra 1 (solo wrapper).
    expect((rounded.match(/border-radius/g) ?? []).length).toBe(2)
    expect((notRounded.match(/border-radius/g) ?? []).length).toBe(1)
  })

  it('does nothing with cobrandingRounded when cobranding is off (no cobranding markup at all)', () => {
    const snippet = renderHeaderSnippet(
      { ...defaultHeaderFields, brand: 'rappi-turbo', cobranding: false, cobrandingRounded: false },
      'beige100',
    )
    expect(snippet).not.toContain('cobranding-')
    // El del wrapper sobrevive: no depende del cobranding en absoluto.
    expect(snippet).toContain('border-radius: 10px')
  })

  it('keeps the master logo asset untouched when logoUrl is empty (default)', () => {
    const withDefault = renderHeaderSnippet(defaultHeaderFields, 'beige100')
    expect(withDefault).toContain('src="https://lh3.googleusercontent.com/d/1jwEAvRrPJreG7pZbEGhZuo18kVjnw4Cf"')
  })

  it('replaces the brand logo src with the URL the user chose', () => {
    const snippet = renderHeaderSnippet({ ...defaultHeaderFields, logoUrl: 'https://example.com/mi-logo.png' }, 'beige100')
    expect(snippet).toContain('src="https://example.com/mi-logo.png"')
    expect(snippet).not.toContain('https://lh3.googleusercontent.com/d/1jwEAvRrPJreG7pZbEGhZuo18kVjnw4Cf')
    // El logo de cobranding (deshabilitado por default) no se ve afectado.
    expect(snippet).not.toContain('cobranding-')
  })

  it('escapes special characters in a user-provided logo URL', () => {
    const snippet = renderHeaderSnippet({ ...defaultHeaderFields, logoUrl: 'https://example.com/a"b&c' }, 'beige100')
    expect(snippet).toContain('src="https://example.com/a&quot;b&amp;c"')
  })

  it('leaves the brand logo height untouched when logoSize is "m" (default, no-op)', () => {
    const snippet = renderHeaderSnippet(defaultHeaderFields, 'beige100')
    const img = snippet.match(/<img class="logo-base1"[^>]*alt="Rappi"[^>]*>/)?.[0]
    expect(img).toBeDefined()
    expect(img).toContain('height: 30px; max-height: 30px; min-height: 30px')
  })

  it('shrinks the brand logo height when logoSize is "s"', () => {
    const snippet = renderHeaderSnippet({ ...defaultHeaderFields, logoSize: 's' }, 'beige100')
    const img = snippet.match(/<img class="logo-base1"[^>]*alt="Rappi"[^>]*>/)?.[0]
    expect(img).toBeDefined()
    // 30 * 0.8 = 24
    expect(img).toContain('height: 24px; max-height: 24px; min-height: 24px')
  })

  it('grows the brand logo height when logoSize is "l"', () => {
    const snippet = renderHeaderSnippet({ ...defaultHeaderFields, logoSize: 'l' }, 'beige100')
    const img = snippet.match(/<img class="logo-base1"[^>]*alt="Rappi"[^>]*>/)?.[0]
    expect(img).toBeDefined()
    // 30 * 1.25 = 37.5 -> redondeado a 38
    expect(img).toContain('height: 38px; max-height: 38px; min-height: 38px')
  })

  it('resizing the brand logo does not touch the separator logo or the cobranding images', () => {
    const snippet = renderHeaderSnippet(
      { ...defaultHeaderFields, logoSize: 'l', cobranding: true },
      'beige100',
    )
    // El separador (alt="|") sigue con el alto original del maestro, sin escalar.
    const separator = snippet.match(/<img class="logo-base1"[^>]*alt="\|"[^>]*>/)?.[0]
    expect(separator).toBeDefined()
    expect(separator).toContain('height: 30px; max-height: 30px; min-height: 30px')
    // El cobranding-m tampoco cambia (su propio tamaño se controla aparte).
    const cobrandingImg = snippet.match(/<img class="cobranding-m"[^>]*>/)?.[0]
    expect(cobrandingImg).toBeDefined()
    expect(cobrandingImg).toContain('height: 36px; max-height: 36px; min-height: 36px')
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
