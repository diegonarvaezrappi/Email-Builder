import { describe, expect, it } from 'vitest'
import { defaultEmailDocument } from '../../../registry'
import { THEME_SLUGS } from '../../../themes/themes'
import type { EmailDocument } from '../../../model'
import { renderBulletSnippet } from '../render'
import { bulletFieldsSchema, defaultBulletFields, type BulletFields } from '../schema'
import type { ModuleItem } from '../../../moduleItems/schemas'

const BLOCK_ID = 'bullet-block-1'

const render = (fields: BulletFields, over: Partial<EmailDocument> = {}): string =>
  renderBulletSnippet(fields, { ...defaultEmailDocument, ...over }, { blockId: BLOCK_ID })

const NO_LIQUID_TAG_RE = /\{%/
const UNRESOLVED_MODULE_ALIGN_RE = /\{\{\s*(body_alineado_molecular|alineado_molecular_mail_body)\s*\}\}/

const item = (type: ModuleItem['type'], id: string, fields: unknown, areaKey = 'main'): ModuleItem =>
  ({ id, areaKey, type, fields }) as ModuleItem

describe('renderBulletSnippet · item por defecto (un BULLET_ICONO)', () => {
  it('renders the default bullet (icon L + Subtitulo + texto de relleno)', () => {
    const html = render(defaultBulletFields)
    expect(html).toContain('role="molecula-iconoXL"') // sic — tamaño L mapea al archivo con role XL
    expect(html).toContain('Subtitulo')
    expect(html).toContain('bloque de texto bloque de texto bloque de texto')
  })

  it('an empty item list renders the shell with nothing inside — the master default icon+h3+h4 is fully discarded, not extracted like TITLE', () => {
    const html = render(bulletFieldsSchema.parse({ items: [] }))
    expect(html).not.toContain('<table')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('<h3')
    expect(html).not.toContain('<h4')
  })

  it('multiple BULLET_ICONO items stack inside the same shell — "agregar más moleculas"', () => {
    const fields = bulletFieldsSchema.parse({
      items: [
        item('BULLET_ICONO', 'a', { size: 'S', titulo: 'Uno', texto: 'x' }),
        item('BULLET_ICONO', 'b', { size: 'M', titulo: 'Dos', texto: 'y' }),
      ],
    })
    const html = render(fields)
    expect(html).toContain('Uno')
    expect(html).toContain('Dos')
    expect(html.indexOf('Uno')).toBeLessThan(html.indexOf('Dos'))
  })

  it('any registered body molecule can go in the free area, not just BULLET_ICONO (ej. BULLET_NUMERADO)', () => {
    const fields = bulletFieldsSchema.parse({
      items: [item('BULLET_NUMERADO', 'n', { numero: '2', titulo: 'Segundo', texto: 'x' })],
    })
    const html = render(fields)
    expect(html).toContain('>2<')
    expect(html).toContain('Segundo')
  })
})

describe('renderBulletSnippet · marcadores MITEM', () => {
  it('wraps each item with its own MITEM markers, blockId-first', () => {
    const html = render(bulletFieldsSchema.parse({ items: [item('BULLET_ICONO', 'item-1', { size: 'L', titulo: 'x', texto: 'y' })] }))
    expect(html).toContain(`<!-- MITEM:${BLOCK_ID}:item-1 -->`)
    expect(html).toContain(`<!-- /MITEM:${BLOCK_ID}:item-1 -->`)
  })
})

describe('renderBulletSnippet · link general (LINKMODULO)', () => {
  it('linkEnabled=false (default): unwraps the <a>, no href anywhere', () => {
    const html = render(defaultBulletFields)
    expect(html).not.toContain('<a href')
    expect(html).not.toContain('LINKMODULO')
  })

  it('linkEnabled=true: keeps the <a>, substitutes the real link', () => {
    const html = render({ ...defaultBulletFields, linkEnabled: true, link: 'https://x.test/promo' })
    expect(html).toContain('href="https://x.test/promo"')
  })
})

describe('renderBulletSnippet · alineado general', () => {
  it('left (default): no unresolved module-align braces left', () => {
    const html = render(defaultBulletFields)
    expect(html).not.toMatch(UNRESOLVED_MODULE_ALIGN_RE)
    expect(html).toContain('margin: 0px')
  })

  it('center: margin 0 auto', () => {
    const html = render({ ...defaultBulletFields, align: 'center' })
    expect(html).toContain('margin: 0 auto')
    expect(html).not.toMatch(UNRESOLVED_MODULE_ALIGN_RE)
  })
})

describe('renderBulletSnippet · fondo general', () => {
  it('backgroundEnabled=false (default): "off" theme values (transparent, 0px)', () => {
    const html = render(defaultBulletFields)
    expect(html).toContain('background:rgba(0,0,0,0.0)')
    expect(html).toContain('border-radius: 0px')
  })

  it('backgroundEnabled=true: "on" theme values (the real color/radius)', () => {
    const html = render({ ...defaultBulletFields, backgroundEnabled: true }, { global: { ...defaultEmailDocument.global, tema: 'beige100' } })
    expect(html).toContain('background:rgba(242,211,174,0.5)')
    expect(html).toContain('border-radius:  16px')
  })
})

describe('renderBulletSnippet · sin fugas de Liquid, en los 12 temas', () => {
  it.each(THEME_SLUGS)('%s: no {%% %%} tags, no unresolved _mail_general', (tema) => {
    const html = render(defaultBulletFields, { global: { ...defaultEmailDocument.global, tema } })
    expect(html).not.toMatch(NO_LIQUID_TAG_RE)
    expect(html).not.toMatch(/\{\{\s*[a-z_0-9]+_mail_general\s*\}\}/)
    expect(html).not.toMatch(UNRESOLVED_MODULE_ALIGN_RE)
  })
})
