import { describe, expect, it } from 'vitest'
import { defaultEmailDocument } from '../../../registry'
import { THEME_SLUGS } from '../../../themes/themes'
import type { EmailDocument } from '../../../model'
import { renderCol1Snippet } from '../render'
import { col1FieldsSchema, defaultCol1Fields, type Col1Fields } from '../schema'
import type { ModuleItem } from '../../../moduleItems/schemas'

const BLOCK_ID = 'col1-block-1'

const render = (fields: Col1Fields, over: Partial<EmailDocument> = {}): string =>
  renderCol1Snippet(fields, { ...defaultEmailDocument, ...over }, { blockId: BLOCK_ID })

const NO_LIQUID_TAG_RE = /\{%/
const UNRESOLVED_MODULE_ALIGN_RE = /\{\{\s*(body_alineado_molecular|alineado_molecular_mail_body)\s*\}\}/

const item = (type: ModuleItem['type'], id: string, fields: unknown, areaKey: string): ModuleItem => ({ id, areaKey, type, fields }) as ModuleItem

describe('renderCol1Snippet · imagen', () => {
  it('renders the default image URL, border-radius OFF (matches the master)', () => {
    const html = render(defaultCol1Fields)
    expect(html).toContain('src="https://lh3.googleusercontent.com/d/1OEXxNDtUklgU4W8sta2zOzdZ4rZYq7PO"')
    expect(html).not.toContain('border-radius: 8px')
  })

  it('borderRadiusEnabled=true adds the radius', () => {
    const html = render({ ...defaultCol1Fields, image: { ...defaultCol1Fields.image, borderRadiusEnabled: true } })
    expect(html).toContain('border-radius: 8px')
  })

  it('substitutes a custom URL', () => {
    const html = render({ ...defaultCol1Fields, image: { ...defaultCol1Fields.image, imageUrl: 'https://x.test/mine.png' } })
    expect(html).toContain('src="https://x.test/mine.png"')
  })

  it('blank URL removes the whole <img> (the image is genuinely optional here, unlike Beneficios) but the module stays', () => {
    const html = render({ ...defaultCol1Fields, image: { ...defaultCol1Fields.image, imageUrl: '' } })
    expect(html).not.toContain('role="imagen-auto"')
    expect(html).toContain('role="module"')
  })
})

describe('renderCol1Snippet · área "arriba" (la que el maestro ya trae)', () => {
  it('empty by default: no molecule markup at all', () => {
    const html = render(defaultCol1Fields)
    expect(html).not.toContain('<h2')
    expect(html).not.toContain('<h3')
  })

  it('renders an item placed in "above"', () => {
    const fields = col1FieldsSchema.parse({ items: [item('TITULO_TEXTO', 'a1', { text: 'Arriba de todo' }, 'above')] })
    const html = render(fields)
    expect(html).toContain('Arriba de todo')
  })

  it('an item above appears BEFORE the image in document order', () => {
    const fields = col1FieldsSchema.parse({ items: [item('TITULO_TEXTO', 'a1', { text: 'Arriba de todo' }, 'above')] })
    const html = render(fields)
    expect(html.indexOf('Arriba de todo')).toBeLessThan(html.indexOf('role="imagen-auto"'))
  })
})

describe('renderCol1Snippet · área "abajo" (construida solo si hace falta)', () => {
  it('no second divcomponentes at all when there is nothing below (matches the master literal)', () => {
    const html = render(defaultCol1Fields)
    expect(html.match(/role="divcomponentes"/g)?.length ?? 0).toBe(1)
  })

  it('adds a second divcomponentes only when there IS content below', () => {
    const fields = col1FieldsSchema.parse({ items: [item('TITULO_TEXTO', 'b1', { text: 'Abajo de todo' }, 'below')] })
    const html = render(fields)
    expect(html.match(/role="divcomponentes"/g)?.length).toBe(2)
    expect(html).toContain('Abajo de todo')
  })

  it('an item below appears AFTER the image in document order', () => {
    const fields = col1FieldsSchema.parse({ items: [item('TITULO_TEXTO', 'b1', { text: 'Abajo de todo' }, 'below')] })
    const html = render(fields)
    expect(html.indexOf('role="imagen-auto"')).toBeLessThan(html.indexOf('Abajo de todo'))
  })

  it('still renders "below" content correctly even when the image is removed entirely — the anchor does not depend on the <img> surviving', () => {
    const fields = col1FieldsSchema.parse({
      items: [item('TITULO_TEXTO', 'b1', { text: 'Abajo sin imagen' }, 'below')],
    })
    const html = render({ ...fields, image: { ...fields.image, imageUrl: '' } })
    expect(html).not.toContain('role="imagen-auto"')
    expect(html).toContain('Abajo sin imagen')
  })

  it('both areas populated at once render in the right order: above, image, below', () => {
    const fields = col1FieldsSchema.parse({
      items: [
        item('TITULO_TEXTO', 'a1', { text: 'ARRIBA' }, 'above'),
        item('TITULO_TEXTO', 'b1', { text: 'ABAJO' }, 'below'),
      ],
    })
    const html = render(fields)
    expect(html.indexOf('ARRIBA')).toBeLessThan(html.indexOf('role="imagen-auto"'))
    expect(html.indexOf('role="imagen-auto"')).toBeLessThan(html.indexOf('ABAJO'))
  })
})

describe('renderCol1Snippet · marcadores MITEM', () => {
  it('wraps each item with its own MITEM markers, blockId-first, regardless of area', () => {
    const html = render(col1FieldsSchema.parse({ items: [item('TITULO_TEXTO', 'item-1', { text: 'x' }, 'below')] }))
    expect(html).toContain(`<!-- MITEM:${BLOCK_ID}:item-1 -->`)
    expect(html).toContain(`<!-- /MITEM:${BLOCK_ID}:item-1 -->`)
  })
})

describe('renderCol1Snippet · link general (LINKMODULO)', () => {
  it('linkEnabled=false (default): unwraps the <a>, no href anywhere', () => {
    const html = render(defaultCol1Fields)
    expect(html).not.toContain('<a href')
    expect(html).not.toContain('LINKMODULO')
  })

  it('linkEnabled=true: keeps the <a>, substitutes the real link', () => {
    const html = render({ ...defaultCol1Fields, linkEnabled: true, link: 'https://x.test/promo' })
    expect(html).toContain('href="https://x.test/promo"')
  })
})

describe('renderCol1Snippet · alineado — deliberadamente SIN efecto', () => {
  it('the master has no align tokens for this module: changing align produces byte-identical output', () => {
    const left = render({ ...defaultCol1Fields, align: 'left' })
    const center = render({ ...defaultCol1Fields, align: 'center' })
    expect(left).toBe(center)
  })

  it('never leaves an unresolved module-align brace either way (nothing to resolve in the first place)', () => {
    expect(render(defaultCol1Fields)).not.toMatch(UNRESOLVED_MODULE_ALIGN_RE)
  })
})

describe('renderCol1Snippet · fondo general', () => {
  it('backgroundEnabled=false (default): "off" theme values', () => {
    const html = render(defaultCol1Fields, { global: { ...defaultEmailDocument.global, tema: 'beige100' } })
    // Sin espacio tras "background:" — así viene el literal en ESTE maestro
    // (modulo-1columna.html), a diferencia de modulo-beneficios.html.
    expect(html).toContain('background:rgba(0,0,0,0.0)')
    expect(html).toContain('border-radius: 0px')
    expect(html).toContain('padding: 0px')
  })

  it('backgroundEnabled=true: "on" theme values, incl. real padding on the divcomponentes cell', () => {
    const html = render({ ...defaultCol1Fields, backgroundEnabled: true }, { global: { ...defaultEmailDocument.global, tema: 'beige100' } })
    expect(html).toContain('background:rgba(242,211,174,0.5)')
    expect(html).toContain('border-radius:  16px')
    expect(html).toContain('padding: 10px')
  })
})

describe('renderCol1Snippet · sin fugas de Liquid, en los 12 temas', () => {
  it.each(THEME_SLUGS)('%s: no {%% %%} tags, no unresolved _mail_general', (tema) => {
    const html = render(defaultCol1Fields, { global: { ...defaultEmailDocument.global, tema } })
    expect(html).not.toMatch(NO_LIQUID_TAG_RE)
    expect(html).not.toMatch(/\{\{\s*[a-z_0-9]+_mail_general\s*\}\}/)
    expect(html).not.toMatch(UNRESOLVED_MODULE_ALIGN_RE)
  })
})
