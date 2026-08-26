import { describe, expect, it } from 'vitest'
import { defaultEmailDocument } from '../../../registry'
import { THEME_SLUGS } from '../../../themes/themes'
import type { EmailDocument } from '../../../model'
import { renderBeneficiosSnippet } from '../render'
import { beneficiosFieldsSchema, defaultBeneficiosFields, type BeneficiosFields } from '../schema'
import type { ModuleItem } from '../../../moduleItems/schemas'

const BLOCK_ID = 'beneficios-block-1'

const render = (fields: BeneficiosFields, over: Partial<EmailDocument> = {}): string =>
  renderBeneficiosSnippet(fields, { ...defaultEmailDocument, ...over }, { blockId: BLOCK_ID })

const NO_LIQUID_TAG_RE = /\{%/
const UNRESOLVED_MODULE_ALIGN_RE = /\{\{\s*(body_alineado_molecular|alineado_molecular_mail_body)\s*\}\}/

const item = (type: ModuleItem['type'], id: string, fields: unknown, areaKey = 'main'): ModuleItem =>
  ({ id, areaKey, type, fields }) as ModuleItem

describe('renderBeneficiosSnippet · celda 1 (imagen fija)', () => {
  it('renders the default image URL, border-radius ON (matches the master)', () => {
    const html = render(defaultBeneficiosFields)
    expect(html).toContain('src="https://lh3.googleusercontent.com/d/1K55fPu7buJT65XOj9VqaplZD2J4WTaTb"')
    expect(html).toContain('border-radius: 8px')
  })

  it('borderRadiusEnabled=false removes the radius entirely', () => {
    const html = render({ ...defaultBeneficiosFields, image: { ...defaultBeneficiosFields.image, borderRadiusEnabled: false } })
    expect(html).not.toContain('border-radius: 8px')
  })

  it('substitutes a custom URL', () => {
    const html = render({ ...defaultBeneficiosFields, image: { ...defaultBeneficiosFields.image, imageUrl: 'https://x.test/mine.png' } })
    expect(html).toContain('src="https://x.test/mine.png"')
  })

  it('blank URL removes the whole <img> (global convention) but the cell/module stays — "non-removable" means the SLOT, not the URL behavior', () => {
    const html = render({ ...defaultBeneficiosFields, image: { ...defaultBeneficiosFields.image, imageUrl: '' } })
    expect(html).not.toContain('role="imagen-auto"')
    expect(html).toContain('<table') // el módulo entero sigue presente
  })
})

describe('renderBeneficiosSnippet · celda 2 (área libre, default icono + 2 textos)', () => {
  it('renders all 5 default items (icono + separador + título + separador + texto)', () => {
    const html = render(defaultBeneficiosFields)
    expect(html).toContain('role="molecula-iconoM"')
    expect(html).toContain('Descuentos de hasta xxx')
    expect(html).toContain('En todos tus pedidos en la app, pidiendo desde $XXXXXX')
    expect(html.match(/separador-S/g)?.length).toBe(2)
  })

  it('the master default h5 empty placeholder is fully discarded, not reproduced', () => {
    const html = render(defaultBeneficiosFields)
    expect(html).not.toContain('<h5')
  })

  it('an empty item list renders celda2 with nothing inside', () => {
    const html = render(beneficiosFieldsSchema.parse({ items: [] }))
    expect(html).not.toContain('<h3')
    expect(html).not.toContain('<h4')
    expect(html).not.toContain('role="molecula-icono')
  })

  it('any registered body molecule can go in the free area, not just the 3 defaults (ej. TEXTO_PASTILLA)', () => {
    const fields = beneficiosFieldsSchema.parse({
      items: [item('TEXTO_PASTILLA', 'pastilla', { text: 'Supermercados', pillText: 'Martes', pillPosition: 'derecha' })],
    })
    const html = render(fields)
    expect(html).toContain('Supermercados')
    expect(html).toContain('Martes')
  })
})

describe('renderBeneficiosSnippet · marcadores MITEM', () => {
  it('wraps each item with its own MITEM markers, blockId-first', () => {
    const html = render(beneficiosFieldsSchema.parse({ items: [item('BENEFICIOS_TITULO', 'item-1', { text: 'x' })] }))
    expect(html).toContain(`<!-- MITEM:${BLOCK_ID}:item-1 -->`)
    expect(html).toContain(`<!-- /MITEM:${BLOCK_ID}:item-1 -->`)
  })
})

describe('renderBeneficiosSnippet · link general (LINKMODULO)', () => {
  it('linkEnabled=false (default): unwraps the <a>, no href anywhere', () => {
    const html = render(defaultBeneficiosFields)
    expect(html).not.toContain('<a href')
    expect(html).not.toContain('LINKMODULO')
  })

  it('linkEnabled=true: keeps the <a>, substitutes the real link', () => {
    const html = render({ ...defaultBeneficiosFields, linkEnabled: true, link: 'https://x.test/promo' })
    expect(html).toContain('href="https://x.test/promo"')
  })
})

describe('renderBeneficiosSnippet · alineado general', () => {
  it('left (default): no unresolved module-align braces left', () => {
    const html = render(defaultBeneficiosFields)
    expect(html).not.toMatch(UNRESOLVED_MODULE_ALIGN_RE)
    expect(html).toContain('text-align: left')
  })

  it('center: text-align center, margin 0 auto', () => {
    const html = render({ ...defaultBeneficiosFields, align: 'center' })
    expect(html).toContain('text-align: center')
    expect(html).toContain('margin: 0 auto')
    expect(html).not.toMatch(UNRESOLVED_MODULE_ALIGN_RE)
  })
})

describe('renderBeneficiosSnippet · fondo general (incl. img_fondo_especial)', () => {
  it('backgroundEnabled=false (default): "off" theme values (transparent, 0px, generic placeholder background image)', () => {
    const html = render(defaultBeneficiosFields)
    expect(html).toContain('background: rgba(0,0,0,0.0)')
    expect(html).toContain('border-radius: 0px')
    expect(html).toContain('border: 0px solid rgba(255, 255, 255, 0.0)')
    expect(html).toContain('url(https://lh3.googleusercontent.com/d/1_q4ca1b7DkKOGnFqwVfKMTFTmhMp0E2A)')
  })

  it('backgroundEnabled=true: "on" theme values, incl. the real per-theme special background image', () => {
    const html = render({ ...defaultBeneficiosFields, backgroundEnabled: true }, { global: { ...defaultEmailDocument.global, tema: 'beige100' } })
    expect(html).toContain('background: rgba(242,211,174,0.5)')
    expect(html).toContain('border-radius:  16px')
    expect(html).toContain('url(https://lh3.googleusercontent.com/d/1yFkdcBRKN2L4yUzqoxkcnR7uQvSJAT_u)')
  })
})

describe('renderBeneficiosSnippet · sin fugas de Liquid, en los 12 temas', () => {
  it.each(THEME_SLUGS)('%s: no {%% %%} tags, no unresolved _mail_general', (tema) => {
    const html = render(defaultBeneficiosFields, { global: { ...defaultEmailDocument.global, tema } })
    expect(html).not.toMatch(NO_LIQUID_TAG_RE)
    expect(html).not.toMatch(/\{\{\s*[a-z_0-9]+_mail_general\s*\}\}/)
    expect(html).not.toMatch(UNRESOLVED_MODULE_ALIGN_RE)
  })
})
