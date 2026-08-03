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
const ASSIGN_RE = /\{%\s*assign\s+([a-z_0-9]+_mail_general)\s*=\s*'([^']*)'\s*%\}/g

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
 * Los 6 temas "pastel" — fondos siempre claros y suaves (ver GUIA-DE-TEMAS.md).
 * Exportado (a diferencia de PREMIUM_THEME_SLUGS) porque App.tsx también lo
 * necesita: al entrar a un tema pastel, el logo del header se resetea a su
 * versión de fondo claro — un logo "oscuro" (blanco) es casi invisible sobre
 * un fondo pastel.
 */
export const PASTEL_THEME_SLUGS = ['beige100', 'beige150', 'rosa100', 'purpura100', 'celeste100', 'verde100']

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
