import { describe, expect, it } from 'vitest'
import { bannerShell, ITEMS_MARKER, MOLECULAS_MARKER } from '../shell'

describe('bannerShell', () => {
  it.each(['horizontal', 'vertical'] as const)('%s: shell contains ITEMS_MARKER exactly once', (bannerType) => {
    const { shell } = bannerShell(bannerType)
    expect(shell.split(ITEMS_MARKER).length - 1).toBe(1)
  })

  it.each(['horizontal', 'vertical'] as const)('%s: moleculeTable contains MOLECULAS_MARKER exactly once', (bannerType) => {
    const { moleculeTable } = bannerShell(bannerType)
    expect(moleculeTable.split(MOLECULAS_MARKER).length - 1).toBe(1)
  })

  it.each(['horizontal', 'vertical'] as const)('%s: shell keeps the real @media hook id and both link placeholders', (bannerType) => {
    const { shell } = bannerShell(bannerType)
    expect(shell).toContain(bannerType === 'horizontal' ? 'BANNER_HORIZONTAL' : 'BANNER_VERTICAL')
    expect(shell.split('AQUIELLINKDELBANNER').length - 1).toBe(2)
  })

  it.each(['horizontal', 'vertical'] as const)('%s: shell has no leftover HTML comments besides our 2 markers', (bannerType) => {
    const { shell } = bannerShell(bannerType)
    const comments = shell.match(/<!--[\s\S]*?-->/g) ?? []
    for (const c of comments) {
      expect([ITEMS_MARKER, MOLECULAS_MARKER]).toContain(c)
    }
  })

  it('horizontal: moleculeTable keeps the fixed 240px column and its padding var', () => {
    const { moleculeTable } = bannerShell('horizontal')
    expect(moleculeTable).toContain('class="alto-auto"')
    expect(moleculeTable).toContain('{{padd_banner_mail_general}}')
  })

  it('results are memoized (same reference on repeated calls)', () => {
    expect(bannerShell('vertical')).toBe(bannerShell('vertical'))
  })
})
