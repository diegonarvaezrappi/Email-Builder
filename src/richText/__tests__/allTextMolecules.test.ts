import { describe, expect, it } from 'vitest'
import type { RichText } from '../model'
import { renderTituloTextoSnippet, renderBulletNumeradoSnippet, renderModuleTagsSnippet } from '../../moduleItems/render'
import { tituloTextoFieldsSchema, bulletNumeradoFieldsSchema } from '../../moduleItems/schemas'
import { renderTextoPastillaSnippet } from '../../components/banner/items/render'
import { defaultTagItem, textoPastillaFieldsSchema } from '../../components/banner/items/schemas'
import { dealCardFieldsSchema, isDealCardPieceHidden } from '../../components/deals/schema'
import { tituloCellFieldsSchema } from '../../components/cupones/schema'
import { resolveBranchFields } from '../../tropicalize/render'

const boldWord: RichText = [
  { text: 'Hola ', marks: [] },
  { text: 'mundo', marks: ['bold', 'colorAcento1'] },
]

describe('todas las moléculas de texto aceptan modificadores', () => {
  it('un título de módulo pinta las marcas con tokens del tema', () => {
    const html = renderTituloTextoSnippet({ text: boldWord })
    expect(html).toContain('Hola <span style="color: {{color_acento1_mail_general}}; font-weight: bold;">mundo</span>')
  })

  it('cada texto del bullet numerado lleva sus propias marcas', () => {
    const html = renderBulletNumeradoSnippet({
      numero: [{ text: '2', marks: ['italic'] }],
      titulo: boldWord,
      texto: [{ text: 'antes', marks: ['strike'] }],
    })
    expect(html).toContain('<span style="font-style: italic;">2</span>')
    expect(html).toContain('<span style="text-decoration: line-through;">antes</span>')
  })

  it('pastilla y tags también', () => {
    const pastilla = renderTextoPastillaSnippet(textoPastillaFieldsSchema.parse({ pillText: [{ text: 'Hoy', marks: ['underline'] }] }))
    expect(pastilla).toContain('<span style="text-decoration: underline;">Hoy</span>')
    const tags = renderModuleTagsSnippet({ tags: [{ ...defaultTagItem(), text: [{ text: 'nuevo', marks: ['bold'] }] }] })
    expect(tags).toContain('<span style="font-weight: bold;">nuevo</span>')
  })

  it('el texto sigue escapado', () => {
    expect(renderTituloTextoSnippet({ text: [{ text: '<b>x</b>', marks: [] }] })).toContain('&lt;b&gt;x&lt;/b&gt;')
  })
})

describe('documentos guardados con texto plano', () => {
  it('los strings viejos se migran a un run sin marcas', () => {
    expect(tituloTextoFieldsSchema.parse({ text: 'Viejo' }).text).toEqual([{ text: 'Viejo', marks: [] }])
    expect(bulletNumeradoFieldsSchema.parse({ numero: '3' }).numero).toEqual([{ text: '3', marks: [] }])
    const card = dealCardFieldsSchema.parse({ copy1: 'Promo', ctaText: 'Pedir', legalText: 'TyC' })
    expect(card.copy1).toEqual([{ text: 'Promo', marks: [] }])
    expect(card.ctaText).toEqual([{ text: 'Pedir', marks: [] }])
    expect(tituloCellFieldsSchema.parse({ titleText: 'T' }).titleText).toEqual([{ text: 'T', marks: [] }])
  })

  it('un override de tropicalizar guardado como string sigue renderizando', () => {
    const fields = resolveBranchFields({ text: boldWord }, { countries: ['AR'], hidden: false, overrides: { text: 'Che' } })
    expect(renderTituloTextoSnippet(fields)).toContain('>Che<')
  })

  it('una línea de deal con solo espacios sigue contando como vacía', () => {
    const card = dealCardFieldsSchema.parse({ copy1: [{ text: '  ', marks: ['bold'] }] })
    expect(isDealCardPieceHidden(card, 'copy1')).toBe(true)
  })
})
