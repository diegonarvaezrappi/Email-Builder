// @vitest-environment jsdom
//
// jsdom no implementa la Clipboard API en absoluto (navigator.clipboard es
// `undefined`, no un stub) ni `document.execCommand` (también `undefined`) —
// ver la nota de copyText en ../exporters.ts. Estos tests asignan ambos
// globals a mano en cada caso en vez de usar vi.spyOn (no hay nada
// preexistente para "espiar").
import { afterEach, describe, expect, it } from 'vitest'
import { copyHtmlToClipboard, neutralizeVerticalWritingModeForCapture } from '../exporters'
import { assembleEmailHtml } from '../../template/assemble'
import { defaultEmailDocument } from '../../registry'

const expectedHtml = assembleEmailHtml(defaultEmailDocument)

describe('copyHtmlToClipboard', () => {
  afterEach(() => {
    // @ts-expect-error - se reasignan a mano en los tests, hay que dejarlos limpios entre uno y otro
    delete navigator.clipboard
    // @ts-expect-error - idem
    delete window.isSecureContext
    // @ts-expect-error - idem
    delete document.execCommand
  })

  it('usa navigator.clipboard.writeText en un contexto seguro (https o localhost)', async () => {
    const calls: string[] = []
    // @ts-expect-error - navigator.clipboard no existe en jsdom por defecto
    navigator.clipboard = { writeText: async (text: string) => void calls.push(text) }
    window.isSecureContext = true

    const kb = await copyHtmlToClipboard(defaultEmailDocument)

    expect(calls).toHaveLength(1)
    expect(calls[0]).toBe(expectedHtml)
    expect(kb).toBeGreaterThan(0)
  })

  it('usa el fallback execCommand("copy") cuando no hay Clipboard API o el contexto es inseguro (staging: http:// sobre IP pública)', async () => {
    // @ts-expect-error - simula el staging: sin Clipboard API
    navigator.clipboard = undefined
    window.isSecureContext = false
    const execCommandCalls: string[] = []
    document.execCommand = (cmd: string) => {
      execCommandCalls.push(cmd)
      return true
    }

    const kb = await copyHtmlToClipboard(defaultEmailDocument)

    expect(execCommandCalls).toEqual(['copy'])
    expect(kb).toBeGreaterThan(0)
    // el <textarea> temporal no debe quedar colgado en el DOM
    expect(document.querySelector('textarea')).toBeNull()
  })

  it('el fallback también corre si navigator.clipboard existe pero isSecureContext es false', async () => {
    // @ts-expect-error - existe la API pero el browser la desactivó por contexto inseguro
    navigator.clipboard = { writeText: async () => { throw new Error('no debería llamarse') } }
    window.isSecureContext = false
    document.execCommand = () => true

    await expect(copyHtmlToClipboard(defaultEmailDocument)).resolves.toBeGreaterThan(0)
  })

  it('propaga el error si el fallback también falla (execCommand devuelve false)', async () => {
    // @ts-expect-error - simula el staging: sin Clipboard API
    navigator.clipboard = undefined
    window.isSecureContext = false
    document.execCommand = () => false

    await expect(copyHtmlToClipboard(defaultEmailDocument)).rejects.toThrow()
    // ni en el camino de error debe quedar el <textarea> temporal colgado
    expect(document.querySelector('textarea')).toBeNull()
  })
})

// Regresión real (pull 2026-09-01, `cda7b3f` "orientación del texto del tag
// de promo"): el maestro cambió PROMO's "Ahora"/"Desde" de
// `writing-mode: vertical-rl` a `sideways-lr` sin avisar — las 2 rotan en
// SENTIDOS OPUESTOS, así que el PNG exportado quedó con el texto al revés
// respecto al preview en vivo hasta que se detectó vía CDP (comparación lado
// a lado) y se corrigió el mapeo ángulo↔writing-mode. Estos tests aseguran
// que la próxima vez que el maestro cambie este valor, falle ruidoso en vez
// de exportar en silencio con la rotación equivocada.
describe('neutralizeVerticalWritingModeForCapture', () => {
  const elWithWritingMode = (writingMode: string): HTMLElement => {
    const el = document.createElement('div')
    el.style.writingMode = writingMode
    el.style.height = '70px'
    el.textContent = 'Desde'
    document.body.appendChild(el)
    return el
  }

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('sideways-lr (el valor actual del maestro): rota -90deg', () => {
    elWithWritingMode('sideways-lr')
    neutralizeVerticalWritingModeForCapture(document)
    const inner = document.querySelector('div > div') as HTMLElement
    expect(inner.style.transform).toContain('rotate(-90deg)')
  })

  it('vertical-rl (el valor anterior del maestro, por si vuelve): rota 90deg — dirección OPUESTA a sideways-lr', () => {
    elWithWritingMode('vertical-rl')
    neutralizeVerticalWritingModeForCapture(document)
    const inner = document.querySelector('div > div') as HTMLElement
    expect(inner.style.transform).toContain('rotate(90deg)')
  })

  it('un writing-mode no mapeado falla ruidoso en vez de asumir una rotación (que podría salir al revés)', () => {
    elWithWritingMode('vertical-lr')
    expect(() => neutralizeVerticalWritingModeForCapture(document)).toThrow(/vertical-lr/)
  })

  it('limpia las 3 variantes de la propiedad writing-mode del elemento original', () => {
    const el = elWithWritingMode('sideways-lr')
    neutralizeVerticalWritingModeForCapture(document)
    expect(el.style.getPropertyValue('writing-mode')).toBe('')
  })
})
