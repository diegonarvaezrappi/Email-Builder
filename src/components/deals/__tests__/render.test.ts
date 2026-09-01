import { describe, expect, it } from 'vitest'
import { defaultEmailDocument } from '../../../registry'
import { THEME_SLUGS } from '../../../themes/themes'
import { richTextFromPlain } from '../../../richText/model'
import type { EmailDocument } from '../../../model'
import { renderDealsSnippet, stripDealsFieldAssigns } from '../render'
import {
  DEAL_CARD_PIECE_TYPES,
  dealCardFieldsSchema,
  defaultDealCardFields,
  normalizePieceOrder,
  type DealCard,
  type DealCardFields,
  type DealCardPieceType,
  type DealsFields,
} from '../schema'

const BLOCK_ID = 'block-1'

const card = (id: string, over: Partial<DealCardFields> = {}): DealCard => ({
  id,
  fields: { ...defaultDealCardFields, ...over },
})

const cards = (...items: DealCard[]): DealsFields => ({ items })

const render = (fields: DealsFields, over: Partial<EmailDocument> = {}): string =>
  renderDealsSnippet(fields, { ...defaultEmailDocument, ...over }, { blockId: BLOCK_ID })

/** Cuántas veces aparece un literal. */
const count = (html: string, literal: string) => html.split(literal).length - 1

/** Las celdas de deal del par: se cuentan por el `width="50%"` que el maestro
 *  pone en las 6 (2 por fila) — sirve para afirmar que una celda vacía sigue
 *  existiendo como `<td>`. */
const countCells = (html: string) => count(html, 'width="50%"')

describe('renderDealsSnippet · armado de pares', () => {
  it('2 tarjetas = 1 par con las 2 celdas llenas', () => {
    const html = render(cards(card('a'), card('b')))
    expect(count(html, '<table role="module"')).toBe(1)
    expect(count(html, `DCARD:${BLOCK_ID}:a`)).toBeGreaterThan(0)
    expect(count(html, `DCARD:${BLOCK_ID}:b`)).toBeGreaterThan(0)
  })

  it('4 tarjetas = 2 pares', () => {
    const html = render(cards(card('a'), card('b'), card('c'), card('d')))
    expect(count(html, '<table role="module"')).toBe(2)
    for (const id of ['a', 'b', 'c', 'd']) expect(html).toContain(`DCARD:${BLOCK_ID}:${id}`)
  })

  it('1 tarjeta: se conserva el <td> de la celda 2 y se le vacía el contenido', () => {
    const html = render(cards(card('a')))
    expect(count(html, '<table role="module"')).toBe(1)
    // La fila de imágenes y la de textos siguen teniendo sus 2 celdas (la de
    // legales no aparece porque nadie la activó, ver más abajo).
    expect(countCells(html)).toBe(4)
    // Y solo una tarjeta quedó marcada.
    expect(count(html, 'DCARD:')).toBe(count(html, `DCARD:${BLOCK_ID}:a`))
    // La celda vacía no arrastra nada del contenido de ejemplo del maestro.
    expect(count(html, 'role="MARKDOWN"')).toBe(1)
    expect(count(html, 'role="molecula-iconoL"')).toBe(1)
  })

  it('3 tarjetas: el 2º par queda con la celda 2 vacía', () => {
    const html = render(cards(card('a'), card('b'), card('c')))
    expect(count(html, '<table role="module"')).toBe(2)
    // 3 celdas de textos con contenido (a, b, c) — la 4ª quedó vacía.
    expect(count(html, 'role="MARKDOWN"')).toBe(3)
    // Pero las 8 celdas de imagen+texto siguen presentes (4 por par).
    expect(countCells(html)).toBe(8)
  })

  it('0 tarjetas no renderiza nada', () => {
    expect(render(cards())).toBe('')
  })

  // Regresión: hasta el pull 1e1ac59 ("display deals ajustado", 2026-09-01),
  // la celda 2 traía un typo real del maestro (`display: display: table; ;`,
  // CSS inválido que un motor descarta entero, dejando esa celda sin
  // `display` explícito) — se parchaba en la app vía fixDealCell2DisplayTypo.
  // El maestro ya lo arregló de verdad (confirmado leyendo deal_columnas.html
  // directo), así que el parche se quitó — este test ahora solo confirma que
  // el typo sigue sin volver y que ambas celdas producen un `display: table`
  // válido (el maestro deja un espacio distinto entre las 2, cosmético, no se
  // "corrige" — mismo criterio que el resto de la app con formato del maestro).
  it('both cards get a valid display: table on cell 2 (no longer the master\'s broken "display: display: table; ;")', () => {
    const html = render(cards(card('a'), card('b')))
    expect(html).not.toContain('display: display')
    expect(html.match(/style="display: table;\s*text-decoration: none;/g)?.length).toBe(2)
  })
})

describe('renderDealsSnippet · piezas opcionales', () => {
  it('cada pieza apagada borra su etiqueta, prendida deja su texto', () => {
    const on = render(cards(card('a')))
    expect(on).toContain('role="MARKDOWN"')
    expect(on).toContain('role="COMPLEMENTO 1"')
    expect(on).toContain('role="COMPLEMENTO 2"')
    expect(on).toContain('role="CATEGORIA"')
    expect(on).toContain('role="RATING"')
    expect(on).toContain('role="TIEMPO"')
    expect(count(on, 'role="molecula-tag"')).toBe(2)

    const off = render(
      cards(
        card('a', {
          markdownEnabled: false,
          complemento1Enabled: false,
          complemento2Enabled: false,
          categoriaEnabled: false,
          ratingEnabled: false,
          tiempoEnabled: false,
          tag1Enabled: false,
          tag2Enabled: false,
          ctaEnabled: false,
        }),
      ),
    )
    expect(off).not.toContain('role="MARKDOWN"')
    expect(off).not.toContain('role="COMPLEMENTO 1"')
    expect(off).not.toContain('role="COMPLEMENTO 2"')
    expect(off).not.toContain('role="CATEGORIA"')
    expect(off).not.toContain('role="RATING"')
    expect(off).not.toContain('role="TIEMPO"')
    expect(off).not.toContain('role="molecula-tag"')
    // Y nada de <div>/<h4>/<h5> quedó sin cerrar por los cortes.
    expect(count(off, '<div')).toBe(count(off, '</div>'))
    expect(count(off, '<h4')).toBe(count(off, '</h4>'))
    expect(count(off, '<h5')).toBe(count(off, '</h5>'))
  })

  it('los textos de cada pieza reemplazan el ejemplo del maestro', () => {
    const html = render(
      cards(
        card('a', {
          copy1: 'Mi promo',
          copy2: 'Mi bajada',
          markdownText: '$1.234',
          complemento1Text: '50% OFF',
          complemento2Text: richTextFromPlain('$9.999'),
          categoriaText: 'Sushi',
          ratingText: '4.2',
          tiempoText: '15 min.',
          tag1Text: 'envío gratis',
          tag2Text: 'nuevo',
          ctaText: 'Pedir ya',
        }),
      ),
    )
    for (const text of ['Mi promo', 'Mi bajada', '$1.234', '50% OFF', '$9.999', 'Sushi', '4.2', '15 min.', 'envío gratis', 'nuevo', 'Pedir ya']) {
      expect(html).toContain(text)
    }
    // Ningún texto de ejemplo del maestro sobrevive.
    for (const sample of ['99% OFF', 'Italiana', 'xx min.', 'tag 1', 'Pide ahora', '$999']) {
      expect(html).not.toContain(sample)
    }
  })

  it('mantiene los separadores del maestro que no son dato (el &nbsp; del rating/tiempo, el "|" fijo antes del precio anterior)', () => {
    const html = render(
      cards(card('a', { ratingText: '4.2', tiempoText: '15 min.', complemento2Text: richTextFromPlain('Antes $9.999') })),
    )
    expect(html).toContain('&nbsp;4.2')
    expect(html).toContain('&nbsp;15 min.')
    // Sin marcas, renderRichText no envuelve nada en <span> — el "| " que
    // separa esta pieza de COMPLEMENTO 1 sigue siendo el único fijo.
    expect(html).toContain('| Antes $9.999')
  })

  it('copy1/copy2 vacíos quitan su <h4>, y no queda Liquid de la variable', () => {
    const html = render(cards(card('a', { copy1: '', copy2: '' })))
    expect(html).not.toContain('deals_copy_1_promo')
    expect(html).not.toContain('deals_copy_2_promo')
    expect(count(html, '<h4')).toBe(count(html, '</h4>'))
  })

  it('la Corona Pro se apaga sola, sin tocar el badge que la contiene', () => {
    const withCorona = render(cards(card('a')))
    expect(withCorona).toContain('role="MARKDOWN"')
    expect(count(withCorona, 'coronapro_mail_body')).toBe(0) // ya resuelta por el tema
    const withoutCorona = render(cards(card('a', { coronaProEnabled: false })))
    expect(withoutCorona).toContain('role="MARKDOWN"')
    // El badge sigue, con su texto, pero sin la <img> de la corona.
    expect(count(withoutCorona, '<img')).toBe(count(withCorona, '<img') - 1)
  })

  it('apagar el badge borra también la Corona Pro que vive adentro (sin ediciones superpuestas)', () => {
    const html = render(cards(card('a', { markdownEnabled: false, coronaProEnabled: false })))
    expect(html).not.toContain('role="MARKDOWN"')
    expect(count(html, '<img')).toBeGreaterThan(0)
    expect(count(html, '<h4')).toBe(count(html, '</h4>'))
  })

  it('logoUrl vacío elimina la etiqueta <img> del logo por completo', () => {
    const withLogo = render(cards(card('a')))
    expect(withLogo).toContain('role="molecula-iconoL"')
    const withoutLogo = render(cards(card('a', { logoUrl: '' })))
    expect(withoutLogo).not.toContain('role="molecula-iconoL"')
    expect(withoutLogo).not.toContain('alt="LOGO"')
  })

  // logoShape: pedido explícito del usuario 2026-08-25 — exponer la "logo
  // pastilla" del maestro (bd9f4a5) como una 2da forma elegible, en vez de
  // ocultarla siempre. Ver DEAL_LOGO_SHAPE_VALUES en schema.ts.
  describe('logoShape', () => {
    it('"cuadrado" (default) muestra solo el logo cuadrado; la pastilla no aparece ni una vez', () => {
      const html = render(cards(card('a')))
      expect(count(html, 'role="molecula-iconoL"')).toBe(1)
      expect(html).toContain('1ZYWddltBXkpcjXzkdlT2fqWSSR2HYB-j') // logoUrl por defecto
      expect(html).not.toContain('1IY3lFRQnvb9g7cGALAbRBywZ6YpO6QLe') // placeholder de la pastilla
    })

    it('"pastilla" muestra solo el logo pastilla con la URL del usuario; el cuadrado no aparece', () => {
      const html = render(cards(card('a', { logoShape: 'pastilla', logoUrl: 'https://x.test/pastilla.png' })))
      expect(count(html, 'role="molecula-iconoL"')).toBe(1)
      expect(html).toContain('src="https://x.test/pastilla.png"')
      expect(html).not.toContain('1ZYWddltBXkpcjXzkdlT2fqWSSR2HYB-j')
    })

    it('"pastilla" con logoUrl vacío elimina la etiqueta <img>, no deja un <img src="">', () => {
      const html = render(cards(card('a', { logoShape: 'pastilla', logoUrl: '' })))
      expect(html).not.toContain('role="molecula-iconoL"')
      expect(html).not.toContain('src=""')
    })

    it('cambiar la forma no afecta a la otra tarjeta del par', () => {
      const html = render(cards(card('a', { logoShape: 'pastilla', logoUrl: 'https://x.test/pastilla.png' }), card('b')))
      expect(html).toContain('src="https://x.test/pastilla.png"')
      expect(html).toContain('1ZYWddltBXkpcjXzkdlT2fqWSSR2HYB-j') // logo cuadrado por defecto de 'b'
      expect(count(html, 'role="molecula-iconoL"')).toBe(2) // 1 pastilla (a) + 1 cuadrado (b)
    })
  })

  // complemento2Text: pedido explícito del usuario 2026-08-25, en 2 pasos —
  // primero "Antes" se sumó al campo (ya no un literal fijo del maestro),
  // después se pidieron modificadores de texto con tachado SOLO en "Antes"
  // por default. El maestro trae `<del>` fijo (tacha todo su contenido), así
  // que se descarta a favor del tachado selectivo por RUN de renderRichText.
  describe('complemento2Text', () => {
    it('el default tacha SOLO "Antes", " $999" queda sin marcas — el "|" sigue fijo', () => {
      const html = render(cards(card('a')))
      expect(html).toContain('| <span style="text-decoration: line-through;">Antes</span> $999')
      // Ni un <del> del maestro, ni el monto tachado por accidente.
      expect(html).not.toContain('<del>')
      expect(html).not.toContain('line-through;">$999')
    })

    it('permite tachar también el monto (o destachar "Antes") vía marcas explícitas', () => {
      const html = render(
        cards(
          card('a', {
            complemento2Text: [
              { text: 'Antes', marks: [] },
              { text: ' $500', marks: ['strike'] },
            ],
          }),
        ),
      )
      expect(html).toContain('Antes<span style="text-decoration: line-through;"> $500</span>')
    })

    it('otros modificadores (bold/italic/subrayado/superíndice) se renderizan igual que en TextoM', () => {
      const html = render(
        cards(
          card('a', {
            complemento2Text: [{ text: 'Antes $999', marks: ['bold', 'italic'] }],
          }),
        ),
      )
      expect(html).toContain('font-weight: bold;')
      expect(html).toContain('font-style: italic;')
    })

    it('un valor plano sin marcas no agrega tachado ni "Antes" por su cuenta', () => {
      const html = render(cards(card('a', { complemento2Text: richTextFromPlain('$500') })))
      expect(html).toContain('| $500')
      expect(html).not.toContain('Antes')
      expect(html).not.toContain('<del>')
    })

    it('complemento2Enabled false sigue cortando el <h5> entero', () => {
      const html = render(cards(card('a', { complemento2Enabled: false })))
      expect(html).not.toContain('role="COMPLEMENTO 2"')
      expect(html).not.toContain('Antes')
    })

    it('migra un complemento2Text viejo (string plano, de antes de los modificadores) sin invalidar el documento', () => {
      const parsed = dealCardFieldsSchema.parse({ complemento2Text: 'Antes $999' })
      expect(parsed.complemento2Text).toEqual([{ text: 'Antes $999', marks: [] }])
    })
  })

  it('los íconos de tag se pueden cambiar, y cada tag es independiente del otro', () => {
    const html = render(cards(card('a', { tag1IconUrl: 'https://x.test/1.png', tag2Enabled: false })))
    expect(html).toContain('https://x.test/1.png')
    expect(count(html, 'role="molecula-tag"')).toBe(1)
    // El ícono por defecto del tag 2 desapareció junto con su div.
    expect(html).not.toContain('19wcynrgz0OqdDt5S5fVf7yaSx7rAN4Fn')
  })

  // Regresión: pedido explícito del usuario 2026-08-25 — dejar la URL del
  // ícono en blanco (aunque el tag siga "activado") borra el pill completo,
  // mismo criterio ya documentado para "apagar el tag": sin ícono no hay pill.
  it('un tag "activado" pero con el ícono en blanco borra el pill completo, no deja un <img src="">', () => {
    const html = render(cards(card('a', { tag1IconUrl: '', tag2Enabled: false })))
    expect(html).not.toContain('src=""')
    expect(count(html, 'role="molecula-tag"')).toBe(0)
  })
})

describe('renderDealsSnippet · legales (fila del par, toggle por tarjeta)', () => {
  it('ninguna tarjeta la activa = se borra la fila entera', () => {
    const html = render(cards(card('a'), card('b')))
    expect(html).not.toContain('class="legal"')
    expect(countCells(html)).toBe(4)
    expect(count(html, '<tr')).toBe(count(html, '</tr>'))
  })

  it('una sola la activa = la fila aparece con las 2 celdas, y la que no la activó queda con el texto vacío', () => {
    const html = render(cards(card('a', { legalEnabled: true, legalText: 'Solo A' }), card('b')))
    expect(count(html, 'class="legal"')).toBe(2)
    expect(html).toContain('Solo A')
    expect(countCells(html)).toBe(6)
    // El texto de ejemplo del maestro no queda en la celda que no la activó.
    expect(count(html, 'Aplican términos')).toBe(0)
  })

  it('las 2 la activan = cada celda con su propio texto', () => {
    const html = render(
      cards(card('a', { legalEnabled: true, legalText: 'Legal A' }), card('b', { legalEnabled: true, legalText: 'Legal B' })),
    )
    expect(html).toContain('Legal A')
    expect(html).toContain('Legal B')
    expect(count(html, 'class="legal"')).toBe(2)
  })

  it('se decide par por par: el 1er par con legales y el 2º sin', () => {
    const html = render(cards(card('a', { legalEnabled: true }), card('b'), card('c'), card('d')))
    expect(count(html, 'class="legal"')).toBe(2)
  })

  it('una tarjeta impar con legales activa la fila de su par, con la celda de al lado vacía', () => {
    const html = render(cards(card('a'), card('b'), card('c', { legalEnabled: true, legalText: 'Legal C' })))
    expect(html).toContain('Legal C')
    // Acá se cruzan las 2 reglas: la fila de legales es del par (así que
    // aparece), pero la 2ª celda no tiene tarjeta, así que va vacía como sus
    // hermanas de imagen y texto — un solo <span class="legal">, no dos.
    expect(count(html, 'class="legal"')).toBe(1)
    // 1er par sin legales (4 celdas) + 2º par con legales (6) = 10.
    expect(countCells(html)).toBe(10)
    expect(count(html, '<tr')).toBe(count(html, '</tr>'))
  })
})

describe('renderDealsSnippet · enlaces, escapado y limpieza', () => {
  it('cada tarjeta resuelve su propio LINKDEAL, escapado como atributo', () => {
    const html = render(cards(card('a', { link: 'https://x.test/a?b="c"' }), card('b', { link: 'https://y.test/b' })))
    expect(html).not.toContain('LINKDEAL')
    expect(html).toContain('https://x.test/a?b=&quot;c&quot;')
    expect(html).toContain('https://y.test/b')
  })

  it('escapa el texto del usuario en los nodos HTML', () => {
    const html = render(cards(card('a', { copy1: '<script>alert(1)</script>' })))
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('la imagen de producto va por cssUrlValue (no rompe el url(...) del background)', () => {
    const html = render(cards(card('a', { productImageUrl: 'https://x.test/a b(c).png' })))
    expect(html).toContain('https://x.test/a%20b%28c%29.png')
    expect(html).not.toContain('a b(c).png')
  })

  it('no deja comentarios del maestro ni Liquid sin resolver, en ninguno de los 11 temas', () => {
    for (const tema of THEME_SLUGS) {
      const html = render(cards(card('a'), card('b', { legalEnabled: true })), {
        global: { ...defaultEmailDocument.global, tema },
      })
      // Los comentarios DCARD son de la app (los usa el lienzo), los del maestro no deben pasar.
      expect(html, tema).not.toContain('MODULO DEALS')
      expect(html, tema).not.toContain('SECCION IMAGENES')
      expect(html.match(/\{\{/g), tema).toBeNull()
      expect(html.match(/\{%/g), tema).toBeNull()
    }
  })

  it('resuelve las 2 variables de tema que no terminan en _mail_general', () => {
    const html = render(cards(card('a')))
    expect(html).not.toContain('coronapro_mail_body')
    expect(html).not.toContain('body_container_background_radius-peq')
    // El radio chico del contenedor del deal, con su valor real del tema.
    expect(html).toContain('border-radius:  8px')
  })
})

describe('renderDealsSnippet · orden de piezas (pieceOrder)', () => {
  it('el orden default (natural) marca las 7 piezas con DPIECE, balanceadas, sin cambiar nada más del HTML', () => {
    const html = render(cards(card('a')))
    for (const type of DEAL_CARD_PIECE_TYPES) {
      // 2 = apertura + cierre (`/DPIECE:a:copy1` también contiene el literal
      // "DPIECE:a:copy1" como substring, de ahí el 2 en vez de 1).
      expect(count(html, `DPIECE:a:${type}`)).toBe(2)
      expect(count(html, `<!-- DPIECE:a:${type} -->`)).toBe(1)
      expect(count(html, `<!-- /DPIECE:a:${type} -->`)).toBe(1)
    }
    expect(count(html, 'DPIECE:')).toBe(count(html, '/DPIECE:') * 2)
  })

  it('un orden personalizado hace aparecer las piezas en ESE orden en el HTML', () => {
    const custom: DealCardPieceType[] = ['cta', 'tag2', 'tag1', 'rating', 'precio', 'copy2', 'copy1']
    const html = render(cards(card('a', { pieceOrder: custom })))
    const positions = custom.map((type) => html.indexOf(`DPIECE:a:${type}`))
    for (let i = 0; i < positions.length; i++) expect(positions[i]).toBeGreaterThan(-1)
    for (let i = 0; i < positions.length - 1; i++) expect(positions[i]).toBeLessThan(positions[i + 1])
    // El texto del CTA (ahora primero) aparece antes que "Promo especial" (copy1, ahora último).
    expect(html.indexOf('Pide ahora')).toBeLessThan(html.indexOf('Promo especial'))
  })

  it('reordenar y desactivar piezas al mismo tiempo no deja tags huérfanos', () => {
    const html = render(
      cards(
        card('a', {
          pieceOrder: ['cta', 'copy1', 'tag1', 'copy2', 'precio', 'rating', 'tag2'],
          tag1Enabled: false,
          markdownEnabled: false,
          coronaProEnabled: false,
        }),
      ),
    )
    expect(count(html, '<div')).toBe(count(html, '</div>'))
    expect(count(html, '<h4')).toBe(count(html, '</h4>'))
    expect(count(html, '<h5')).toBe(count(html, '</h5>'))
    // tag1 apagado (borrado entero); tag2 sigue habilitado por default.
    expect(count(html, 'role="molecula-tag"')).toBe(1)
    expect(html).not.toContain('role="MARKDOWN"')
  })

  it('la fila de legales no se ve afectada por ningún pieceOrder', () => {
    const custom: DealCardPieceType[] = [...DEAL_CARD_PIECE_TYPES].reverse()
    const html = render(cards(card('a', { pieceOrder: custom, legalEnabled: true, legalText: 'Ley custom' }), card('b')))
    expect(html).toContain('Ley custom')
    expect(count(html, 'class="legal"')).toBe(2)
  })

  it('normalizePieceOrder resuelve un orden corrupto (falta un tipo, tiene un duplicado) a una permutación válida de 7', () => {
    const corrupted = ['cta', 'cta', 'copy1'] as DealCardPieceType[]
    const normalized = normalizePieceOrder(corrupted)
    expect(normalized).toHaveLength(DEAL_CARD_PIECE_TYPES.length)
    expect(new Set(normalized).size).toBe(DEAL_CARD_PIECE_TYPES.length)
    for (const type of DEAL_CARD_PIECE_TYPES) expect(normalized).toContain(type)
    // Los que sí venían en el input conservan su posición relativa al frente.
    expect(normalized[0]).toBe('cta')
    expect(normalized[1]).toBe('copy1')
  })

  it('un pieceOrder corrupto en el render no rompe ni pierde piezas (normalizePieceOrder corre también acá)', () => {
    const html = render(cards(card('a', { pieceOrder: ['cta', 'cta'] as DealCardPieceType[] })))
    for (const type of DEAL_CARD_PIECE_TYPES) expect(html).toContain(`DPIECE:a:${type}`)
  })
})

describe('stripDealsFieldAssigns', () => {
  it('borra los 4 assigns de ejemplo y el comentario del límite de 2 líneas', () => {
    const input = [
      "{% assign deals_copy_1_promo = 'promo promo' %}",
      "{% assign deals_copy_2_promo = 'promo promo promo ' %}",
      '<!-- LÍMITE DE 2 LÍNEAS: cada celda de deal mide ~50% de 480px.',
      '     A ese ancho entran ~27-28 caracteres por línea. -->',
      '{% assign deals_copy_1_promo = deals_copy_1_promo | truncate: 50 %}',
      '{% assign deals_copy_2_promo = deals_copy_2_promo | truncate: 50 %}',
      '<p>algo</p>',
    ].join('\n')
    const out = stripDealsFieldAssigns(input)
    expect(out).not.toContain('deals_copy_1_promo')
    expect(out).not.toContain('deals_copy_2_promo')
    expect(out).not.toContain('LÍMITE DE 2 LÍNEAS')
    expect(out).toContain('<p>algo</p>')
  })

  it('no toca otro Liquid del mail', () => {
    const input = "{% assign cond = '' %}\n{{content_blocks.${FOOTER}}}"
    expect(stripDealsFieldAssigns(input)).toBe(input)
  })
})
