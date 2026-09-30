import { describe, expect, it } from 'vitest'
import { richTextFromPlain } from '../../richText/model'
import { defaultEmailDocument } from '../../registry'
import { renderModuleCtaSnippet, renderModuleTagsSnippet } from '../render'
import { renderTitleSnippet } from '../../components/title/render'
import { renderCol1Snippet } from '../../components/col1/render'
import { defaultTitleFields } from '../../components/title/schema'
import { defaultCol1Fields } from '../../components/col1/schema'
import { moduleItemSchema, type ModuleItem } from '../schemas'

const tag = (text: string, iconEnabled = true) => ({ text: richTextFromPlain(text), iconEnabled, iconUrl: 'https://x.test/i.png', iconAlt: 'Ícono' })

describe('Tags dentro de un módulo (molecula_tag_icono.html)', () => {
  it('renders one pill per tag inside a single aligned container', () => {
    const html = renderModuleTagsSnippet({ tags: [tag('Uno'), tag('Dos'), tag('Tres')] })
    expect(html.match(/role="molecula-tag"/g)).toHaveLength(1)
    expect(html.match(/display: inline-block/g)).toHaveLength(3)
    for (const t of ['Uno', 'Dos', 'Tres']) expect(html).toContain(` ${t} </h4>`)
    expect(html).toContain('{{alineado_molecular_mail_body}}')
  })

  it('removes only the icon when it is off or blank, keeping the text', () => {
    const html = renderModuleTagsSnippet({ tags: [tag('Sin ícono', false), { ...tag('Vacío'), iconUrl: ' ' }] })
    expect(html).not.toContain('<img')
    expect(html).toContain(' Sin ícono </h4>')
    expect(html).toContain(' Vacío </h4>')
  })

  it('uses the given icon URL and alt, escaped', () => {
    const html = renderModuleTagsSnippet({ tags: [{ text: richTextFromPlain('A & B'), iconEnabled: true, iconUrl: 'https://x.test/i.png?a=1&b=2', iconAlt: 'Alt "q"' }] })
    expect(html).toContain('src="https://x.test/i.png?a=1&amp;b=2"')
    expect(html).toContain(' A &amp; B </h4>')
  })
})

describe('CTA dentro de un módulo', () => {
  it('emits the CTA content block of the footer type, aligned by the module', () => {
    const snippet = renderModuleCtaSnippet({ text: 'Pide ya', deeplink: '', size: 'big' as const }, defaultEmailDocument)
    expect(snippet).toContain("cta_alineado = '{{body_alineado_molecular}}'")
    expect(snippet).toContain('{{content_blocks.${CTA-template}}}')
    const rts = { ...defaultEmailDocument, footer: { ...defaultEmailDocument.footer, tipoFooter: 'RTS' as const } }
    expect(renderModuleCtaSnippet({ text: 'Pide ya', deeplink: '', size: 'big' as const }, rts)).toContain('{{content_blocks.${CTA_Q4_2024}}}')
  })

  it('resolves the alignment token once placed in a module, including 1 columna', () => {
    const items: ModuleItem[] = [
      { id: 'c1', areaKey: 'main', type: 'CTA_INTERNO', fields: { text: 'Pide ya', deeplink: '', size: 'big' as const } },
      { id: 't1', areaKey: 'main', type: 'TAGS', fields: { tags: [tag('Uno')] } },
    ]
    const title = renderTitleSnippet({ ...defaultTitleFields, align: 'center', items }, defaultEmailDocument, { blockId: 'b1' })
    expect(title).toContain("cta_alineado = 'center'")
    expect(title).not.toMatch(/body_alineado_molecular|alineado_molecular_mail_body/)

    const col1Items = items.map((it) => ({ ...it, areaKey: 'above' })) as ModuleItem[]
    const col1 = renderCol1Snippet({ ...defaultCol1Fields, items: col1Items }, defaultEmailDocument, { blockId: 'b2' })
    expect(col1).toContain("cta_alineado = 'left'")
    expect(col1).not.toMatch(/body_alineado_molecular|alineado_molecular_mail_body/)
  })

  it('uses the size chosen for the module CTA', () => {
    expect(renderModuleCtaSnippet({ text: 'Pide ya', deeplink: '', size: 'small' }, defaultEmailDocument)).toContain("cta_size = 'small'")
    expect(renderModuleCtaSnippet({ text: 'Pide ya', deeplink: '', size: 'big' }, defaultEmailDocument)).toContain("cta_size = 'big'")
  })

  it('keeps a module CTA saved before the size existed, as big', () => {
    const parsed = moduleItemSchema.parse({ id: 'c', areaKey: 'main', type: 'CTA_INTERNO', fields: { text: 'Viejo', deeplink: '' } })
    expect(parsed.fields).toEqual({ text: 'Viejo', deeplink: '', size: 'big' })
  })
})
