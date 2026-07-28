export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'email-builder:theme'

/** El tema visible ahora mismo: el atributo en <html> si ya se fijó (por el
 * script inline de index.html o por applyTheme), o si no, el del sistema. */
export function getEffectiveTheme(): Theme {
  const attr = document.documentElement.getAttribute('data-theme')
  if (attr === 'light' || attr === 'dark') return attr
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem(STORAGE_KEY, theme)
}
