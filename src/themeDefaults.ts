// ============================================================================
// Ajustes por defecto que dispara un cambio de TEMA GENERAL — nunca al revés
// (el tema nunca cambia porque el usuario tocó el header o el CTA). Vive fuera
// de App.tsx como funciones puras para poder testear la combinación de reglas
// sin montar React: el useEffect de App.tsx solo llama a estas 2 y aplica el
// resultado.
//
// header.brand y global.ctaStyle solo se ajustan MIENTRAS el usuario no los
// haya tocado a mano — cualquier marca/estilo es válido con cualquier tema
// (02-components/README.md, USO-DE-CADA-PARTE.md §4), así que esto es solo
// una sugerencia inicial, no un candado.
//
// "No tocado a mano" NO puede ser "sigue en defaultHeaderFields.brand": una
// vez que este mismo efecto cambia la marca (ej. al entrar a Verde 100), la
// marca ya NUNCA vuelve a ser 'rappi' por sí sola, así que ese chequeo se
// rompe para siempre y el valor queda anclado en cualquier tema siguiente —
// el bug reportado. En su lugar se compara contra lo que este mismo efecto
// habría puesto para el tema ANTERIOR (prevTema, que el caller trackea): si
// la marca actual coincide con eso, es que el usuario no la tocó desde el
// último cambio de tema, y es seguro reemplazarla por lo que le toca al tema
// nuevo. Si no coincide, el usuario la pisó a mano y esto no debe volver a
// tocarla hasta que el usuario cambie de tema otra vez sin volver a tocarla
// (limitación aceptada, igual de imprecisa que el chequeo original: si el
// usuario elige a mano el mismo valor que el tema anterior ya traía, se lee
// como "no tocado").
//
// header.logoBackground es distinto: SIEMPRE se fuerza al entrar a un tema
// pastel, oscuro/invertido, Pro o ProBlack, sin importar si el usuario ya lo
// había tocado — no existe una combinación válida de logo claro+tema oscuro
// (o viceversa) que este ajuste deba respetar, a diferencia de brand/ctaStyle.
// ============================================================================
import { defaultHeaderFields } from './components/header/schema'
import type { HeaderFields } from './components/header/schema'
import { defaultBannerFields } from './components/banner/schema'
import type { BannerFields } from './components/banner/schema'
import { defaultGlobalFields } from './global/schema'
import type { CtaStyle, GlobalFields } from './global/schema'
import { DARK_THEME_SLUGS, PASTEL_THEME_SLUGS } from './themes/themes'

/**
 * Marca esperada por tema, para los temas donde NO coincide con el default
 * general ('rappi'). Pro/ProBlack tienen su propia marca de header
 * (rappi-pro/rappi-pro-black); de los 3 oscuros/invertidos, Dark Turbo tiene
 * la suya (rappi-turbo) — Dark Neon y Dark Neutro usan la marca Rappi
 * genérica, que YA es defaultHeaderFields.brand, así que no necesitan entrada
 * acá (agregar 'darkneon: rappi' sería fijar un valor que ya es el default).
 * Verde 100 (pastel) también especializa a rappi-turbo, aunque el resto de
 * los pasteles se queden en Rappi genérico — su logoBackground sigue
 * viniendo de la regla de pastel de abajo, no de acá.
 */
const BRAND_FOR_THEME: Partial<Record<string, HeaderFields['brand']>> = {
  pro: 'rappi-pro',
  problack: 'rappi-pro-black',
  darkturbo: 'rappi-turbo',
  verde100: 'rappi-turbo',
}

/** Idem para el estilo global de CTA — solo Pro/ProBlack lo especializan. */
const CTA_STYLE_FOR_THEME: Partial<Record<string, CtaStyle>> = {
  pro: 'pro',
  problack: 'problack',
}

/**
 * logoBackground forzado por tema — a diferencia de BRAND_FOR_THEME (que solo
 * lista excepciones al default), este mapa cubre los 11 temas reales: los 6
 * pasteles a 'claro', los 3 oscuros/invertidos a 'oscuro', y Pro/ProBlack con
 * su propia regla — pedido explícito del usuario, no se infiere de "Premium =
 * fondo fijo" como el resto de los grupos: Pro es 'oscuro', ProBlack es
 * 'claro' (dirección contraria entre sí, no confundir con el patrón de los
 * otros 2 grupos). Un tema que no aparezca acá (ninguno hoy) no toca
 * logoBackground.
 */
const LOGO_BACKGROUND_FOR_THEME: Record<string, HeaderFields['logoBackground']> = {
  ...Object.fromEntries(PASTEL_THEME_SLUGS.map((tema) => [tema, 'claro'] as const)),
  ...Object.fromEntries(DARK_THEME_SLUGS.map((tema) => [tema, 'oscuro'] as const)),
  pro: 'oscuro',
  problack: 'claro',
}

function expectedBrandForTema(tema: string): HeaderFields['brand'] {
  return BRAND_FOR_THEME[tema] ?? defaultHeaderFields.brand
}

function expectedCtaStyleForTema(tema: string): CtaStyle {
  return CTA_STYLE_FOR_THEME[tema] ?? defaultGlobalFields.ctaStyle
}

/**
 * El fondo del banner (banner.backgroundEnabled) viene activado por defecto
 * en el schema (true, el comportamiento de los temas no-pastel) — en pastel
 * el maestro documenta que el contenedor viene APAGADO por defecto (ver
 * components/banner/render.ts), así que el default correcto ahí es false.
 * Mismo patrón de "no tocado desde el tema anterior" que brand/ctaStyle (NO
 * el de logoBackground, que siempre se fuerza): activar/desactivar el fondo
 * es una elección válida en cualquier tema, así que si el usuario ya tocó el
 * checkbox a mano, este efecto no debe volver a pisarlo hasta el próximo
 * cambio de tema sin tocar.
 */
function expectedBackgroundEnabledForTema(tema: string): boolean {
  return !PASTEL_THEME_SLUGS.includes(tema)
}

/**
 * Qué campos del header debería escribir el efecto de tema, o null si ninguno
 * aplica. Devuelve un patch (no el header completo) para que el caller decida
 * cómo mezclarlo — juntar brand + logoBackground en un solo patch (en vez de
 * 2 llamadas a setSlotFields seguidas) importa: 2 escrituras separadas
 * basadas en el mismo `header` de closure se pisarían entre sí cuando ambas
 * aplican a la vez (ej. tema darkturbo: brand Y logoBackground cambian juntos).
 *
 * `prevTema`: el tema general que regía ANTES de este cambio (null si es el
 * primer render, sin tema anterior — ahí se usa defaultHeaderFields.brand
 * como referencia, el mismo criterio que antes de que existiera prevTema).
 */
export function headerPatchForTheme(
  header: HeaderFields,
  tema: string,
  prevTema: string | null,
): Partial<HeaderFields> | null {
  const patch: Partial<HeaderFields> = {}

  const brandUntouchedSincePrevTema =
    header.brand === (prevTema === null ? defaultHeaderFields.brand : expectedBrandForTema(prevTema))
  if (brandUntouchedSincePrevTema) {
    const brand = expectedBrandForTema(tema)
    if (brand !== header.brand) patch.brand = brand
  }

  const forcedLogoBackground = LOGO_BACKGROUND_FOR_THEME[tema]
  if (forcedLogoBackground && header.logoBackground !== forcedLogoBackground) {
    patch.logoBackground = forcedLogoBackground
  }

  return Object.keys(patch).length > 0 ? patch : null
}

/** Análogo para global.ctaStyle — un solo campo, no hace falta un patch parcial. */
export function ctaStyleForTheme(global: GlobalFields, tema: string, prevTema: string | null): CtaStyle | null {
  const untouchedSincePrevTema =
    global.ctaStyle === (prevTema === null ? defaultGlobalFields.ctaStyle : expectedCtaStyleForTema(prevTema))
  if (!untouchedSincePrevTema) return null

  const ctaStyle = expectedCtaStyleForTema(tema)
  return ctaStyle !== global.ctaStyle ? ctaStyle : null
}

/** Análogo para banner.backgroundEnabled — ver expectedBackgroundEnabledForTema. */
export function bannerBackgroundEnabledForTheme(banner: BannerFields, tema: string, prevTema: string | null): boolean | null {
  const untouchedSincePrevTema =
    banner.backgroundEnabled ===
    (prevTema === null ? defaultBannerFields.backgroundEnabled : expectedBackgroundEnabledForTema(prevTema))
  if (!untouchedSincePrevTema) return null

  const backgroundEnabled = expectedBackgroundEnabledForTema(tema)
  return backgroundEnabled !== banner.backgroundEnabled ? backgroundEnabled : null
}
