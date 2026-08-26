import { describe, expect, it } from 'vitest'
import { defaultEmailDocument } from '../../../registry'
import { THEME_SLUGS } from '../../../themes/themes'
import type { EmailDocument } from '../../../model'
import { renderTitleSnippet } from '../render'
import { defaultTitleFields, titleFieldsSchema, type TitleFields } from '../schema'
import type { ModuleItem } from '../../../moduleItems/schemas'

const BLOCK_ID = 'title-block-1'

const render = (fields: TitleFields, over: Partial<EmailDocument> = {}): string =>
  renderTitleSnippet(fields, { ...defaultEmailDocument, ...over }, { blockId: BLOCK_ID })

const NO_LIQUID_TAG_RE = /\{%/
const UNRESOLVED_MODULE_ALIGN_RE = /\{\{\s*(body_alineado_molecular|alineado_molecular_mail_body)\s*\}\}/

const item = (type: ModuleItem['type'], id: string, fields: unknown, areaKey = 'main'): ModuleItem =>
  ({ id, areaKey, type, fields }) as ModuleItem

describe('renderTitleSnippet · default items (título + línea + subtítulo)', () => {
  it('renders all 3 by default — title-only is NOT special-cased, it just happens to have all 3', () => {
    const html = render(defaultTitleFields)
    expect(html).toContain('Titulo')
    expect(html).toContain('bloque de texto bloque de texto bloque de texto')
    expect(html).toContain('role="molecula-separador"')
  })

  it('"solo título" is a real case — removing the other 2 items just renders the h2 alone', () => {
    const fields = titleFieldsSchema.parse({
      items: [item('TITULO_TEXTO', 'a', { text: 'Solo yo' })],
    })
    const html = render(fields)
    expect(html).toContain('Solo yo')
    expect(html).not.toContain('role="molecula-separador"')
    expect(html).not.toContain('bloque de texto')
  })

  it('an empty item list renders the shell with nothing inside', () => {
    const html = render(titleFieldsSchema.parse({ items: [] }))
    expect(html).not.toContain('<h2')
    expect(html).not.toContain('<h3')
  })

  it('items render in array order, and reordering the array reorders the output', () => {
    const fields = titleFieldsSchema.parse({
      items: [item('SUBTITULO_TEXTO', 'sub', { text: 'Sub' }), item('TITULO_TEXTO', 'tit', { text: 'Tit' })],
    })
    const html = render(fields)
    expect(html.indexOf('>Sub<')).toBeLessThan(html.indexOf('>Tit<'))
  })

  it('any registered body molecule can go in the free area, not just título/subtítulo (ej. FRANJA_LOGOS)', () => {
    const fields = titleFieldsSchema.parse({
      items: [item('FRANJA_LOGOS', 'logos', { logos: [{ imageUrl: 'https://x.test/a.png', link: '' }], size: 'L' })],
    })
    const html = render(fields)
    expect(html).toContain('src="https://x.test/a.png"')
  })
})

describe('renderTitleSnippet · marcadores MITEM', () => {
  it('wraps each item with its own MITEM markers, blockId-first', () => {
    const html = render(titleFieldsSchema.parse({ items: [item('TITULO_TEXTO', 'item-1', { text: 'x' })] }))
    expect(html).toContain(`<!-- MITEM:${BLOCK_ID}:item-1 -->`)
    expect(html).toContain(`<!-- /MITEM:${BLOCK_ID}:item-1 -->`)
  })
})

describe('renderTitleSnippet · link general (LINKMODULO)', () => {
  it('linkEnabled=false (default): unwraps the <a>, no href anywhere', () => {
    const html = render(defaultTitleFields)
    expect(html).not.toContain('<a href')
    expect(html).not.toContain('LINKMODULO')
  })

  it('linkEnabled=true: keeps the <a>, substitutes the real link', () => {
    const html = render({ ...defaultTitleFields, linkEnabled: true, link: 'https://x.test/promo' })
    expect(html).toContain('href="https://x.test/promo"')
  })
})

describe('renderTitleSnippet · alineado general', () => {
  it('left (default): no unresolved module-align braces left', () => {
    const html = render(defaultTitleFields)
    expect(html).not.toMatch(UNRESOLVED_MODULE_ALIGN_RE)
    expect(html).toContain('text-align: left')
  })

  it('center: text-align center, margin 0 auto', () => {
    const html = render({ ...defaultTitleFields, align: 'center' })
    expect(html).toContain('text-align: center')
    expect(html).toContain('margin: 0 auto')
    expect(html).not.toMatch(UNRESOLVED_MODULE_ALIGN_RE)
  })
})

describe('renderTitleSnippet · fondo general', () => {
  it('backgroundEnabled=false (default): "off" theme values (transparent, 0px)', () => {
    const html = render(defaultTitleFields)
    expect(html).toContain('background:rgba(0,0,0,0.0)')
    expect(html).toContain('border-radius: 0px')
  })

  it('backgroundEnabled=true: "on" theme values (the real color/radius/padding)', () => {
    const html = render({ ...defaultTitleFields, backgroundEnabled: true }, { global: { ...defaultEmailDocument.global, tema: 'beige100' } })
    expect(html).toContain('background:rgba(242,211,174,0.5)')
    expect(html).toContain('border-radius:  16px')
  })
})

describe('renderTitleSnippet · sin fugas de Liquid, en los 12 temas', () => {
  it.each(THEME_SLUGS)('%s: no {%% %%} tags, no unresolved _mail_general', (tema) => {
    const html = render(defaultTitleFields, { global: { ...defaultEmailDocument.global, tema } })
    expect(html).not.toMatch(NO_LIQUID_TAG_RE)
    expect(html).not.toMatch(/\{\{\s*[a-z_0-9]+_mail_general\s*\}\}/)
    expect(html).not.toMatch(UNRESOLVED_MODULE_ALIGN_RE)
  })
})
