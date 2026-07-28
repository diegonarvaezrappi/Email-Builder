// ============================================================================
// Temas del sistema. La lista NO está hardcodeada acá: se parsea de
// 01-foundations/global-styles/head-meta-tags.html (copiado a assets por
// scripts/sync-master.mjs), que es la única fuente de verdad de los temas
// — Regla de oro #4 del README del repo. Si David agrega un tema nuevo,
// aparece solo en la app.
//
// De cada tema nos interesa hoy una sola variable: color_footer_mail_general,
// que define el `font_style_look` del footer ('negro' en los 9 temas normales,
// 'pro' en Pro/ProBlack). Ver 06-docs/GUIA-DE-TEMAS.md.
// ============================================================================
import headMetaTagsRaw from '../assets/templates/head-meta-tags.html?raw'

/** Debe quedar sincronizado con THEME_BRANCH_RE de scripts/sync-master.mjs. */
const THEME_BRANCH_RE = /tema_general_mail_general\s*==\s*'([^']+)'/g
const COLOR_FOOTER_RE = /color_footer_mail_general\s*=\s*'([^']+)'/

export interface ThemeDef {
  /** Valor de `tema_general_mail_general` (ej. 'beige100', 'problack'). */
  slug: string
  /** Valor de `color_footer_mail_general` — el font_style_look del footer. */
  colorFooter: string
}

/**
 * Extrae los temas de head-meta-tags.html. Cada rama del
 * `{% if tema_general_mail_general == '...' %}` se toma hasta el inicio de la
 * siguiente, y dentro de ese trozo se busca su color_footer_mail_general.
 *
 * Exportada aparte de THEMES para poder testearla con fixtures sin depender
 * del estado actual del repo.
 */
export function parseThemes(headMetaHtml: string): ThemeDef[] {
  const branches = [...headMetaHtml.matchAll(THEME_BRANCH_RE)]
  return branches.map((branch, i) => {
    const chunk = headMetaHtml.slice(branch.index, branches[i + 1]?.index ?? headMetaHtml.length)
    return { slug: branch[1], colorFooter: COLOR_FOOTER_RE.exec(chunk)?.[1] ?? 'negro' }
  })
}

export const THEMES: ThemeDef[] = parseThemes(headMetaTagsRaw)

export const THEME_SLUGS: string[] = THEMES.map((t) => t.slug)

/** Primer tema del repo — el default del documento. */
export const DEFAULT_THEME = THEME_SLUGS[0] ?? 'beige100'

/**
 * `font_style_look` que le corresponde al footer según el tema. Si el tema no
 * existe (ej. un documento viejo en localStorage apuntando a un tema que David
 * borró), cae a 'negro', el valor por defecto de los content blocks.
 */
export function colorFooterForTheme(slug: string): string {
  return THEMES.find((t) => t.slug === slug)?.colorFooter ?? 'negro'
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
  { label: 'Pastel', slugs: ['beige100', 'beige150', 'rosa100', 'purpura100', 'celeste100', 'verde100'] },
  { label: 'Oscuros / invertidos', slugs: ['darkneon', 'darkturbo', 'darkneutro'] },
  { label: 'Premium', slugs: ['pro', 'problack'] },
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
