import { describe, expect, it } from 'vitest'
import { defaultEmailDocument } from '../../../registry'
import { THEME_SLUGS } from '../../../themes/themes'
import type { EmailDocument } from '../../../model'
import { renderCol2Snippet } from '../render'
import { col2FieldsSchema, defaultCol2Fields, type Col2Fields } from '../schema'
import type { ModuleItem } from '../../../moduleItems/schemas'

const BLOCK_ID = 'col2-block-1'

const render = (fields: Col2Fields, over: Partial<EmailDocument> = {}): string =>
  renderCol2Snippet(fields, { ...defaultEmailDocument, ...over }, { blockId: BLOCK_ID })

const NO_LIQUID_TAG_RE = /\{%/
const UNRESOLVED_MODULE_ALIGN_RE = /\{\{\s*(body_alineado_molecular|alineado_molecular_mail_body)\s*\}\}/
const UNRESOLVED_GENERAL_RE = /\{\{\s*[a-z_0-9]+_mail_general\s*\}\}/

const item = (type: ModuleItem['type'], id: string, fields: unknown): ModuleItem => ({ id, areaKey: 'main', type, fields }) as ModuleItem

describe('renderCol2Snippet · dual-table (escritorio + mobile)', () => {
  it('renders both the mobile_hide (desktop) and desktop_hide (mobile) tables', () => {
    const html = render(defaultCol2Fields)
    expect(html).toContain('class="mobile_hide"')
    expect(html).toContain('desktop_hide')
  })

  it('the free area (default: título+separador+subtítulo) renders IN BOTH tables identically', () => {
    const html = render(defaultCol2Fields)
    expect(html.match(/Titulo/g)?.length).toBe(2)
    expect(html.match(/role="molecula-separador"/g)?.length).toBe(2)
    expect(html.match(/bloque de texto bloque de texto bloque de texto/g)?.length).toBe(2)
  })

  it('a custom item placed in the free area renders in BOTH tables, not just one', () => {
    const fields = col2FieldsSchema.parse({ items: [item('TITULO_TEXTO', 'x1', { text: 'Mi título' })] })
    const html = render(fields)
    expect(html.match(/Mi título/g)?.length).toBe(2)
  })

  it('an empty item list renders both free areas empty', () => {
    const html = render(col2FieldsSchema.parse({ items: [] }))
    expect(html).not.toContain('<h2')
    expect(html).not.toContain('<h3')
  })
})

describe('renderCol2Snippet · marcadores MITEM', () => {
  it('wraps each item with its own MITEM markers, blockId-first (present in BOTH table copies)', () => {
    const html = render(col2FieldsSchema.parse({ items: [item('TITULO_TEXTO', 'item-1', { text: 'x' })] }))
    expect(html.match(new RegExp(`<!-- MITEM:${BLOCK_ID}:item-1 -->`, 'g'))?.length).toBe(2)
  })
})

describe('renderCol2Snippet · imagen (2 markups alternativos, pick-one)', () => {
  it('default mode "modificable": keeps the modificable markup, discards "full" entirely, in BOTH tables', () => {
    const html = render(defaultCol2Fields)
    expect(html.match(/src="https:\/\/lh3\.googleusercontent\.com\/d\/14VKG5CPVNPIVbOQYkyHgtxfW1uLorjXP"/g)?.length).toBe(2)
    expect(html).not.toContain('1Xs3HucYUDlfipuPnegf5ZXO3w2Z5m28u')
  })

  it('mode "full": keeps the full markup, discards "modificable", in BOTH tables', () => {
    const html = render({ ...defaultCol2Fields, image: { ...defaultCol2Fields.image, mode: 'full', imageUrl: 'https://x.test/full.png' } })
    expect(html.match(/src="https:\/\/x\.test\/full\.png"/g)?.length).toBe(2)
    expect(html).not.toContain('14VKG5CPVNPIVbOQYkyHgtxfW1uLorjXP')
    expect(html).not.toContain('{{body_img_modulo_auto_ancho}}')
  })

  it('borderRadiusEnabled=true (default) adds 12px in BOTH tables', () => {
    const html = render(defaultCol2Fields)
    expect(html.match(/border-radius: 12px/g)?.length).toBe(2)
  })

  it('borderRadiusEnabled=false removes it entirely', () => {
    const html = render({ ...defaultCol2Fields, image: { ...defaultCol2Fields.image, borderRadiusEnabled: false } })
    expect(html).not.toContain('border-radius: 12px')
  })

  it('widthPercent substitutes {{body_img_modulo_auto_ancho}} in "modificable" mode, in BOTH tables', () => {
    const html = render({ ...defaultCol2Fields, image: { ...defaultCol2Fields.image, widthPercent: '75' } })
    expect(html.match(/width: 75%/g)?.length).toBe(2)
  })

  it('blank imageUrl removes the whole <img> (global convention) in BOTH tables, module stays', () => {
    const html = render({ ...defaultCol2Fields, image: { ...defaultCol2Fields.image, imageUrl: '' } })
    expect(html).not.toContain('<img')
    expect(html).toContain('class="mobile_hide"')
  })
})

describe('renderCol2Snippet · orden de celdas', () => {
  it('textoPrimero (default): the free-area h2 appears before the image <img> in document order, in BOTH tables', () => {
    const html = render(defaultCol2Fields)
    const firstH2 = html.indexOf('<h2')
    const firstImg = html.indexOf('<img')
    expect(firstH2).toBeGreaterThanOrEqual(0)
    expect(firstImg).toBeGreaterThan(firstH2)
  })

  it('imagenPrimero: the <img> now comes before the free-area h2 in BOTH tables', () => {
    const html = render({ ...defaultCol2Fields, cellOrder: 'imagenPrimero' })
    const firstImg = html.indexOf('<img')
    const firstH2 = html.indexOf('<h2')
    expect(firstImg).toBeGreaterThanOrEqual(0)
    expect(firstH2).toBeGreaterThan(firstImg)
  })

  it('imagenPrimero still renders exactly 2 free areas and 2 images (nothing lost in the swap)', () => {
    const html = render({ ...defaultCol2Fields, cellOrder: 'imagenPrimero' })
    expect(html.match(/<h2/g)?.length).toBe(2)
    expect(html.match(/<img/g)?.length).toBe(2)
  })
})

describe('renderCol2Snippet · link general (LINKMODULOCOULUMNAS)', () => {
  it('linkEnabled=false (default): unwraps the <a>, no href anywhere', () => {
    const html = render(defaultCol2Fields)
    expect(html).not.toContain('<a href')
    expect(html).not.toContain('LINKMODULOCOULUMNAS')
  })

  it('linkEnabled=true: keeps the <a>, substitutes the real link (wraps BOTH tables, only 1 <a>)', () => {
    const html = render({ ...defaultCol2Fields, linkEnabled: true, link: 'https://x.test/promo' })
    expect(html.match(/href="https:\/\/x\.test\/promo"/g)?.length).toBe(1)
  })
})

describe('renderCol2Snippet · alineado general (una sola variable, no por celda)', () => {
  it('left (default): no unresolved module-align braces left', () => {
    const html = render(defaultCol2Fields)
    expect(html).not.toMatch(UNRESOLVED_MODULE_ALIGN_RE)
    // El h2 del área libre trae `text-align: {{body_alineado_molecular}};`
    // (con espacio) — el <div> "float: left; text-align: left;" de la celda
    // de texto de escritorio es un literal ESTÁTICO no relacionado, no se
    // cuenta acá (mismo tipo de coincidencia que "margin: 0 auto" en COL3).
    expect(html.match(/role="molecula-texto"[^>]*text-align: left/g)?.length).toBe(2)
  })

  it('center: applies to BOTH tables at once', () => {
    const html = render({ ...defaultCol2Fields, align: 'center' })
    expect(html.match(/role="molecula-texto"[^>]*text-align: center/g)?.length).toBe(2)
    expect(html).not.toMatch(UNRESOLVED_MODULE_ALIGN_RE)
  })
})

describe('renderCol2Snippet · fondo general del contenedor', () => {
  it('backgroundEnabled=false (default): "off" theme values', () => {
    const html = render(defaultCol2Fields, { global: { ...defaultEmailDocument.global, tema: 'beige100' } })
    expect(html).toContain('background:rgba(0,0,0,0.0)')
    expect(html.match(/border-radius: 0px/g)?.length).toBeGreaterThan(0)
  })

  it('backgroundEnabled=true: "on" theme values', () => {
    const html = render({ ...defaultCol2Fields, backgroundEnabled: true }, { global: { ...defaultEmailDocument.global, tema: 'beige100' } })
    expect(html).toContain('background:rgba(242,211,174,0.5)')
    // "padding: 10px" también aparece como literal ESTÁTICO del <div> de la
    // variante "ancho modificable" de la imagen (sin relación al fondo
    // general, mismo tipo de coincidencia que "text-align: left" arriba) —
    // se acota a los 2 lugares REALES donde vive body_container_background_padding
    // (la celda de texto de escritorio y la de mobile) para no contarlo.
    expect(html).toMatch(/text-align: left; padding: 10px/) // celda de texto, escritorio
    expect(html).toMatch(/word-break: break-all; padding: 10px/) // celda de texto, mobile
  })
})

describe('renderCol2Snippet · fondo de la imagen (toggle INDEPENDIENTE del general)', () => {
  it('imageBackgroundEnabled=true (default): the real per-theme background-image survives, in BOTH tables', () => {
    const html = render(defaultCol2Fields, { global: { ...defaultEmailDocument.global, tema: 'beige100' } })
    expect(html.match(/url\(https:\/\/lh3\.googleusercontent\.com\/d\/1VvTU2Kb1tl-y3406qnQ1XwPkQ1nCaOw3\)/g)?.length).toBe(2)
  })

  it('imageBackgroundEnabled=false: the background-image CSS is stripped entirely (no generic fallback, no leftover token), in BOTH tables — independent of the general backgroundEnabled', () => {
    const html = render(
      { ...defaultCol2Fields, imageBackgroundEnabled: false, backgroundEnabled: true },
      { global: { ...defaultEmailDocument.global, tema: 'beige100' } },
    )
    expect(html).not.toContain('background-image')
    expect(html).not.toContain('img_overlay_2_mail_general')
    // El fondo GENERAL sigue prendido (no se pisan entre sí).
    expect(html).toContain('background:rgba(242,211,174,0.5)')
  })
})

describe('renderCol2Snippet · sin fugas de Liquid, en los 12 temas', () => {
  it.each(THEME_SLUGS)('%s: no {%% %%} tags, no unresolved _mail_general', (tema) => {
    const html = render(defaultCol2Fields, { global: { ...defaultEmailDocument.global, tema } })
    expect(html).not.toMatch(NO_LIQUID_TAG_RE)
    expect(html).not.toMatch(UNRESOLVED_GENERAL_RE)
    expect(html).not.toMatch(UNRESOLVED_MODULE_ALIGN_RE)
    expect(html).not.toContain('{{body_img_modulo_auto_ancho}}')
  })

  it.each(THEME_SLUGS)('%s: also clean with imageBackgroundEnabled=false + cellOrder=imagenPrimero + mode=full', (tema) => {
    const html = render(
      { ...defaultCol2Fields, imageBackgroundEnabled: false, cellOrder: 'imagenPrimero', image: { ...defaultCol2Fields.image, mode: 'full' } },
      { global: { ...defaultEmailDocument.global, tema } },
    )
    expect(html).not.toMatch(NO_LIQUID_TAG_RE)
    expect(html).not.toMatch(UNRESOLVED_GENERAL_RE)
    expect(html).not.toMatch(UNRESOLVED_MODULE_ALIGN_RE)
  })
})
