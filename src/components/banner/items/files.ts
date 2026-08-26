// ============================================================================
// Carga los 19 archivos reales de banner_moleculas/ (sincronizados por
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

/**
 * Igual que loadBannerMoleculaFile, pero para content_moleculas/ — hoy solo
 * sirve molecula_franja_logos.html: la pieza FRANJA_LOGOS es una "molécula
 * compartida" banner+body (pedido explícito del usuario, ver la sección B del
 * plan de nuevos módulos de contenido, [[project_body_modules_plan_2026-08-26]]),
 * así que su primer consumidor real es una pieza de banner aunque el archivo
 * maestro viva en content-modules/ — ver scripts/sync-master.mjs
 * (CONTENT_MOLECULAS_FILES_TO_COPY).
 */
const rawContentMoleculaFiles = import.meta.glob('../../../assets/templates/content-modules/content_moleculas/*.html', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

export function loadContentMoleculaFile(fileName: string): string {
  const path = Object.keys(rawContentMoleculaFiles).find((p) => p.endsWith(`/${fileName}`))
  if (!path) {
    throw new Error(`No se encontró content_moleculas/${fileName} — ¿corriste "npm run sync-master"?`)
  }
  return rawContentMoleculaFiles[path]
}
