import { describe, expect, it } from 'vitest'
import { isSlotSelected, normalizeTropicalizationTarget, selectDealCardPiece, selectGlobalBackground, selectSlot } from '../selection'

describe('selectGlobalBackground', () => {
  it('produces a bare {slot} selection, same shape as a real singleton slot', () => {
    expect(selectGlobalBackground('HERO_BG')).toEqual({ slot: 'HERO_BG' })
    expect(selectGlobalBackground('CONTENTS_BG')).toEqual({ slot: 'CONTENTS_BG' })
  })
})

describe('isSlotSelected with a global background target', () => {
  it('matches only its own target, not the other one nor a real slot', () => {
    const selected = selectGlobalBackground('HERO_BG')
    expect(isSlotSelected(selected, 'HERO_BG')).toBe(true)
    expect(isSlotSelected(selected, 'CONTENTS_BG')).toBe(false)
    expect(isSlotSelected(selected, 'HEADER')).toBe(false)
  })
})

describe('normalizeTropicalizationTarget · global background targets', () => {
  // Pedido explícito del usuario (2026-09-21): al entrar a Tropicalizar con
  // "Fondo Hero"/"Fondo Contenidos" seleccionado, no hay nada tropicalizable
  // que mostrar — a diferencia de una línea de deal (que sube a la tarjeta
  // dueña), acá no hay un "dueño" al cual subir, así que limpia a null.
  it('clears a HERO_BG selection to null', () => {
    expect(normalizeTropicalizationTarget(selectGlobalBackground('HERO_BG'))).toBeNull()
  })

  it('clears a CONTENTS_BG selection to null', () => {
    expect(normalizeTropicalizationTarget(selectGlobalBackground('CONTENTS_BG'))).toBeNull()
  })

  it('leaves a real slot selection untouched', () => {
    expect(normalizeTropicalizationTarget(selectSlot('HEADER'))).toEqual(selectSlot('HEADER'))
  })

  it('still uplifts a deal card piece to its owning card, unaffected by the new guard', () => {
    expect(normalizeTropicalizationTarget(selectDealCardPiece('c1', 'copy1'))).toEqual({ slot: 'CONTENIDOS', dealCardId: 'c1' })
  })

  it('null stays null', () => {
    expect(normalizeTropicalizationTarget(null)).toBeNull()
  })
})
