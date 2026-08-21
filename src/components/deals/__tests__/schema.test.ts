import { describe, expect, it } from 'vitest'
import {
  DEAL_CARD_PIECE_LABELS,
  DEAL_CARD_PIECE_TYPES,
  defaultDealCardFields,
  hideDealCardPiece,
  isDealCardPieceHidden,
  restoreDealCardPiece,
  type DealCardFields,
} from '../schema'

const fields = (over: Partial<DealCardFields> = {}): DealCardFields => ({ ...defaultDealCardFields, ...over })

describe('DEAL_CARD_PIECE_LABELS', () => {
  it('tiene una etiqueta para cada una de las 7 piezas', () => {
    for (const type of DEAL_CARD_PIECE_TYPES) {
      expect(DEAL_CARD_PIECE_LABELS[type]).toBeTruthy()
    }
  })
})

describe('isDealCardPieceHidden', () => {
  it('los defaults de fábrica no están ocultos (las 7 piezas se ven)', () => {
    for (const type of DEAL_CARD_PIECE_TYPES) {
      expect(isDealCardPieceHidden(defaultDealCardFields, type)).toBe(false)
    }
  })

  it('copy1/copy2 se ocultan solo si el texto queda vacío (o solo espacios)', () => {
    expect(isDealCardPieceHidden(fields({ copy1: '' }), 'copy1')).toBe(true)
    expect(isDealCardPieceHidden(fields({ copy1: '   ' }), 'copy1')).toBe(true)
    expect(isDealCardPieceHidden(fields({ copy1: 'algo' }), 'copy1')).toBe(false)
    expect(isDealCardPieceHidden(fields({ copy2: '' }), 'copy2')).toBe(true)
  })

  it('precio se oculta solo si NINGUNO de sus 3 sub-campos está prendido', () => {
    expect(
      isDealCardPieceHidden(
        fields({ markdownEnabled: false, complemento1Enabled: false, complemento2Enabled: false }),
        'precio',
      ),
    ).toBe(true)
    // Con uno solo prendido ya se considera visible.
    expect(
      isDealCardPieceHidden(
        fields({ markdownEnabled: false, complemento1Enabled: true, complemento2Enabled: false }),
        'precio',
      ),
    ).toBe(false)
  })

  it('rating se oculta solo si NINGUNO de categoría/rating/tiempo está prendido', () => {
    expect(
      isDealCardPieceHidden(
        fields({ categoriaEnabled: false, ratingEnabled: false, tiempoEnabled: false }),
        'rating',
      ),
    ).toBe(true)
    expect(
      isDealCardPieceHidden(
        fields({ categoriaEnabled: false, ratingEnabled: true, tiempoEnabled: false }),
        'rating',
      ),
    ).toBe(false)
  })

  it('tag1/tag2/cta se ocultan por su propio enabled', () => {
    expect(isDealCardPieceHidden(fields({ tag1Enabled: false }), 'tag1')).toBe(true)
    expect(isDealCardPieceHidden(fields({ tag2Enabled: false }), 'tag2')).toBe(true)
    expect(isDealCardPieceHidden(fields({ ctaEnabled: false }), 'cta')).toBe(true)
  })
})

describe('hideDealCardPiece', () => {
  it('apaga/vacía SOLO la pieza pedida, sin tocar las demás', () => {
    const before = fields()
    for (const type of DEAL_CARD_PIECE_TYPES) {
      const after = hideDealCardPiece(before, type)
      expect(isDealCardPieceHidden(after, type)).toBe(true)
      // El resto de las piezas queda exactamente como estaba.
      for (const other of DEAL_CARD_PIECE_TYPES) {
        if (other === type) continue
        expect(isDealCardPieceHidden(after, other)).toBe(isDealCardPieceHidden(before, other))
      }
    }
  })

  it('copy1 se vacía (no solo se "apaga" con un booleano que no existe)', () => {
    expect(hideDealCardPiece(fields(), 'copy1').copy1).toBe('')
  })
})

describe('restoreDealCardPiece', () => {
  it('es el inverso de hideDealCardPiece: vuelve visible lo que se ocultó', () => {
    for (const type of DEAL_CARD_PIECE_TYPES) {
      const hidden = hideDealCardPiece(fields(), type)
      const restored = restoreDealCardPiece(hidden, type)
      expect(isDealCardPieceHidden(restored, type)).toBe(false)
    }
  })

  it('restablece a los valores de fábrica, no a un estado arbitrario', () => {
    const edited = fields({ tag1Enabled: false, tag1Text: 'lo que sea', tag1IconUrl: 'https://otra-cosa' })
    const restored = restoreDealCardPiece(edited, 'tag1')
    expect(restored.tag1Enabled).toBe(defaultDealCardFields.tag1Enabled)
    expect(restored.tag1Text).toBe(defaultDealCardFields.tag1Text)
    expect(restored.tag1IconUrl).toBe(defaultDealCardFields.tag1IconUrl)
  })
})
