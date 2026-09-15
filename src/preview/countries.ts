/**
 * Los 9 países que el preview sabe simular vía `${user_id}` — hoja SIN
 * imports a propósito: `preview/liquidPreview.ts` (que originalmente los
 * declaraba) importa `template/assemble.ts` → `model.ts`, y `model.ts`
 * necesita esta lista para el schema de tropicalización
 * (`tropicalize/schema.ts`) — dejarlos en `liquidPreview.ts` cerraría un
 * ciclo de imports. Mismo motivo por el que `BannerItem` vive en
 * `components/banner/items/schemas.ts` y no en `model.ts` (ver la nota ahí).
 * Re-exportados desde `liquidPreview.ts` para que ningún import existente
 * tenga que cambiar.
 */
export const PREVIEW_COUNTRIES = ['AR', 'BR', 'CL', 'CO', 'CR', 'EC', 'MX', 'PE', 'UY'] as const
export type PreviewCountry = (typeof PREVIEW_COUNTRIES)[number]

export const PREVIEW_COUNTRY_LABELS: Record<PreviewCountry, string> = {
  AR: 'Argentina',
  BR: 'Brasil',
  CL: 'Chile',
  CO: 'Colombia',
  CR: 'Costa Rica',
  EC: 'Ecuador',
  MX: 'México',
  PE: 'Perú',
  UY: 'Uruguay',
}
