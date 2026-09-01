import { describe, expect, it } from 'vitest'
import { defaultEmailDocument } from '../../../registry'
import { THEME_SLUGS } from '../../../themes/themes'
import type { EmailDocument } from '../../../model'
import { renderCol3Snippet } from '../render'
import { col3FieldsSchema, defaultCol3Fields, type Col3Fields } from '../schema'
import type { ModuleItem } from '../../../moduleItems/schemas'

const BLOCK_ID = 'col3-block-1'

const render = (fields: Col3Fields, over: Partial<EmailDocument> = {}): string =>
  renderCol3Snippet(fields, { ...defaultEmailDocument, ...over }, { blockId: BLOCK_ID })

const NO_LIQUID_TAG_RE = /\{%/
const UNRESOLVED_MODULE_ALIGN_RE = /\{\{\s*(body_alineado_molecular|alineado_molecular_mail_body)\s*\}\}/

const item = (type: ModuleItem['type'], id: string, fields: unknown, areaKey: string): ModuleItem => ({ id, areaKey, type, fields }) as ModuleItem

const withCell = (fields: Col3Fields, index: number, patch: Partial<Col3Fields['cells'][number]>): Col3Fields => {
  const cells = [...fields.cells] as Col3Fields['cells']
  cells[index] = { ...cells[index], ...patch }
  return { ...fields, cells }
}

describe('renderCol3Snippet · imagen "full" (una por celda)', () => {
  it('renders each cell\'s own default image URL, border-radius OFF (matches the master)', () => {
    const html = render(defaultCol3Fields)
    for (const url of defaultCol3Fields.cells.map((c) => c.image.imageUrl)) {
      expect(html).toContain(`src="${url}"`)
    }
    expect(html).not.toContain('border-radius: 8px')
  })

  it('borderRadiusEnabled=true on ONE cell only adds the radius to that cell\'s <img>', () => {
    const fields = withCell(defaultCol3Fields, 0, { image: { ...defaultCol3Fields.cells[0].image, borderRadiusEnabled: true } })
    const html = render(fields)
    expect(html.match(/border-radius: 8px/g)?.length).toBe(1)
  })

  it('blank URL removes only THAT cell\'s <img> — the other 2 survive', () => {
    const fields = withCell(defaultCol3Fields, 1, { image: { ...defaultCol3Fields.cells[1].image, imageUrl: '' } })
    const html = render(fields)
    expect(html).not.toContain(defaultCol3Fields.cells[1].image.imageUrl)
    expect(html).toContain(`src="${defaultCol3Fields.cells[0].image.imageUrl}"`)
    expect(html).toContain(`src="${defaultCol3Fields.cells[2].image.imageUrl}"`)
  })

  it('substitutes a custom URL on the targeted cell only', () => {
    const fields = withCell(defaultCol3Fields, 2, { image: { ...defaultCol3Fields.cells[2].image, imageUrl: 'https://x.test/mine.png' } })
    const html = render(fields)
    expect(html).toContain('src="https://x.test/mine.png"')
    expect(html).not.toContain(defaultCol3Fields.cells[2].image.imageUrl)
  })
})

describe('renderCol3Snippet · área libre (3 celdas, default icono+separador+texto corto)', () => {
  it('renders each cell\'s own default items', () => {
    const html = render(defaultCol3Fields)
    expect(html.match(/role="molecula-iconoM"/g)?.length).toBe(3)
    expect(html.match(/Texto corto/g)?.length).toBe(3)
  })

  it('an item placed only in cell2 renders only once, not in every cell', () => {
    const fields = col3FieldsSchema.parse({ items: [item('SUBTITULO_TEXTO', 'x1', { text: 'Solo celda 2' }, 'cell2')] })
    const html = render(fields)
    expect(html.match(/Solo celda 2/g)?.length).toBe(1)
  })

  it('an empty item list renders every cell\'s free area with nothing inside', () => {
    const html = render(col3FieldsSchema.parse({ items: [] }))
    expect(html).not.toContain('role="molecula-icono')
    expect(html).not.toContain('Texto corto')
  })
})

describe('renderCol3Snippet · marcadores MITEM', () => {
  it('wraps each item with its own MITEM markers, blockId-first, regardless of cell', () => {
    const html = render(col3FieldsSchema.parse({ items: [item('SUBTITULO_TEXTO', 'item-1', { text: 'x' }, 'cell3')] }))
    expect(html).toContain(`<!-- MITEM:${BLOCK_ID}:item-1 -->`)
    expect(html).toContain(`<!-- /MITEM:${BLOCK_ID}:item-1 -->`)
  })
})

describe('renderCol3Snippet · link por celda (LINKCELDA, incl. el typo real del maestro)', () => {
  it('all disabled by default: no <a> anywhere, no leftover LINKCELDA token', () => {
    const html = render(defaultCol3Fields)
    expect(html).not.toContain('<a href')
    expect(html).not.toContain('LINKCELDA')
  })

  it('enabling ONLY cell1\'s link does not leak into cell2 — even though the master reuses the same LINKCELDA1 token for both', () => {
    const fields = withCell(defaultCol3Fields, 0, { linkEnabled: true, link: 'https://x.test/c1' })
    const html = render(fields)
    expect(html.match(/href="https:\/\/x\.test\/c1"/g)?.length).toBe(1)
  })

  it('enabling ONLY cell2\'s link resolves correctly even though its master token is the (typo\'d) LINKCELDA1', () => {
    const fields = withCell(defaultCol3Fields, 1, { linkEnabled: true, link: 'https://x.test/c2' })
    const html = render(fields)
    expect(html).toContain('href="https://x.test/c2"')
    expect(html).not.toContain('href="https://x.test/c1"')
  })

  it('enabling cell3\'s link resolves its own distinct LINKCELDA3 token', () => {
    const fields = withCell(defaultCol3Fields, 2, { linkEnabled: true, link: 'https://x.test/c3' })
    const html = render(fields)
    expect(html).toContain('href="https://x.test/c3"')
  })

  it('all 3 enabled at once, each keeps its own link — no cross-cell bleed', () => {
    let fields = withCell(defaultCol3Fields, 0, { linkEnabled: true, link: 'https://x.test/c1' })
    fields = withCell(fields, 1, { linkEnabled: true, link: 'https://x.test/c2' })
    fields = withCell(fields, 2, { linkEnabled: true, link: 'https://x.test/c3' })
    const html = render(fields)
    expect(html.match(/<a href/g)?.length).toBe(3)
    expect(html).toContain('href="https://x.test/c1"')
    expect(html).toContain('href="https://x.test/c2"')
    expect(html).toContain('href="https://x.test/c3"')
  })
})

describe('renderCol3Snippet · alineado — ÚNICA variable de módulo (no por celda)', () => {
  it('left (default): text-align left, no unresolved braces', () => {
    const html = render(defaultCol3Fields)
    expect(html).not.toMatch(UNRESOLVED_MODULE_ALIGN_RE)
    expect(html.match(/text-align: left/g)?.length).toBe(3)
  })

  it('center: applies to all 3 cells at once (there is no per-cell align field)', () => {
    const html = render({ ...defaultCol3Fields, align: 'center' })
    expect(html.match(/text-align: center/g)?.length).toBe(3)
    // El ícono de cada celda usa alineado_molecular_mail_body para su margin
    // (1 por celda) — la imagen "full" de abajo también trae "margin: 0 auto"
    // pero es un literal ESTÁTICO del maestro (su propio centrado de imagen),
    // no depende de align, así que no se cuenta acá.
    expect(html.match(/role="molecula-iconoM"[^>]*margin: 0 auto/g)?.length).toBe(3)
    expect(html).not.toMatch(UNRESOLVED_MODULE_ALIGN_RE)
  })
})

describe('renderCol3Snippet · fondo POR CELDA (no una sola variable de módulo)', () => {
  it('all off by default: 3× the "off" theme values, none "on"', () => {
    const html = render(defaultCol3Fields, { global: { ...defaultEmailDocument.global, tema: 'beige100' } })
    expect(html.match(/background:rgba\(0,0,0,0\.0\)/g)?.length).toBe(3)
    expect(html).not.toContain('rgba(242,211,174,0.5)')
  })

  it('enabling ONLY cell1\'s background leaves cell2/cell3 off — real per-cell isolation, not a module-wide toggle', () => {
    const fields = withCell(defaultCol3Fields, 0, { backgroundEnabled: true })
    const html = render(fields, { global: { ...defaultEmailDocument.global, tema: 'beige100' } })
    expect(html.match(/background:rgba\(242,211,174,0\.5\)/g)?.length).toBe(1)
    expect(html.match(/background:rgba\(0,0,0,0\.0\)/g)?.length).toBe(2)
  })

  it('the small "-peq" padding of the free area is CONSTANT (7px) regardless of backgroundEnabled — unlike the regular padding of other modules', () => {
    const off = render(defaultCol3Fields, { global: { ...defaultEmailDocument.global, tema: 'beige100' } })
    const on = render(withCell(defaultCol3Fields, 0, { backgroundEnabled: true }), { global: { ...defaultEmailDocument.global, tema: 'beige100' } })
    expect(off.match(/padding: 7px/g)?.length).toBe(3)
    expect(on.match(/padding: 7px/g)?.length).toBe(3)
  })
})

describe('renderCol3Snippet · sin fugas de Liquid, en los 12 temas', () => {
  it.each(THEME_SLUGS)('%s: no {%% %%} tags, no unresolved _mail_general', (tema) => {
    const html = render(defaultCol3Fields, { global: { ...defaultEmailDocument.global, tema } })
    expect(html).not.toMatch(NO_LIQUID_TAG_RE)
    expect(html).not.toMatch(/\{\{\s*[a-z_0-9]+_mail_general\s*\}\}/)
    expect(html).not.toMatch(UNRESOLVED_MODULE_ALIGN_RE)
  })
})
