import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HISTORY_BURST_MS, redoOnce, undoOnce, useBuilder } from '../store'

const tema = () => useBuilder.getState().document.global.tema
const setTema = (next: string) => {
  const s = useBuilder.getState()
  s.setGlobalFields({ ...s.document.global, tema: next })
}
const past = () => useBuilder.temporal.getState().pastStates.length
const future = () => useBuilder.temporal.getState().futureStates.length
/** Deja pasar tiempo suficiente para que el próximo cambio abra otra entrada. */
const pause = () => vi.advanceTimersByTime(HISTORY_BURST_MS + 1)

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-25T12:00:00Z'))
  setTema('beige100')
  pause()
  useBuilder.temporal.getState().clear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('historial de deshacer/rehacer', () => {
  it('one click undoes one change, even after the autosave status updates', () => {
    setTema('rosa100')
    // El autosave escribe saveStatus dos veces; no deben ser pasos del historial.
    vi.advanceTimersByTime(2000)
    expect(useBuilder.getState().saveStatus).not.toBe('saving')
    expect(past()).toBe(1)

    undoOnce()
    expect(tema()).toBe('beige100')
    expect(past()).toBe(0)
  })

  it('one click redoes it back', () => {
    setTema('rosa100')
    vi.advanceTimersByTime(2000)
    undoOnce()
    vi.advanceTimersByTime(2000)
    expect(future()).toBe(1)

    redoOnce()
    expect(tema()).toBe('rosa100')
  })

  it('walks back separate changes one click each', () => {
    setTema('rosa100')
    pause()
    setTema('verde100')
    pause()
    setTema('gris100')
    vi.advanceTimersByTime(2000)

    undoOnce()
    expect(tema()).toBe('verde100')
    undoOnce()
    expect(tema()).toBe('rosa100')
    undoOnce()
    expect(tema()).toBe('beige100')
  })

  it('groups a quick burst (typing) into one step, restoring the state from BEFORE the burst', () => {
    for (const t of ['rosa100', 'purpura100', 'celeste100', 'verde100']) {
      setTema(t)
      vi.advanceTimersByTime(100)
    }
    expect(past()).toBe(1)
    undoOnce()
    expect(tema()).toBe('beige100')
  })

  it('records a change made right after an undo as a new step, not merged into the undone one', () => {
    setTema('rosa100')
    undoOnce()
    setTema('verde100')
    expect(past()).toBe(1)
    undoOnce()
    expect(tema()).toBe('beige100')
  })

  it('undoing right after an edit (no wait) reverts that edit', () => {
    setTema('rosa100')
    undoOnce()
    expect(tema()).toBe('beige100')
    vi.advanceTimersByTime(2000)
    expect(tema()).toBe('beige100')
  })
})
