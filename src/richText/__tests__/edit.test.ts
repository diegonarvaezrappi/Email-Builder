import { describe, expect, it } from 'vitest'
import { rangeHasMark, setColorMark, toggleMark } from '../edit'
import type { RichText } from '../model'

const plain = (text: string): RichText => [{ text, marks: [] }]

describe('toggleMark', () => {
  it('applies a mark to a plain-text selection, splitting the run in 3', () => {
    const runs = plain('hola mundo')
    const next = toggleMark(runs, 5, 10, 'bold')
    expect(next).toEqual([
      { text: 'hola ', marks: [] },
      { text: 'mundo', marks: ['bold'] },
    ])
  })

  it('removing the mark again restores the plain run (merge adjacent)', () => {
    const runs = toggleMark(plain('hola mundo'), 5, 10, 'bold')
    const back = toggleMark(runs, 5, 10, 'bold')
    expect(back).toEqual(plain('hola mundo'))
  })

  it('toggling a mark over a MIXED selection (some already marked, some not) turns it ON everywhere', () => {
    const runs: RichText = [
      { text: 'ho', marks: ['bold'] },
      { text: 'la mundo', marks: [] },
    ]
    const next = toggleMark(runs, 0, 10, 'bold')
    expect(next).toEqual([{ text: 'hola mundo', marks: ['bold'] }])
  })

  it('toggling a mark that covers the WHOLE selection turns it OFF', () => {
    const runs: RichText = [{ text: 'hola mundo', marks: ['bold'] }]
    const next = toggleMark(runs, 0, 10, 'bold')
    expect(next).toEqual(plain('hola mundo'))
  })

  it('a collapsed or inverted range is a no-op', () => {
    const runs = plain('hola')
    expect(toggleMark(runs, 2, 2, 'bold')).toBe(runs)
    expect(toggleMark(runs, 3, 1, 'bold')).toBe(runs)
  })

  it('does not disturb marks outside the selected range', () => {
    const runs: RichText = [{ text: 'hola mundo', marks: ['italic'] }]
    const next = toggleMark(runs, 5, 10, 'bold')
    expect(next).toEqual([
      { text: 'hola ', marks: ['italic'] },
      { text: 'mundo', marks: ['italic', 'bold'] },
    ])
  })

  it('a selection spanning 2 different existing runs merges cleanly once both share marks', () => {
    const runs: RichText = [
      { text: 'hola ', marks: ['bold'] },
      { text: 'mundo', marks: ['bold'] },
    ]
    // ya comparten "bold" en todo el rango -> togglear "bold" lo apaga, y al
    // apagarlo en ambos runs, mergeAdjacentRuns los vuelve a unir en 1.
    const next = toggleMark(runs, 0, 10, 'bold')
    expect(next).toEqual(plain('hola mundo'))
  })
})

describe('setColorMark', () => {
  it('sets a color mark on the selection', () => {
    const next = setColorMark(plain('hola mundo'), 0, 4, 'colorAcento1')
    expect(next).toEqual([
      { text: 'hola', marks: ['colorAcento1'] },
      { text: ' mundo', marks: [] },
    ])
  })

  it('setting a different color mark REPLACES the previous one (mutually exclusive)', () => {
    const runs: RichText = [{ text: 'hola', marks: ['colorAcento1'] }]
    const next = setColorMark(runs, 0, 4, 'colorAcento2')
    expect(next).toEqual([{ text: 'hola', marks: ['colorAcento2'] }])
  })

  it('setting null clears the color mark without touching other marks', () => {
    const runs: RichText = [{ text: 'hola', marks: ['colorAcento1', 'bold'] }]
    const next = setColorMark(runs, 0, 4, null)
    expect(next).toEqual([{ text: 'hola', marks: ['bold'] }])
  })
})

describe('rangeHasMark', () => {
  it('true only when the mark covers the whole range', () => {
    const runs: RichText = [
      { text: 'ho', marks: ['bold'] },
      { text: 'la', marks: [] },
    ]
    expect(rangeHasMark(runs, 0, 2, 'bold')).toBe(true)
    expect(rangeHasMark(runs, 0, 4, 'bold')).toBe(false)
    expect(rangeHasMark(runs, 2, 2, 'bold')).toBe(false)
  })
})
