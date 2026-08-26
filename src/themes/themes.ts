// ============================================================================
// Temas del sistema. La lista NO está hardcodeada acá: se parsea de
// 01-foundations/global-styles/head-meta-tags.html (copiado a assets por
// scripts/sync-master.mjs), que es la única fuente de verdad de los temas
// — Regla de oro #4 del README del repo. Si David agrega un tema nuevo,
// aparece solo en la app.
//
// De cada tema se extraen TODAS sus variables (`bg_solid_mail_general`,
// `color_texto_mail_general`, …, `color_footer_mail_general`), porque el HTML
// final las lleva ya resueltas: ver themes/inlineTheme.ts.
// Ver 06-docs/GUIA-DE-TEMAS.md para qué controla cada una.
// ============================================================================
import headMetaTagsRaw from '../assets/templates/head-meta-tags.html?raw'

/** Debe quedar sincronizado con THEME_BRANCH_RE de scripts/sync-master.mjs. */
const THEME_BRANCH_RE = /tema_general_mail_general\s*==\s*'([^']+)'/g

/**
 * La convención del repo es que las variables de tema terminan en
 * `_mail_general` — pero `bg_solid_generico100_mail_body` es una excepción
 * real: se define UNA vez por cada una de las 11 ramas de tema (mismo lugar,
 * mismo patrón que cualquier `_mail_general`, confirmado línea por línea en
 * head-meta-tags.html), solo que con el sufijo `_mail_body` porque el repo la
 * agrupa con las variables de "contenido"/CTA en vez de las de banner/header.
 * Se agrega por NOMBRE EXACTO (no ampliando el sufijo a todo `_mail_body`) a
 * propósito: hay otras `_mail_body` en el archivo (ej.
 * `alineado_molecular_mail_body`) que NO viven dentro de las ramas de tema
 * — son parte de un `{% if %}` de ejemplo distinto, y ampliar el sufijo las
 * capturaría igual, ensuciando el tema que las absorba (mismo riesgo ya
 * documentado para variables de ejemplo fuera de rama, ver el comentario de
 * `problack` en [[project_master_upstream_state]]). Si el día de mañana se
 * necesita otra variable `_mail_body`, agregarla acá a mano, con el mismo
 * cuidado (confirmar que aparece exactamente 1 vez POR rama).
 */
export const EXTRA_THEME_VAR_NAMES = [
  'bg_solid_generico100_mail_body',
  // Las 2 que consume el deal (components/deals/render.ts), verificadas con el
  // mismo criterio: 1 assign por cada una de las 11 ramas, ninguno fuera de
  // rama. `coronapro_mail_body` es el ícono de corona del badge de descuento
  // (2 valores reales: uno para los 9 temas pastel/oscuros, el dorado para
  // Pro/ProBlack). `body_container_background_radius-peq` es el radio chico del
  // contenedor del deal — y es el único caso en todo el archivo con un GUIÓN en
  // el nombre de la variable, así que no lo capturaría ni el sufijo
  // `_mail_general` ni una ampliación a `_mail_body`: tiene que ir por nombre
  // exacto. Hoy vale ' 8px' en los 11 temas, pero se lee del archivo igual (si
  // el repo lo diferencia por tema, sale gratis).
  'coronapro_mail_body',
  'body_container_background_radius-peq',
  /**
   * Las 5 que necesita la fase 1 del plan de nuevos módulos de contenido
   * (ver [[project_body_modules_plan_2026-08-26]]): ninguna pieza de HOY las
   * usa todavía (ni banner ni deals), pero módulos futuros (Título, Cupones,
   * Link interno, etc.) sí, y sin agregarlas acá cualquier
   * `{{body_container_background_radius}}` que trajeran sus renders quedaría
   * como Liquid crudo en el HTML exportado — mismo riesgo ya documentado para
   * el resto de esta lista.
   *
   * OJO — las 3 `body_container_background_*` son un caso distinto al resto
   * de esta lista: verificado línea por línea que aparecen DOS veces por rama
   * de tema (no una), porque el maestro las asigna primero con el valor "con
   * fondo" y las PISA después dentro de un `{% if body_container_background
   * == 'Sinfondo' %}` con el valor "sin fondo" (0px/transparente) — nunca hay
   * un `{% else %}` que reponga el primer valor. El parseo de acá no entiende
   * `{% if %}` (solo escanea `{% assign %}` en orden y el último gana), así
   * que `themeVars(tema)` de HOY solo puede devolver la variante "sin fondo".
   * Servir la variante "con fondo" (para un futuro toggle de fondo estilo
   * `BANNER_BACKGROUND_OFF_VARS`) es trabajo de una fase posterior — acá solo
   * se agregan los nombres para que ambas variantes dejen de colarse como
   * Liquid sin resolver.
   */
  'body_container_background_radius',
  'body_container_background_padding',
  'body_container_background_border',
  /**
   * Las 2 que necesita la futura molécula "Link interno" (`content_moleculas/
   * molecula_link_interno.html`) — a diferencia de las 3 de arriba, estas SÍ
   * aparecen una sola vez por rama, sin `{% if %}` alrededor.
   */
  'bg_solid_generico50_mail_body',
  'icon_link_generico_mail_body',
]
const ASSIGN_RE = new RegExp(
  `\\{%\\s*assign\\s+([a-z_0-9]+_mail_general|${EXTRA_THEME_VAR_NAMES.join('|')})\\s*=\\s*'([^']*)'\\s*%\\}`,
  'g',
)

export interface ThemeDef {
  /** Valor de `tema_general_mail_general` (ej. 'beige100', 'problack'). */
  slug: string
  /** Todas las variables que asigna la rama del tema, por nombre. */
  vars: Record<string, string>
}

/**
 * Extrae los temas de head-meta-tags.html. Cada rama del
 * `{% if tema_general_mail_general == '...' %}` se toma hasta el inicio de la
 * siguiente, y dentro de ese trozo se leen todos sus `{% assign %}`.
 *
 * Exportada aparte de THEMES para poder testearla con fixtures sin depender
 * del estado actual del repo.
 */
export function parseThemes(headMetaHtml: string): ThemeDef[] {
  const branches = [...headMetaHtml.matchAll(THEME_BRANCH_RE)]
  return branches.map((branch, i) => {
    const chunk = headMetaHtml.slice(branch.index, branches[i + 1]?.index ?? headMetaHtml.length)
    const vars: Record<string, string> = {}
    for (const [, name, value] of chunk.matchAll(ASSIGN_RE)) vars[name] = value
    return { slug: branch[1], vars }
  })
}

export const THEMES: ThemeDef[] = parseThemes(headMetaTagsRaw)

/**
 * Las 5 variables que el maestro asigna DOS veces por rama de tema — primero
 * el valor "con fondo" (el real del tema), después PISADO dentro de
 * `{% if body_container_background == 'Sinfondo' %} ... {% endif %}` (sin
 * `{% else %}`) por el valor "sin fondo" (0px/transparente). Verificado línea
 * por línea en head-meta-tags.html para las 12 ramas: SIEMPRE en ese orden
 * (primero "con fondo", después "sin fondo"), nunca al revés.
 *
 * `parseThemes`/`themeVars` (arriba) escanean `{% assign %}` en orden de
 * aparición y se quedan con el ÚLTIMO — así que para estas 5 variables
 * siempre devuelven la variante "sin fondo", nunca la "con fondo". Eso alcanza
 * para `bg_solid_generico100_mail_body` y compañía (un solo valor real por
 * tema, sin toggle), pero NO para el fondo de los módulos de body (fase 2 del
 * plan de nuevos módulos de contenido, [[project_body_modules_plan_2026-08-26]]):
 * ese toggle necesita AMBAS variantes para poder mostrar la que corresponda
 * según `backgroundEnabled` — ver `moduleBackgroundVarsForTheme` y
 * `components/contentModules/generalRender.ts` (moduleBackgroundVars, que
 * arma el mismo tipo de mapa de overrides que ya usa
 * `components/banner/render.ts` con `BANNER_BACKGROUND_OFF_VARS`).
 *
 * `bg_contenedor1_mail_general` entra acá aunque YA termine en `_mail_general`
 * (y por lo tanto ya lo capture themeVars() normal): sufre exactamente el
 * mismo problema (siempre "sin fondo"/transparente vía el mecanismo genérico),
 * así que necesita el mismo tratamiento especial. Ningún render ya
 * implementado la usa todavía (verificado — solo vive en el asset sincronizado
 * sin consumidor en src/), así que exponer acá su valor real no es una
 * regresión de nada existente.
 *
 * `img_fondo_especial_mail_general` se sumó en la fase 3 (Beneficios, ver
 * [[project_body_modules_plan_2026-08-26]]): modulo-beneficios.html pinta
 * `background-image: url({{img_fondo_especial_mail_general}})` en el `<tr>`
 * que envuelve sus 2 celdas, y ESA variable sufre exactamente el mismo doble-
 * assign (verificado línea por línea en las 12 ramas: "con fondo" trae una
 * imagen real distinta por tema, "sin fondo" siempre el mismo placeholder
 * genérico `.../1_q4ca1b7DkKOGnFqwVfKMTFTmhMp0E2A`) — sin este agregado,
 * components/benefits/render.ts habría mostrado SIEMPRE el placeholder "sin
 * fondo", ignorando el toggle. Ningún otro consumidor la usa hoy (confirmado
 * por grep), así que sumarla acá no cambia nada existente.
 */
export const MODULE_BACKGROUND_VAR_NAMES = [
  'bg_contenedor1_mail_general',
  'body_container_background_radius',
  'body_container_background_padding',
  'body_container_background_border',
  'img_fondo_especial_mail_general',
] as const

export interface ModuleBackgroundVars {
  /** Valores cuando el fondo del módulo está ACTIVADO (la 1ra asignación de cada rama). */
  on: Record<string, string>
  /** Valores cuando está DESACTIVADO (la 2da, dentro del `{% if Sinfondo %}`) — coincide con lo que ya devuelve themeVars() para estos 4 nombres. */
  off: Record<string, string>
}

/**
 * Extrae AMBAS variantes de las 4 variables de MODULE_BACKGROUND_VAR_NAMES,
 * por tema. Reusa THEME_BRANCH_RE para cortar las mismas ramas que
 * parseThemes, pero por cada nombre busca las 2 apariciones dentro de la rama
 * en vez de quedarse con la última — la 1ra es "con fondo", la 2da "sin
 * fondo" (orden verificado, ver el comentario de MODULE_BACKGROUND_VAR_NAMES).
 * Si alguna rama no trae las 2 apariciones de un nombre (el maestro cambió la
 * estructura), esa variante queda ausente del mapa — moduleBackgroundVars en
 * generalRender.ts decide el fallback, acá no se aborta: mismo criterio de
 * "avisar, no romper el sync" que el resto de themes.ts.
 */
export function parseModuleBackgroundVars(headMetaHtml: string): Record<string, ModuleBackgroundVars> {
  const branches = [...headMetaHtml.matchAll(THEME_BRANCH_RE)]
  const result: Record<string, ModuleBackgroundVars> = {}
  branches.forEach((branch, i) => {
    const chunk = headMetaHtml.slice(branch.index, branches[i + 1]?.index ?? headMetaHtml.length)
    const on: Record<string, string> = {}
    const off: Record<string, string> = {}
    for (const name of MODULE_BACKGROUND_VAR_NAMES) {
      const re = new RegExp(`\\{%\\s*assign\\s+${name}\\s*=\\s*'([^']*)'\\s*%\\}`, 'g')
      const matches = [...chunk.matchAll(re)]
      if (matches[0]) on[name] = matches[0][1]
      if (matches[1]) off[name] = matches[1][1]
    }
    result[branch[1]] = { on, off }
  })
  return result
}

export const MODULE_BACKGROUND_VARS: Record<string, ModuleBackgroundVars> = parseModuleBackgroundVars(headMetaTagsRaw)

/** `{ on: {}, off: {} }` para un tema inexistente — mismo criterio que themeVars(). */
export function moduleBackgroundVarsForTheme(tema: string): ModuleBackgroundVars {
  return MODULE_BACKGROUND_VARS[tema] ?? { on: {}, off: {} }
}

export const THEME_SLUGS: string[] = THEMES.map((t) => t.slug)

/** Primer tema del repo — el default del documento. */
export const DEFAULT_THEME = THEME_SLUGS[0] ?? 'beige100'

/**
 * Variables del tema, listas para inyectar en el HTML. Incluye
 * `tema_general_mail_general` (el propio slug) para que una referencia a él
 * también quede resuelta. Un tema inexistente devuelve {} — ver
 * resolveThemeVars, que trata lo no definido como vacío, igual que Liquid.
 */
export function themeVars(slug: string): Record<string, string> {
  const theme = THEMES.find((t) => t.slug === slug)
  if (!theme) return {}
  return { ...theme.vars, tema_general_mail_general: theme.slug }
}

/**
 * Los 2 temas "premium" — Pro y ProBlack. Vive acá (y no solo en THEME_GROUPS,
 * más abajo) porque colorFooterForTheme también lo necesita como fallback.
 */
const PREMIUM_THEME_SLUGS = ['pro', 'problack']

/**
 * Los 7 temas "pastel" — fondos siempre claros y suaves (ver GUIA-DE-TEMAS.md).
 * Exportado (a diferencia de PREMIUM_THEME_SLUGS) porque App.tsx también lo
 * necesita: al entrar a un tema pastel, el logo del header se resetea a su
 * versión de fondo claro — un logo "oscuro" (blanco) es casi invisible sobre
 * un fondo pastel.
 *
 * `gris100` se sumó en el pull del 2026-08-09: GUIA-DE-TEMAS.md y
 * 01-foundations/README.md lo describen EXPLÍCITAMENTE como "séptimo tema
 * pastel" (no es una inferencia de acá) — tono neutro sin dorado, "la vía
 * media entre los pasteles de color y los premium". Confirmado también por
 * cómo se comporta en head-meta-tags.html: `bg_bannertono_mail_general`
 * transparente + `padd_banner_mail_general: '0px 0px'`, el mismo patrón de
 * "fondo de banner apagado por defecto" que ya tienen los otros 6 pasteles.
 */
export const PASTEL_THEME_SLUGS = ['beige100', 'beige150', 'rosa100', 'purpura100', 'celeste100', 'verde100', 'gris100']

/**
 * Los 3 temas "oscuros / invertidos" — fondo oscuro por defecto (ver
 * GUIA-DE-TEMAS.md). Exportado por la misma razón que PASTEL_THEME_SLUGS:
 * App.tsx (vía themeDefaults.ts) fuerza el logo del header a su versión de
 * fondo oscuro al entrar a cualquiera de estos 3 — mismo criterio de
 * legibilidad que el de pastel, en la dirección opuesta.
 */
export const DARK_THEME_SLUGS = ['darkneon', 'darkturbo', 'darkneutro']

/**
 * `font_style_look` que le corresponde al footer según el tema.
 *
 * Si el tema no existe (ej. un documento viejo en localStorage apuntando a un
 * tema que David borró) o si el tema existe pero no define
 * `color_footer_mail_general`, cae al fallback por grupo: 'pro' en Pro/
 * ProBlack, 'negro' en el resto.
 *
 * Ese segundo caso pasa AHORA MISMO con los 11 temas reales del repo: en la
 * reestructuración de headers/banners a moléculas, `color_footer_mail_general`
 * se borró de las 11 ramas de head-meta-tags.html sin reemplazo (parece un
 * accidente de edición — 02-components/README.md, GUIA-DE-TEMAS.md,
 * COMO-ARMAR-UN-MAIL.md y CHANGELOG.md siguen describiéndolo como el
 * mecanismo vigente, y ninguno se actualizó). scripts/sync-master.mjs avisa
 * por consola en vez de abortar el sync — así que el fallback de acá reproduce
 * el mismo valor documentado (pro en Pro/ProBlack) para que el estilo del
 * footer no se rompa mientras la variable no vuelva a existir en el repo. El
 * día que vuelva, este fallback deja de usarse solo (siempre se prefiere el
 * valor real del tema).
 */
export function colorFooterForTheme(slug: string): string {
  const value = THEMES.find((t) => t.slug === slug)?.vars.color_footer_mail_general
  return value ?? (PREMIUM_THEME_SLUGS.includes(slug) ? 'pro' : 'negro')
}

// --- Presentación (solo UI) ---------------------------------------------------
// Los nombres bonitos y los grupos viven acá porque el repo no los expresa de
// forma parseable (están en prosa en 06-docs/GUIA-DE-TEMAS.md). Un tema que no
// esté en estos mapas igual se muestra, usando su slug crudo.

const THEME_LABELS: Record<string, string> = {
  beige100: 'Beige 100',
  beige150: 'Beige 150',
  rosa100: 'Rosa 100',
  purpura100: 'Púrpura 100',
  celeste100: 'Celeste 100',
  verde100: 'Verde 100',
  gris100: 'Gris 100',
  darkneon: 'Dark neon',
  darkturbo: 'Dark Turbo',
  darkneutro: 'Dark Neutro',
  pro: 'Pro',
  problack: 'ProBlack',
}

const THEME_GROUPS: { label: string; slugs: string[] }[] = [
  { label: 'Pastel', slugs: PASTEL_THEME_SLUGS },
  { label: 'Oscuros / invertidos', slugs: DARK_THEME_SLUGS },
  { label: 'Premium', slugs: PREMIUM_THEME_SLUGS },
]

export function themeLabel(slug: string): string {
  return THEME_LABELS[slug] ?? slug
}

/**
 * Los temas agrupados para el `<select>`, en el orden de THEME_GROUPS. Los
 * temas del repo que no estén en ningún grupo conocido se juntan al final bajo
 * "Otros", para que un tema nuevo nunca quede invisible en la UI.
 */
export function groupedThemes(): { label: string; themes: ThemeDef[] }[] {
  const grouped = THEME_GROUPS.map((g) => ({
    label: g.label,
    themes: g.slugs.map((s) => THEMES.find((t) => t.slug === s)).filter((t): t is ThemeDef => t !== undefined),
  })).filter((g) => g.themes.length > 0)

  const known = new Set(THEME_GROUPS.flatMap((g) => g.slugs))
  const rest = THEMES.filter((t) => !known.has(t.slug))
  return rest.length > 0 ? [...grouped, { label: 'Otros', themes: rest }] : grouped
}
