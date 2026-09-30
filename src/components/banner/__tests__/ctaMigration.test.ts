import { describe, expect, it } from 'vitest'
import { bannerSchema, bannerMoleculeAlignFor } from '../schema'

const legacyCta = { id: 'c', type: 'CTA_INTERNO', fields: { text: 'Viejo', deeplink: '' } }

describe('CTA del banner guardado antes de tener alineación y tamaño propios', () => {
  it('keeps the alignment it used to get from the banner molecules, and becomes big', () => {
    const vertical = bannerSchema.parse({ bannerType: 'vertical', moleculeAlign: 'left', items: [legacyCta] })
    expect(vertical.items[0].fields).toEqual({ text: 'Viejo', deeplink: '', align: 'left', size: 'big' })
    const horizontal = bannerSchema.parse({ bannerType: 'horizontal', horizontalMoleculeAlign: 'center', items: [legacyCta] })
    expect(horizontal.items[0].fields).toMatchObject({ align: 'center', size: 'big' })
    const defaults = bannerSchema.parse({ bannerType: 'horizontal', items: [legacyCta] })
    expect(defaults.items[0].fields).toMatchObject({ align: 'left' })
  })

  it('leaves a CTA that already has its own alignment untouched', () => {
    const parsed = bannerSchema.parse({ bannerType: 'vertical', moleculeAlign: 'left', items: [{ ...legacyCta, fields: { text: 'N', deeplink: '', align: 'center', size: 'small' } }] })
    expect(parsed.items[0].fields).toEqual({ text: 'N', deeplink: '', align: 'center', size: 'small' })
  })

  it('derives the default alignment from the banner orientation', () => {
    expect(bannerMoleculeAlignFor({ bannerType: 'vertical' })).toBe('center')
    expect(bannerMoleculeAlignFor({ bannerType: 'horizontal' })).toBe('left')
    expect(bannerMoleculeAlignFor({ bannerType: 'vertical', moleculeAlign: 'left' })).toBe('left')
  })
})

describe('insertBannerItem · CTA_INTERNO nuevo', () => {
  it('starts aligned like the rest of the banner pieces', async () => {
    const { useBuilder } = await import('../../../store/store')
    const s = useBuilder.getState()
    s.setSlotFields('banner', { ...s.document.banner, bannerType: 'horizontal', items: [] })
    useBuilder.getState().insertBannerItem('CTA_INTERNO', 0)
    expect(useBuilder.getState().document.banner.items[0].fields).toMatchObject({ align: 'left', size: 'big' })

    const v = useBuilder.getState()
    v.setSlotFields('banner', { ...v.document.banner, bannerType: 'vertical', moleculeAlign: 'center', items: [] })
    useBuilder.getState().insertBannerItem('CTA_INTERNO', 0)
    expect(useBuilder.getState().document.banner.items[0].fields).toMatchObject({ align: 'center' })
  })
})
