import { describe, expect, it } from 'vitest'
import { defaultEmailDocument } from '../../../registry'
import { THEME_SLUGS } from '../../../themes/themes'
import type { EmailDocument } from '../../../model'
import { renderLogosSnippet } from '../render'
import { logosFieldsSchema, defaultLogosFields, type LogosFields } from '../schema'
import type { ModuleItem } from '../../../moduleItems/schemas'

const BLOCK_ID = 'logos-block-1'

const render = (fields: LogosFields, over: Partial<EmailDocument> = {}): string =>
  renderLogosSnippet(fields, { ...defaultEmailDocument, ...over }, { blockId: BLOCK_ID })

const NO_LIQUID_TAG_RE = /\{%/
const UNRESOLVED_MODULE_ALIGN_RE = /\{\{\s*(body_alineado_molecular|alineado_molecular_mail_body)\s*\}\}/
const UNRESOLVED_GENERAL_RE = /\{\{\s*[a-z_0-9]+_mail_general\s*\}\}/

const item = (type: ModuleItem['type'], id: string, fields: unknown): ModuleItem => ({ id, areaKey: 'main', type, fields }) as ModuleItem

const withLogo = (fields: LogosFields, index: number, patch: Partial<LogosFields['logos'][number]>): LogosFields => {
  const logos = [...fields.logos] as LogosFields['logos']
  logos[index] = { ...logos[index], ...patch }
  return { ...fields, logos }
}

describe('renderLogosSnippet · dual-table (escritorio + mobile)', () => {
  it('renders both tables', () => {
    const html = render(defaultLogosFields)
    expect(html).toContain('class="mobile_hide"')
    expect(html).toContain('desktop_hide')
  })

  it('the free area renders IN BOTH tables identically', () => {
    const html = render(defaultLogosFields)
    expect(html.match(/Titulo/g)?.length).toBe(2)
    expect(html.match(/bloque de texto bloque de texto bloque de texto/g)?.length).toBe(2)
  })

  it('the SAME grid (3 logos by default) renders IN BOTH tables', () => {
    const html = render(defaultLogosFields)
    expect(html.match(/role="logo1"/g)?.length).toBe(2)
    expect(html.match(/role="logo2"/g)?.length).toBe(2)
    expect(html.match(/role="logo3"/g)?.length).toBe(2)
  })
})

describe('renderLogosSnippet · grilla de 3 logos (default)', () => {
  it('renders exactly 3 logo cells per table', () => {
    const html = render(defaultLogosFields)
    expect(html.match(/background-image: url\(/g)?.length).toBe(6) // 3 logos × 2 tablas
  })

  it('substitutes each logo\'s own URL independently', () => {
    let fields = withLogo(defaultLogosFields, 0, { imageUrl: 'https://x.test/l1.png' })
    fields = withLogo(fields, 1, { imageUrl: 'https://x.test/l2.png' })
    const html = render(fields)
    expect(html.match(/url\(https:\/\/x\.test\/l1\.png\)/g)?.length).toBe(2)
    expect(html.match(/url\(https:\/\/x\.test\/l2\.png\)/g)?.length).toBe(2)
    // El logo 3 no se tocó — sigue con la URL de fábrica.
    expect(html.match(/url\(https:\/\/lh3\.googleusercontent\.com\/d\/1B4hOqqkpKSu2cQHale6dE-hfLX6yfO7O\)/g)?.length).toBe(2)
  })

  it('blank imageUrl on ONE logo strips its background-image entirely, others survive, in BOTH tables', () => {
    const fields = withLogo(defaultLogosFields, 1, { imageUrl: '' })
    const html = render(fields)
    expect(html.match(/background-image: url\(/g)?.length).toBe(4) // 2 logos × 2 tablas (logo2 sin fondo)
    // El <img> vacío interno NUNCA se toca, sobrevive igual en las 6 celdas.
    expect(html.match(/1_q4ca1b7DkKOGnFqwVfKMTFTmhMp0E2A/g)?.length).toBe(6)
  })

  it('logosBorderRadiusEnabled=true (default) adds 7px to every logo cell, in BOTH tables', () => {
    const html = render(defaultLogosFields)
    expect(html.match(/border-radius: 7px/g)?.length).toBe(6)
  })

  it('logosBorderRadiusEnabled=false removes it from every logo cell', () => {
    const html = render({ ...defaultLogosFields, logosBorderRadiusEnabled: false })
    expect(html).not.toContain('border-radius: 7px')
  })

  it('per-logo link: OFF by default (unwrapped <a>, no leftover token), ON substitutes the real link', () => {
    const off = render(defaultLogosFields)
    expect(off).not.toContain('AQUIELLINKDELOGO')
    const fields = withLogo(defaultLogosFields, 2, { linkEnabled: true, link: 'https://x.test/logo3' })
    const on = render(fields)
    expect(on.match(/href="https:\/\/x\.test\/logo3"/g)?.length).toBe(2) // 1 por tabla
  })
})

describe('renderLogosSnippet · grilla de 4 logos (sin role, por posición documental)', () => {
  it('renders exactly 4 logo cells per table', () => {
    const html = render({ ...defaultLogosFields, gridSize: '4' })
    expect(html.match(/background-image: url\(/g)?.length).toBe(8) // 4 logos × 2 tablas
  })

  it('each of the 4 logo slots (2 <th> + 2 <td>) gets its own URL, in document order', () => {
    let fields: LogosFields = { ...defaultLogosFields, gridSize: '4' }
    fields = withLogo(fields, 0, { imageUrl: 'https://x.test/l1.png' })
    fields = withLogo(fields, 1, { imageUrl: 'https://x.test/l2.png' })
    fields = withLogo(fields, 2, { imageUrl: 'https://x.test/l3.png' })
    fields = withLogo(fields, 3, { imageUrl: 'https://x.test/l4.png' })
    const html = render(fields)
    for (const n of [1, 2, 3, 4]) {
      expect(html.match(new RegExp(`url\\(https://x\\.test/l${n}\\.png\\)`, 'g'))?.length).toBe(2)
    }
  })
})

describe('renderLogosSnippet · grilla de 6 logos (incl. el typo real del maestro)', () => {
  it('renders exactly 6 logo cells per table', () => {
    const html = render({ ...defaultLogosFields, gridSize: '6' })
    expect(html.match(/background-image: url\(/g)?.length).toBe(12) // 6 logos × 2 tablas
  })

  it('logo3\'s link resolves independently even though the master reuses logo2\'s token for it (AQUIELLINKDELOGO2)', () => {
    let fields: LogosFields = { ...defaultLogosFields, gridSize: '6' }
    fields = withLogo(fields, 1, { linkEnabled: true, link: 'https://x.test/logo2' }) // índice 1 = logo2
    fields = withLogo(fields, 2, { linkEnabled: true, link: 'https://x.test/logo3' }) // índice 2 = logo3
    const html = render(fields)
    expect(html.match(/href="https:\/\/x\.test\/logo2"/g)?.length).toBe(2)
    expect(html.match(/href="https:\/\/x\.test\/logo3"/g)?.length).toBe(2)
  })

  it('each of the 6 logos keeps its own independent URL', () => {
    let fields: LogosFields = { ...defaultLogosFields, gridSize: '6' }
    for (let i = 0; i < 6; i++) fields = withLogo(fields, i, { imageUrl: `https://x.test/l${i + 1}.png` })
    const html = render(fields)
    for (let i = 1; i <= 6; i++) {
      expect(html.match(new RegExp(`url\\(https://x\\.test/l${i}\\.png\\)`, 'g'))?.length).toBe(2)
    }
  })
})

describe('renderLogosSnippet · área libre', () => {
  it('a custom item renders in BOTH tables, not just one', () => {
    const fields = logosFieldsSchema.parse({ items: [item('TITULO_TEXTO', 'x1', { text: 'Mi título' })] })
    const html = render(fields)
    expect(html.match(/Mi título/g)?.length).toBe(2)
  })

  it('wraps each item with its own MITEM markers, blockId-first, present in BOTH table copies', () => {
    const html = render(logosFieldsSchema.parse({ items: [item('TITULO_TEXTO', 'item-1', { text: 'x' })] }))
    expect(html.match(new RegExp(`<!-- MITEM:${BLOCK_ID}:item-1 -->`, 'g'))?.length).toBe(2)
  })
})

describe('renderLogosSnippet · orden de celdas', () => {
  it('textoPrimero (default): the free-area h2 appears before the grid in BOTH tables', () => {
    const html = render(defaultLogosFields)
    expect(html.indexOf('<h2')).toBeLessThan(html.indexOf('role="logo1"'))
  })

  it('logosPrimero: the grid now comes before the free-area h2', () => {
    const html = render({ ...defaultLogosFields, cellOrder: 'logosPrimero' })
    expect(html.indexOf('role="logo1"')).toBeLessThan(html.indexOf('<h2'))
  })

  it('logosPrimero still renders exactly 2 free areas and the full grid twice (nothing lost in the swap)', () => {
    const html = render({ ...defaultLogosFields, cellOrder: 'logosPrimero' })
    expect(html.match(/<h2/g)?.length).toBe(2)
    expect(html.match(/role="logo1"/g)?.length).toBe(2)
  })
})

describe('renderLogosSnippet · link general (LINKMODULLOGOS)', () => {
  it('linkEnabled=false (default): unwraps the <a>, no href/token for the module link', () => {
    const html = render(defaultLogosFields)
    expect(html).not.toContain('LINKMODULLOGOS')
  })

  it('linkEnabled=true: keeps the module <a>, substitutes the real link (wraps BOTH tables, only 1)', () => {
    const html = render({ ...defaultLogosFields, linkEnabled: true, link: 'https://x.test/promo' })
    expect(html.match(/href="https:\/\/x\.test\/promo"/g)?.length).toBe(1)
  })
})

describe('renderLogosSnippet · alineado y fondo generales', () => {
  it('left (default): no unresolved module-align braces', () => {
    const html = render(defaultLogosFields)
    expect(html).not.toMatch(UNRESOLVED_MODULE_ALIGN_RE)
  })

  it('center: applies to BOTH tables', () => {
    const html = render({ ...defaultLogosFields, align: 'center' })
    expect(html.match(/role="molecula-texto"[^>]*text-align: center/g)?.length).toBe(2)
  })

  it('backgroundEnabled=false (default): "off" theme values', () => {
    const html = render(defaultLogosFields, { global: { ...defaultEmailDocument.global, tema: 'beige100' } })
    expect(html).toContain('background:rgba(0,0,0,0.0)')
  })

  it('backgroundEnabled=true: "on" theme values', () => {
    const html = render({ ...defaultLogosFields, backgroundEnabled: true }, { global: { ...defaultEmailDocument.global, tema: 'beige100' } })
    expect(html).toContain('background:rgba(242,211,174,0.5)')
  })
})

describe('renderLogosSnippet · sin fugas de Liquid, en los 12 temas × 3 tamaños de grilla', () => {
  for (const gridSize of ['3', '4', '6'] as const) {
    it.each(THEME_SLUGS)(`gridSize=${gridSize} · %s: no {%% %%} tags, no unresolved _mail_general`, (tema) => {
      const html = render({ ...defaultLogosFields, gridSize }, { global: { ...defaultEmailDocument.global, tema } })
      expect(html).not.toMatch(NO_LIQUID_TAG_RE)
      expect(html).not.toMatch(UNRESOLVED_GENERAL_RE)
      expect(html).not.toMatch(UNRESOLVED_MODULE_ALIGN_RE)
    })
  }
})
