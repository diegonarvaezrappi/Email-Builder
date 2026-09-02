import { describe, expect, it } from 'vitest'
import { defaultEmailDocument } from '../../../registry'
import { THEME_SLUGS } from '../../../themes/themes'
import type { EmailDocument } from '../../../model'
import { renderCuponesSnippet } from '../render'
import { createDefaultTituloCellFields, defaultCuponesFields, type CuponesFields } from '../schema'

const BLOCK_ID = 'cupones-block-1'

const render = (fields: CuponesFields, over: Partial<EmailDocument> = {}): string =>
  renderCuponesSnippet(fields, { ...defaultEmailDocument, ...over }, { blockId: BLOCK_ID })

const NO_LIQUID_TAG_RE = /\{%/
const UNRESOLVED_MODULE_ALIGN_RE = /\{\{\s*(body_alineado_molecular|alineado_molecular_mail_body)\s*\}\}/

const withCell = (fields: CuponesFields, index: number, cell: CuponesFields['cells'][number]): CuponesFields => {
  const cells = [...fields.cells] as CuponesFields['cells']
  cells[index] = cell
  return { ...fields, cells }
}

describe('renderCuponesSnippet · celda "cupón" · imagen', () => {
  it('renders the default image URL, border-radius OFF (matches the master)', () => {
    const html = render(defaultCuponesFields)
    expect(html.match(/src="https:\/\/lh3\.googleusercontent\.com\/d\/17zBTLASXQzFtt9NtEP3h0qudKBhcZRMA"/g)?.length).toBe(2)
    expect(html).not.toContain('border-radius: 8px')
  })

  it('borderRadiusEnabled on ONE cell only adds the radius to that cell\'s <img>', () => {
    const cell0 = defaultCuponesFields.cells[0]
    if (cell0.type !== 'cupon') throw new Error('expected cupon cell')
    const fields = withCell(defaultCuponesFields, 0, { ...cell0, borderRadiusEnabled: true })
    const html = render(fields)
    expect(html.match(/border-radius: 8px/g)?.length).toBe(1)
  })

  it('blank URL removes only THAT cell\'s <img> — the other cell survives', () => {
    const cell1 = defaultCuponesFields.cells[1]
    if (cell1.type !== 'cupon') throw new Error('expected cupon cell')
    const fields = withCell(defaultCuponesFields, 1, { ...cell1, imageUrl: '' })
    const html = render(fields)
    expect(html.match(/src="https:\/\/lh3\.googleusercontent\.com\/d\/17zBTLASXQzFtt9NtEP3h0qudKBhcZRMA"/g)?.length).toBe(1)
  })
})

describe('renderCuponesSnippet · área libre de la celda "cupón" (default: texto+pastilla, monto, separador, bullet)', () => {
  it('renders each cell\'s own default items', () => {
    const html = render(defaultCuponesFields)
    expect(html.match(/Solo en/g)?.length).toBe(2)
    expect(html.match(/Restaurantes/g)?.length).toBe(2)
    expect(html.match(/Aca un markdown/g)?.length).toBe(2)
    expect(html.match(/Cupón xxxxxxxxxxx/g)?.length).toBe(2)
  })

  it('wraps each item with its own MITEM markers, blockId-first', () => {
    const html = render(defaultCuponesFields)
    const firstItemId = defaultCuponesFields.items[0].id
    expect(html).toContain(`<!-- MITEM:${BLOCK_ID}:${firstItemId} -->`)
    expect(html).toContain(`<!-- /MITEM:${BLOCK_ID}:${firstItemId} -->`)
  })

  it('an empty item list renders both cells\' free area with nothing inside', () => {
    const html = render({ ...defaultCuponesFields, items: [] })
    expect(html).not.toContain('Solo en')
    expect(html).not.toContain('Aca un markdown')
    expect(html).not.toContain('Cupón xxxxxxxxxxx')
  })
})

describe('renderCuponesSnippet · link por celda (LINKCUPON)', () => {
  it('all disabled by default: no <a> anywhere, no leftover LINKCUPON token', () => {
    const html = render(defaultCuponesFields)
    expect(html).not.toContain('<a href')
    expect(html).not.toContain('LINKCUPON')
  })

  it('enabling ONLY cell1\'s link does not leak into cell2', () => {
    const cell0 = defaultCuponesFields.cells[0]
    if (cell0.type !== 'cupon') throw new Error('expected cupon cell')
    const fields = withCell(defaultCuponesFields, 0, { ...cell0, linkEnabled: true, link: 'https://x.test/c1' })
    const html = render(fields)
    expect(html.match(/<a href/g)?.length).toBe(1)
    expect(html).toContain('href="https://x.test/c1"')
  })
})

describe('renderCuponesSnippet · celda "título" (swap-in)', () => {
  it('a titulo cell renders the tag + heading text, no free area, its own LINKTITULO', () => {
    const tituloCell = { ...createDefaultTituloCellFields(), titleText: 'Mi título de cupón' }
    const fields = withCell(defaultCuponesFields, 0, tituloCell)
    const html = render(fields)
    expect(html).toContain('Mi título de cupón')
    expect(html).not.toContain('LINKTITULO')
    expect(html).not.toContain('LINKCUPON')
    // La celda "cupón" restante (cell2) sigue con su propio contenido.
    expect(html.match(/Solo en/g)?.length).toBe(1)
  })

  it('replaces the WHOLE heading, not just the text run after the master\'s fixed "Aca un<br>" lead-in (real bug found via CDP visual check)', () => {
    let fields = withCell(defaultCuponesFields, 0, { ...createDefaultTituloCellFields(), titleText: 'Mi título de cupón' })
    fields = withCell(fields, 1, { ...createDefaultTituloCellFields(), titleText: 'Otro título' })
    const html = render(fields)
    expect(html).not.toContain('Aca un')
  })

  it('blank tag icon removes the WHOLE tag <div>, not just the <img>', () => {
    const withIcon = withCell(defaultCuponesFields, 0, createDefaultTituloCellFields())
    const withoutIcon = withCell(defaultCuponesFields, 0, { ...createDefaultTituloCellFields(), tagIconUrl: '' })
    expect(render(withIcon)).toContain('role="molecula-tag"')
    expect(render(withoutIcon)).not.toContain('role="molecula-tag"')
  })

  it('enabling the titulo cell\'s link resolves LINKTITULO', () => {
    const tituloCell = { ...createDefaultTituloCellFields(), linkEnabled: true, link: 'https://x.test/titulo' }
    const html = render(withCell(defaultCuponesFields, 0, tituloCell))
    expect(html).toContain('href="https://x.test/titulo"')
  })

  it('both cells can be "titulo" at once', () => {
    let fields = withCell(defaultCuponesFields, 0, createDefaultTituloCellFields())
    fields = withCell(fields, 1, createDefaultTituloCellFields())
    const html = render(fields)
    expect(html.match(/role="molecula-tag"/g)?.length).toBe(2)
    expect(html).not.toContain('Solo en')
  })
})

describe('renderCuponesSnippet · legales (fila compartida, toggle per-celda)', () => {
  it('off by default: no legal text, row removed', () => {
    const html = render(defaultCuponesFields)
    expect(html).not.toContain('Aplican términos y condiciones')
    expect(html).not.toContain('class="legal"')
  })

  it('enabling ONLY cell1\'s legal shows the row with cell1 filled, cell2 blank', () => {
    const cell0 = defaultCuponesFields.cells[0]
    if (cell0.type !== 'cupon') throw new Error('expected cupon cell')
    const fields = withCell(defaultCuponesFields, 0, { ...cell0, legalEnabled: true, legalText: 'Solo cell1' })
    const html = render(fields)
    expect(html).toContain('class="legal"')
    expect(html.match(/Solo cell1/g)?.length).toBe(1)
  })
})

describe('renderCuponesSnippet · fondo/alineado FIJOS (no togglables)', () => {
  it('background is always ON (the "Sinfondo" off-value never appears)', () => {
    const html = render(defaultCuponesFields, { global: { ...defaultEmailDocument.global, tema: 'beige100' } })
    expect(html.match(/background:\s*rgba\(242,211,174,0\.5\)/g)?.length).toBe(2)
    expect(html).not.toMatch(/background:\s*rgba\(0,0,0,0\.0\)/)
  })

  it('align resolves to left, unconditionally — no field exists to change it', () => {
    const html = render(defaultCuponesFields)
    expect(html).not.toMatch(UNRESOLVED_MODULE_ALIGN_RE)
  })
})

describe('renderCuponesSnippet · sin fugas de Liquid, en los 12 temas', () => {
  it.each(THEME_SLUGS)('%s: no {%% %%} tags, no unresolved _mail_general', (tema) => {
    const html = render(defaultCuponesFields, { global: { ...defaultEmailDocument.global, tema } })
    expect(html).not.toMatch(NO_LIQUID_TAG_RE)
    expect(html).not.toMatch(/\{\{\s*[a-z_0-9]+_mail_general\s*\}\}/)
    expect(html).not.toMatch(UNRESOLVED_MODULE_ALIGN_RE)
  })

  it.each(THEME_SLUGS)('%s: mixed cupon/titulo cells, no leaks either', (tema) => {
    const fields = withCell(defaultCuponesFields, 1, createDefaultTituloCellFields())
    const html = render(fields, { global: { ...defaultEmailDocument.global, tema } })
    expect(html).not.toMatch(NO_LIQUID_TAG_RE)
    expect(html).not.toMatch(/\{\{\s*[a-z_0-9]+_mail_general\s*\}\}/)
  })
})
