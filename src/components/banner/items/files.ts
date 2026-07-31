// ============================================================================
// Carga los 16 archivos reales de banner_moleculas/ (sincronizados por
// scripts/sync-master.mjs) vía import.meta.glob — mismo patrón que
// components/header/render.ts para los 40 archivos de headers/.
// ============================================================================
const rawBannerMoleculaFiles = import.meta.glob('../../../assets/templates/banners/banner_moleculas/*.html', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/** Devuelve el contenido crudo de un archivo de banner_moleculas/ por nombre
 *  (ej. 'molecula_promo_horizontal.html'). Throw si no se encontró — el
 *  archivo debe estar sincronizado, no es un caso "opcional". */
export function loadBannerMoleculaFile(fileName: string): string {
  const path = Object.keys(rawBannerMoleculaFiles).find((p) => p.endsWith(`/${fileName}`))
  if (!path) {
    throw new Error(`No se encontró banner_moleculas/${fileName} — ¿corriste "npm run sync-master"?`)
  }
  return rawBannerMoleculaFiles[path]
}
