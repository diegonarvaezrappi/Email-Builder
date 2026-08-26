import { describe, expect, it } from 'vitest'
import { defaultHeaderFields } from '../components/header/schema'
import { defaultBannerFields } from '../components/banner/schema'
import { defaultGlobalFields } from '../global/schema'
import { bannerBackgroundEnabledForTheme, ctaStyleForTheme, headerPatchForTheme, moduleBackgroundEnabledForTheme } from '../themeDefaults'

// prevTema=null en la mayoría de estos tests = "primer render, sin tema
// anterior" (mismo criterio que el chequeo original contra el default). Los
// tests de "revert" de más abajo son los que ejercitan prevTema real.

describe('headerPatchForTheme', () => {
  it('does nothing for a tema outside all 3 known groups (e.g. a stale slug from an old saved document)', () => {
    expect(headerPatchForTheme(defaultHeaderFields, 'tema-que-no-existe', null)).toBeNull()
  })

  it('returns null when nothing needs to change (already the default brand + logoBackground already claro)', () => {
    // Verde 100 queda afuera: a diferencia del resto de los pasteles,
    // especializa la marca a Rappi Turbo (ver test de más abajo), así que SÍ
    // hay un patch incluso arrancando del header por defecto.
    for (const tema of ['beige100', 'beige150', 'rosa100', 'purpura100', 'celeste100']) {
      expect(headerPatchForTheme(defaultHeaderFields, tema, null)).toBeNull()
    }
  })

  it('switches brand to rappi-pro/rappi-pro-black only while brand is still at its default', () => {
    // Pro también fuerza logoBackground a 'oscuro' (ver test dedicado), así
    // que su patch trae los 2 campos — problack, en cambio, ya arranca en
    // 'claro' por default, así que el suyo solo trae la marca.
    expect(headerPatchForTheme(defaultHeaderFields, 'pro', null)).toEqual({ brand: 'rappi-pro', logoBackground: 'oscuro' })
    expect(headerPatchForTheme(defaultHeaderFields, 'problack', null)).toEqual({ brand: 'rappi-pro-black' })
    expect(headerPatchForTheme({ ...defaultHeaderFields, brand: 'soyrappi' }, 'pro', null)).toEqual({
      logoBackground: 'oscuro',
    })
  })

  it('forces logoBackground to oscuro for Pro and to claro for ProBlack (opposite of each other, user-specified)', () => {
    expect(headerPatchForTheme(defaultHeaderFields, 'pro', null)).toMatchObject({ logoBackground: 'oscuro' })
    expect(headerPatchForTheme({ ...defaultHeaderFields, logoBackground: 'oscuro' }, 'problack', null)).toMatchObject({
      logoBackground: 'claro',
    })
    // Ya en el valor correcto (marca Y logo): no hay nada que forzar de nuevo.
    expect(
      headerPatchForTheme({ ...defaultHeaderFields, brand: 'rappi-pro', logoBackground: 'oscuro' }, 'pro', null),
    ).toBeNull()
  })

  it('forces logoBackground to claro for every pastel theme, regardless of the brand guard', () => {
    for (const tema of ['beige100', 'beige150', 'rosa100', 'purpura100', 'celeste100']) {
      expect(headerPatchForTheme({ ...defaultHeaderFields, logoBackground: 'oscuro' }, tema, null)).toEqual({
        logoBackground: 'claro',
      })
    }
    // Verde 100 además especializa la marca (ver test dedicado), así que su
    // patch trae los 2 campos, no solo logoBackground.
    expect(headerPatchForTheme({ ...defaultHeaderFields, logoBackground: 'oscuro' }, 'verde100', null)).toEqual({
      brand: 'rappi-turbo',
      logoBackground: 'claro',
    })
  })

  it('forces logoBackground to oscuro for every "oscuros/invertidos" theme', () => {
    for (const tema of ['darkneon', 'darkturbo', 'darkneutro']) {
      expect(headerPatchForTheme(defaultHeaderFields, tema, null)).toMatchObject({ logoBackground: 'oscuro' })
    }
  })

  it('switches brand to rappi-turbo for Dark Turbo, but leaves Dark Neon/Neutro at the generic Rappi brand', () => {
    expect(headerPatchForTheme(defaultHeaderFields, 'darkturbo', null)).toEqual({
      brand: 'rappi-turbo',
      logoBackground: 'oscuro',
    })
    // darkneon/darkneutro: la marca esperada (Rappi) ya es el default, así que
    // el patch solo trae logoBackground.
    expect(headerPatchForTheme(defaultHeaderFields, 'darkneon', null)).toEqual({ logoBackground: 'oscuro' })
    expect(headerPatchForTheme(defaultHeaderFields, 'darkneutro', null)).toEqual({ logoBackground: 'oscuro' })
  })

  it('switches brand to rappi-turbo for Verde 100 too, even though it is a pastel (logoBackground stays claro)', () => {
    expect(headerPatchForTheme(defaultHeaderFields, 'verde100', null)).toEqual({ brand: 'rappi-turbo' })
    // El resto de los pasteles se quedan en la marca genérica Rappi.
    expect(headerPatchForTheme(defaultHeaderFields, 'beige100', null)).toBeNull()
  })

  it('does not touch brand once the user picked one manually, even for Verde 100', () => {
    expect(headerPatchForTheme({ ...defaultHeaderFields, brand: 'soyrappi' }, 'verde100', null)).toBeNull()
  })

  it('merges brand + logoBackground into ONE patch instead of requiring 2 separate writes', () => {
    // Este es el caso que rompería con 2 llamadas a setSlotFields seguidas
    // basadas en el mismo `header` obsoleto (ver el comentario en App.tsx):
    // Dark Turbo cambia brand Y logoBackground a la vez.
    const patch = headerPatchForTheme(defaultHeaderFields, 'darkturbo', null)
    expect(patch).toEqual({ brand: 'rappi-turbo', logoBackground: 'oscuro' })
  })

  it('does not touch brand once the user picked one manually, even for Dark Turbo', () => {
    expect(headerPatchForTheme({ ...defaultHeaderFields, brand: 'rappi-pro' }, 'darkturbo', null)).toEqual({
      logoBackground: 'oscuro',
    })
  })

  describe('reverting an auto-switched brand when the theme moves away again (bug reportado)', () => {
    it('reverts Verde 100 -> Beige 100 back to the generic Rappi brand, since the user never touched it', () => {
      // Simula la secuencia real: tema arranca en beige100 (brand default),
      // pasa a verde100 (el propio efecto pone rappi-turbo), y vuelve a
      // beige100 sin que el usuario haya tocado la marca en el medio.
      const afterVerde = headerPatchForTheme(defaultHeaderFields, 'verde100', 'beige100')
      expect(afterVerde).toEqual({ brand: 'rappi-turbo' })

      const headerAfterVerde = { ...defaultHeaderFields, ...afterVerde }
      const afterBackToBeige = headerPatchForTheme(headerAfterVerde, 'beige100', 'verde100')
      expect(afterBackToBeige).toEqual({ brand: 'rappi' })
    })

    it('reverts Dark Turbo -> Pro back to the Pro brand chain correctly (each auto-switch replaces the previous one)', () => {
      const afterDarkTurbo = headerPatchForTheme(defaultHeaderFields, 'darkturbo', 'beige100')
      expect(afterDarkTurbo).toMatchObject({ brand: 'rappi-turbo' })

      const headerAfterDarkTurbo = { ...defaultHeaderFields, ...afterDarkTurbo }
      const afterPro = headerPatchForTheme(headerAfterDarkTurbo, 'pro', 'darkturbo')
      expect(afterPro).toMatchObject({ brand: 'rappi-pro' })
    })

    it('does NOT revert a manually-chosen brand, even after an unrelated auto-switch happened earlier', () => {
      // Verde 100 puso rappi-turbo; el usuario lo cambia a mano a soyrappi
      // (esto no pasa por acá — pasa por el onChange del panel — así que acá
      // solo se simula el header resultante). Al volver a beige100, NO debe
      // tocarse: el chequeo ve que brand ('soyrappi') no coincide con lo que
      // el propio efecto habría puesto para el tema anterior (verde100 ->
      // rappi-turbo), así que lo interpreta correctamente como "tocado a mano".
      const headerManuallyChanged = { ...defaultHeaderFields, brand: 'soyrappi' as const }
      expect(headerPatchForTheme(headerManuallyChanged, 'beige100', 'verde100')).toBeNull()
    })
  })
})

describe('ctaStyleForTheme', () => {
  it('switches to pro/problack only while ctaStyle is still at its default', () => {
    expect(ctaStyleForTheme(defaultGlobalFields, 'pro', null)).toBe('pro')
    expect(ctaStyleForTheme(defaultGlobalFields, 'problack', null)).toBe('problack')
    expect(ctaStyleForTheme({ ...defaultGlobalFields, ctaStyle: 'verde' }, 'pro', null)).toBeNull()
  })

  it('does nothing for pastel/oscuros themes — only Pro/ProBlack specialize ctaStyle', () => {
    expect(ctaStyleForTheme(defaultGlobalFields, 'beige100', null)).toBeNull()
    expect(ctaStyleForTheme(defaultGlobalFields, 'darkturbo', null)).toBeNull()
  })

  it('reverts Pro -> Beige 100 back to the default ctaStyle, since the user never touched it (same bug as brand)', () => {
    const proCtaStyle = ctaStyleForTheme(defaultGlobalFields, 'pro', 'beige100')
    expect(proCtaStyle).toBe('pro')

    const globalAfterPro = { ...defaultGlobalFields, ctaStyle: proCtaStyle! }
    expect(ctaStyleForTheme(globalAfterPro, 'beige100', 'pro')).toBe(defaultGlobalFields.ctaStyle)
  })

  it('does not revert a manually-chosen ctaStyle', () => {
    const globalManuallyChanged = { ...defaultGlobalFields, ctaStyle: 'verde' as const }
    expect(ctaStyleForTheme(globalManuallyChanged, 'beige100', 'pro')).toBeNull()
  })
})

describe('bannerBackgroundEnabledForTheme', () => {
  it('turns it off while entering a pastel theme from the default (true)', () => {
    for (const tema of ['beige100', 'beige150', 'rosa100', 'purpura100', 'celeste100', 'verde100']) {
      expect(bannerBackgroundEnabledForTheme(defaultBannerFields, tema, null)).toBe(false)
    }
  })

  it('returns null for non-pastel themes — true is already the default estático del schema', () => {
    expect(bannerBackgroundEnabledForTheme(defaultBannerFields, 'darkturbo', null)).toBeNull()
    expect(bannerBackgroundEnabledForTheme(defaultBannerFields, 'pro', null)).toBeNull()
  })

  it('reverts pastel -> oscuro back to true, since the user never touched the checkbox (same bug as brand)', () => {
    const afterPastel = bannerBackgroundEnabledForTheme(defaultBannerFields, 'beige100', null)
    expect(afterPastel).toBe(false)

    const bannerAfterPastel = { ...defaultBannerFields, backgroundEnabled: afterPastel! }
    expect(bannerBackgroundEnabledForTheme(bannerAfterPastel, 'darkturbo', 'beige100')).toBe(true)
  })

  it('does not revert a manually-enabled pastel background when leaving the theme', () => {
    // El usuario prendió el checkbox a mano en beige100 (bg_solid_mail_general
    // visible); este efecto no debe apagarlo de nuevo al pasar a darkturbo.
    const bannerManuallyEnabled = { ...defaultBannerFields, backgroundEnabled: true }
    expect(bannerBackgroundEnabledForTheme(bannerManuallyEnabled, 'darkturbo', 'beige100')).toBeNull()
  })

  it('does not re-disable a manually-enabled pastel background on an unrelated theme change between 2 pastel themes', () => {
    const bannerManuallyEnabled = { ...defaultBannerFields, backgroundEnabled: true }
    expect(bannerBackgroundEnabledForTheme(bannerManuallyEnabled, 'rosa100', 'beige100')).toBeNull()
  })
})

describe('moduleBackgroundEnabledForTheme', () => {
  // Dirección OPUESTA a bannerBackgroundEnabledForTheme: acá el default es
  // `false` en 9 temas y `true` SOLO en Pro/ProBlack (modulo-titulo.html:
  // "Viene por defecto sin fondo, solo viene con fondo por defecto para el
  // tema Pro y ProBlack").
  it('turns it on while entering pro/problack from the schema default (false)', () => {
    expect(moduleBackgroundEnabledForTheme(false, 'pro', null)).toBe(true)
    expect(moduleBackgroundEnabledForTheme(false, 'problack', null)).toBe(true)
  })

  it('returns null for every non-Pro/ProBlack theme — false is already the schema default', () => {
    expect(moduleBackgroundEnabledForTheme(false, 'beige100', null)).toBeNull()
    expect(moduleBackgroundEnabledForTheme(false, 'darkturbo', null)).toBeNull()
  })

  it('reverts pro -> beige100 back to false, since the user never touched the checkbox', () => {
    const afterPro = moduleBackgroundEnabledForTheme(false, 'pro', null)
    expect(afterPro).toBe(true)
    expect(moduleBackgroundEnabledForTheme(afterPro!, 'beige100', 'pro')).toBe(false)
  })

  it('does not revert a manually-enabled background when leaving a non-premium theme', () => {
    // Usuario prendió el fondo a mano estando en beige100 (donde el default
    // es false) — moverse a otro tema no-premium no debe apagarlo de nuevo.
    expect(moduleBackgroundEnabledForTheme(true, 'darkturbo', 'beige100')).toBeNull()
  })

  it('does not re-enable a manually-disabled background on pro itself', () => {
    // El usuario apagó el checkbox a mano estando ya en Pro (donde el default
    // es true) — no debe volver a prenderse solo por seguir en el mismo tema.
    expect(moduleBackgroundEnabledForTheme(false, 'pro', 'pro')).toBeNull()
  })
})
