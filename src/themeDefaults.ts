// ============================================================================
// Ajustes por defecto que dispara un cambio de TEMA GENERAL — nunca al revés
// (el tema nunca cambia porque el usuario tocó el header o el CTA). Vive fuera
// de App.tsx como funciones puras para poder testear la combinación de reglas
// sin montar React: el useEffect de App.tsx solo llama a estas 2 y aplica el
// resultado.
//
// header.brand solo se ajusta MIENTRAS el usuario no lo haya tocado a mano —
// cualquier marca es válida con cualquier tema (02-components/README.md,
// USO-DE-CADA-PARTE.md §4), así que esto es solo una sugerencia inicial, no
// un candado.
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
// global.ctaStyle NO usa este patrón de "prevTema" — desde el pull del
// 2026-09-02 tiene su propio sentinel explícito ('default', ver
// global/schema.ts) que resuelve resolveCtaStyle más abajo, sin falta de
// trackear el tema anterior: 'default' es un valor que el usuario elige a
// propósito, no uno que este efecto podría haber puesto antes.
//
// header.logoBackground es distinto: SIEMPRE se fuerza al entrar a un tema
// pastel, oscuro/invertido, Pro o ProBlack, sin importar si el usuario ya lo
// había tocado — no existe una combinación válida de logo claro+tema oscuro
// (o viceversa) que este ajuste deba respetar, a diferencia de brand.
// ============================================================================
import { defaultHeaderFields } from './components/header/schema'
import type { HeaderFields } from './components/header/schema'
import { defaultBannerFields } from './components/banner/schema'
import type { BannerFields } from './components/banner/schema'
import type { CtaStyle, CtaStyleSelect } from './global/schema'
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

/**
 * `style_Look` real que le corresponde a cada tema — usado para resolver el
 * sentinel 'default' de global.ctaStyle (ver resolveCtaStyle). Pro/ProBlack y
 * los 6 pasteles gris100/beige100/beige150/rosa100/purpura100/celeste100
 * tienen una variante de `style_Look` con el MISMO nombre en
 * cta-template.html (pull 2026-09-02, "actualización del cta") — mapeo 1:1,
 * no una inferencia. verde100 y los 3 "oscuros/invertidos"
 * (darkneon/darkturbo/darkneutro) NO tienen variante propia todavía (el
 * maestro no la definió) — quedan fuera de este mapa y caen al fallback
 * general (ver resolveCtaStyle), igual que hoy.
 */
const STYLE_LOOK_FOR_THEME: Partial<Record<string, CtaStyle>> = {
  pro: 'pro',
  problack: 'problack',
  gris100: 'gris100',
  beige100: 'beige100',
  beige150: 'beige150',
  rosa100: 'rosa100',
  purpura100: 'purpura100',
  celeste100: 'celeste100',
}

/**
 * Fallback cuando el tema no tiene una variante propia de `style_Look` —
 * mismo valor que cta-template.html usa como default
 * (`{% assign style_Look = style_Look | default: 'neon' %}`).
 */
const FALLBACK_CTA_STYLE: CtaStyle = 'neon'

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

/**
 * El fondo del banner (banner.backgroundEnabled) viene activado por defecto
 * en el schema (true, el comportamiento de los temas no-pastel) — en pastel
 * el maestro documenta que el contenedor viene APAGADO por defecto (ver
 * components/banner/render.ts), así que el default correcto ahí es false.
 * Mismo patrón de "no tocado desde el tema anterior" que brand (NO el de
 * logoBackground, que siempre se fuerza): activar/desactivar el fondo
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

/**
 * Resuelve el sentinel 'default' de global.ctaStyle contra el tema actual —
 * llamado desde donde sea que se renderice un CTA (contentBlockRegistry.ts,
 * banner/items/render.ts#renderCtaInternoSnippet), no desde un useEffect: a
 * diferencia de brand/backgroundEnabled no hace falta trackear `prevTema` ni
 * "tocado a mano", porque 'default' es un valor EXPLÍCITO que el usuario
 * elige — se resuelve de nuevo en cada render sin ambigüedad. Cualquier otro
 * valor (un color elegido a mano) se devuelve tal cual, sin mirar el tema.
 */
export function resolveCtaStyle(ctaStyle: CtaStyleSelect, tema: string): CtaStyle {
  if (ctaStyle !== 'default') return ctaStyle
  return STYLE_LOOK_FOR_THEME[tema] ?? FALLBACK_CTA_STYLE
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

/**
 * El fondo del CONTENEDOR de un módulo de body (generalModuleFieldsSchema.backgroundEnabled)
 * es la dirección CONTRARIA de banner.backgroundEnabled: "viene por defecto
 * sin fondo, solo viene con fondo por defecto para el tema Pro y ProBlack"
 * (comentario literal de modulo-titulo.html) — 9 temas en `false`, 2 en `true`
 * (el banner es al revés: 9 en `true`, pastel en `false`). Mismo patrón de "no
 * tocado desde el tema anterior" que el resto de este archivo — el default del
 * schema (`false`, generalFields.ts) ya es el correcto para
 * defaultEmailDocument (arranca en 'beige100').
 */
function expectedModuleBackgroundEnabledForTema(tema: string): boolean {
  return tema === 'pro' || tema === 'problack'
}

/**
 * Análogo a bannerBackgroundEnabledForTheme, pero para UN campo suelto (no un
 * slot completo): el caller (App.tsx) lo llama por cada bloque de CONTENIDOS
 * que use el motor de módulos (`usesModuleItems`, ver contentBlockRegistry.ts),
 * pasando el `backgroundEnabled` actual de ESE bloque — no hay un
 * `defaultTitleFields.backgroundEnabled` único que sirva de referencia para
 * TODOS los bloques (cada instancia es independiente, a diferencia de
 * banner/header que son singletons), así que el "sin tocar" de un bloque
 * recién insertado se compara contra `false` (el default real del schema)
 * cuando `prevTema` es null, igual que el resto de este archivo.
 */
export function moduleBackgroundEnabledForTheme(current: boolean, tema: string, prevTema: string | null): boolean | null {
  const untouchedSincePrevTema = current === (prevTema === null ? false : expectedModuleBackgroundEnabledForTema(prevTema))
  if (!untouchedSincePrevTema) return null

  const backgroundEnabled = expectedModuleBackgroundEnabledForTema(tema)
  return backgroundEnabled !== current ? backgroundEnabled : null
}
