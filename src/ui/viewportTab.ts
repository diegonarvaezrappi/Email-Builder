/**
 * Las 4 pestañas del panel central. Vive en su propio módulo (no en
 * Viewport.tsx, donde nació) porque `tab` se sube a App.tsx — el país
 * seleccionado y la pestaña activa las necesitan tanto el panel central como
 * el derecho (Preview ↔ Tropicalizar comparten el mismo `country`, y el panel
 * de Tropicalizar necesita saber si está activo para renderizar) — mismo
 * criterio que sacar `BannerItem` a su propio archivo para evitar un ciclo de
 * imports (ver la nota en model.ts).
 */
export type ViewportTab = 'preview' | 'tropicalize' | 'code' | 'import'

export const VIEWPORT_TAB_ORDER: readonly ViewportTab[] = ['preview', 'tropicalize', 'code', 'import']

export const VIEWPORT_TAB_LABELS: Record<ViewportTab, string> = {
  preview: 'Preview',
  tropicalize: 'Tropicalizar',
  code: 'Exportar',
  import: 'Importar',
}
