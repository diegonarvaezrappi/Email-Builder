// @vitest-environment jsdom
//
// jsdom no implementa la Clipboard API en absoluto (navigator.clipboard es
// `undefined`, no un stub) ni `document.execCommand` (también `undefined`) —
// ver la nota de copyText en ../exporters.ts. Estos tests asignan ambos
// globals a mano en cada caso en vez de usar vi.spyOn (no hay nada
// preexistente para "espiar").
import { afterEach, describe, expect, it } from 'vitest'
import { copyHtmlToClipboard } from '../exporters'
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
