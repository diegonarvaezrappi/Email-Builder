import { describe, expect, it } from 'vitest'
import { assembleEmailHtml } from '../assemble'
import { defaultEmailDocument } from '../../registry'

const contentsCell = (html: string) => {
  const i = html.indexOf('mismo fondo que el HERO')
  const td = html.indexOf('<td', i)
  return html.slice(td, html.indexOf('>', td) + 1)
}

describe('fondo de CONTENTS · color sólido', () => {
  it('paints the contents cell with the color, in CSS and as bgcolor', () => {
    const doc = { ...defaultEmailDocument, global: { ...defaultEmailDocument.global, contentsBgColor: '#FFF0DD' } }
    const cell = contentsCell(assembleEmailHtml(doc))
    expect(cell).toContain('bgcolor="#FFF0DD"')
    expect(cell).toContain('background-color: #FFF0DD;')
  })

  it('keeps the image on top of the color when both are set', () => {
    const doc = { ...defaultEmailDocument, global: { ...defaultEmailDocument.global, contentsBgColor: '#123456', contentsBgUrl: 'https://x.test/bg.png' } }
    const cell = contentsCell(assembleEmailHtml(doc))
    expect(cell).toContain('background-color: #123456;')
    expect(cell).toContain('url(https://x.test/bg.png)')
  })

  it('adds nothing when there is no color, and leaves the hero cell alone', () => {
    const plain = assembleEmailHtml(defaultEmailDocument)
    expect(contentsCell(plain)).not.toContain('bgcolor=')
    expect(contentsCell(plain)).not.toContain('background-color:')
    const colored = assembleEmailHtml({ ...defaultEmailDocument, global: { ...defaultEmailDocument.global, contentsBgColor: '#123456' } })
    const hero = colored.slice(colored.indexOf('el background-image es reemplazable'))
    const heroCell = hero.slice(hero.indexOf('<td'), hero.indexOf('>', hero.indexOf('<td')) + 1)
    expect(heroCell).not.toContain('#123456')
  })
})
