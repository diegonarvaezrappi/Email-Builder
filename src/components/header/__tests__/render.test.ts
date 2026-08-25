import { describe, expect, it } from 'vitest'
import { defaultHeaderFields, COBRANDING_SIZE_VALUES } from '../schema'
import { renderHeaderSnippet } from '../render'

describe('renderHeaderSnippet', () => {
  // Defaults pedidos explícitamente por el usuario 2026-08-25: layout
  // 'columnas' y cobranding activado (con la imagen que dio) desde que carga
  // la app — antes eran 'centrado' y cobranding apagado.
  it('renders the default fields (Rappi, columnas, claro, cobranding activado) with exactly the default cobranding markup', () => {
    const snippet = renderHeaderSnippet(defaultHeaderFields, 'beige100')
    expect(snippet).toContain('alt="Rappi"')
    expect(snippet).toContain('class="cobranding-m"')
    expect(snippet).not.toContain('cobranding-s"')
    expect(snippet).not.toContain('cobranding-l"')
    expect(snippet).not.toContain('cobranding-xl"')
    expect(snippet).toContain('src="https://lh3.googleusercontent.com/d/1JYYWeVebW_G73Y2f-Enj6gwV--MN3Y_u"')
    // El separador solo va con layout centrado (ver el test dedicado más abajo) — columnas nunca lo trae.
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
    // El default ahora es layout 'columnas' — hay que fijar 'centrado' a mano
    // en los 2 casos que lo necesitan, no asumirlo del default.
    const centradoSinCobranding = renderHeaderSnippet(
      { ...defaultHeaderFields, layout: 'centrado', cobranding: false },
      'beige100',
    )
    const centradoConCobranding = renderHeaderSnippet(
      { ...defaultHeaderFields, layout: 'centrado', cobranding: true },
      'beige100',
    )
    const columnasConCobranding = renderHeaderSnippet(
      { ...defaultHeaderFields, layout: 'columnas', cobranding: true },
      'beige100',
    )

    expect(centradoSinCobranding).not.toContain('alt="|"')
    expect(centradoConCobranding).toContain('alt="|"')
    expect(columnasConCobranding).not.toContain('alt="|"')
  })

  // Recorre COBRANDING_SIZE_VALUES (no una lista literal): así el test sigue
  // cubriendo automáticamente cualquier tamaño futuro que se exponga ahí —
  // incluida 'xl', agregada 2026-08-25 (antes de eso, este mismo test cubría
  // la regresión de que 'xl' quedara siempre presente sin importar el tamaño
  // elegido — un 4to logo duplicado — porque COBRANDING_IMG_RE no la
  // matcheaba; ver la nota en render.ts).
  it('keeps exactly one cobranding image, matching the chosen size', () => {
    for (const size of COBRANDING_SIZE_VALUES) {
      const snippet = renderHeaderSnippet({ ...defaultHeaderFields, cobranding: true, cobrandingSize: size }, 'beige100')
      expect(snippet).toContain(`class="cobranding-${size}"`)
      for (const other of COBRANDING_SIZE_VALUES) {
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

  // Regresión: pedido explícito del usuario 2026-08-25 — un campo de URL de
  // imagen vacío debe borrar el <img> entero en vez de dejar src="" (evita el
  // ícono de "imagen no cargada" en el mail).
  it('removes the cobranding <img> entirely when the URL is left blank, instead of leaving src=""', () => {
    const snippet = renderHeaderSnippet({ ...defaultHeaderFields, cobranding: true, cobrandingImageUrl: '' }, 'beige100')
    expect(snippet).not.toContain('<img class="cobranding-m"')
    expect(snippet).not.toContain('src=""')
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

  it('replaces the brand logo src with the URL the user chose (customLogo on)', () => {
    const snippet = renderHeaderSnippet(
      // cobranding se apaga a mano: este test cubre el logo de MARCA, no el
      // de cobranding (que ahora está prendido por default) — así se sigue
      // pudiendo afirmar que el swap de marca no lo toca para nada.
      { ...defaultHeaderFields, customLogo: true, logoUrl: 'https://example.com/mi-logo.png', cobranding: false },
      'beige100',
    )
    expect(snippet).toContain('src="https://example.com/mi-logo.png"')
    expect(snippet).not.toContain('https://lh3.googleusercontent.com/d/1jwEAvRrPJreG7pZbEGhZuo18kVjnw4Cf')
    expect(snippet).not.toContain('cobranding-')
  })

  it('escapes special characters in a user-provided logo URL (customLogo on)', () => {
    const snippet = renderHeaderSnippet(
      { ...defaultHeaderFields, customLogo: true, logoUrl: 'https://example.com/a"b&c' },
      'beige100',
    )
    expect(snippet).toContain('src="https://example.com/a&quot;b&amp;c"')
  })

  // Regresión: pedido explícito del usuario — el cambio de URL/tamaño de logo
  // NO debe aplicar a ninguna de las 10 marcas reales, solo a "Personalizado"
  // (customLogo). Antes de este fix, logoUrl/logoSize se aplicaban siempre,
  // sin importar la marca elegida.
  it('ignores logoUrl and logoSize entirely when customLogo is false, even if they hold values', () => {
    const snippet = renderHeaderSnippet(
      { ...defaultHeaderFields, customLogo: false, logoUrl: 'https://example.com/deberia-ignorarse.png', logoSize: 'l' },
      'beige100',
    )
    expect(snippet).not.toContain('deberia-ignorarse')
    expect(snippet).toContain('src="https://lh3.googleusercontent.com/d/1jwEAvRrPJreG7pZbEGhZuo18kVjnw4Cf"')
    const img = snippet.match(/<img class="logo-base1"[^>]*alt="Rappi"[^>]*>/)?.[0]
    expect(img).toBeDefined()
    expect(img).toContain('height: 30px; max-height: 30px; min-height: 30px')
  })

  it('leaves the brand logo height untouched when logoSize is "m" (default, no-op)', () => {
    const snippet = renderHeaderSnippet({ ...defaultHeaderFields, customLogo: true }, 'beige100')
    const img = snippet.match(/<img class="logo-base1"[^>]*alt="Rappi"[^>]*>/)?.[0]
    expect(img).toBeDefined()
    expect(img).toContain('height: 30px; max-height: 30px; min-height: 30px')
  })

  it('shrinks the brand logo height when logoSize is "s" (customLogo on)', () => {
    const snippet = renderHeaderSnippet({ ...defaultHeaderFields, customLogo: true, logoSize: 's' }, 'beige100')
    const img = snippet.match(/<img class="logo-base1"[^>]*alt="Rappi"[^>]*>/)?.[0]
    expect(img).toBeDefined()
    // 30 * 0.8 = 24
    expect(img).toContain('height: 24px; max-height: 24px; min-height: 24px')
  })

  it('grows the brand logo height when logoSize is "l" (customLogo on)', () => {
    const snippet = renderHeaderSnippet({ ...defaultHeaderFields, customLogo: true, logoSize: 'l' }, 'beige100')
    const img = snippet.match(/<img class="logo-base1"[^>]*alt="Rappi"[^>]*>/)?.[0]
    expect(img).toBeDefined()
    // 30 * 1.25 = 37.5 -> redondeado a 38
    expect(img).toContain('height: 38px; max-height: 38px; min-height: 38px')
  })

  it('resizing the brand logo does not touch the separator logo or the cobranding images', () => {
    const snippet = renderHeaderSnippet(
      // El separador solo existe en layout 'centrado' (ver el test dedicado
      // más arriba) — hay que fijarlo a mano, ya no es el default.
      { ...defaultHeaderFields, layout: 'centrado', customLogo: true, logoSize: 'l', cobranding: true },
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
