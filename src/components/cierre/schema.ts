import { z } from 'zod'

/**
 * Las 10 variantes conocidas de imagen de cierre, tomadas de la Taxonomía de
 * Assets (Google Sheets) que el repo no expone en ningún archivo — ver
 * 05-docs/USO-DE-CADA-PARTE.md §9, regla #3. No es texto libre a propósito:
 * el usuario pidió una lista fija, ampliable a mano cuando haya más filas.
 */
export const CIERRE_VARIANT_VALUES = [
  'rappi-pide',
  'rappi-pedi',
  'rappi-pidelo-mx',
  'rappi-pede-pt',
  'turbo-pide',
  'turbo-pidelo-mx',
  'turbo-pedi',
  'turbo-pide-carulla',
  'turbo-pide-micomisariato',
  'turbo-pede-pt',
] as const

export type CierreVariant = (typeof CIERRE_VARIANT_VALUES)[number]

interface CierreVariantInfo {
  familia: string
  texto: string
  url: string
}

export const CIERRE_VARIANT_INFO: Record<CierreVariant, CierreVariantInfo> = {
  'rappi-pide': {
    familia: 'Rappi',
    texto: 'Pide un Rappi',
    url: 'https://lh3.googleusercontent.com/d/1uXDc5UOBORQmPiS-fav5iJQwQMy8KbJi',
  },
  'rappi-pedi': {
    familia: 'Rappi',
    texto: 'Pedí un Rappi',
    url: 'https://lh3.googleusercontent.com/d/1OjjCUGpJkErIll85wuNPnScv7xaIJC2U',
  },
  'rappi-pidelo-mx': {
    familia: 'Rappi',
    texto: 'Pídelo por Rappi mx',
    url: 'https://lh3.googleusercontent.com/d/1XYWhQr9gm2EKabK2_YHoYCtxG9YUYEbX',
  },
  'rappi-pede-pt': {
    familia: 'Rappi',
    texto: 'Pede um Rappi',
    url: 'https://lh3.googleusercontent.com/d/19Ij8uZN9yQ1I4-4cOIBo583KmDfnPcKc',
  },
  'turbo-pide': {
    familia: 'RappiTurbo',
    texto: 'Pide un RappiTurbo',
    url: 'https://lh3.googleusercontent.com/d/1gGDpCIil0rP0l25pc0n8b3uZMIWoXxlO',
  },
  'turbo-pidelo-mx': {
    familia: 'RappiTurbo',
    texto: 'Pídelo por RappiTurbo mx',
    url: 'https://lh3.googleusercontent.com/d/1XEJYDiQV5X9kKYrCwDKHfllOedor3dU3',
  },
  'turbo-pedi': {
    familia: 'RappiTurbo',
    texto: 'Pedí un RappiTurbo',
    url: 'https://lh3.googleusercontent.com/d/1ye7JyRDZDz9iIkZLLT7fkL3dEX2UIhGw',
  },
  'turbo-pide-carulla': {
    familia: 'RappiTurbo',
    texto: 'Pide un RappiTurbo + Carulla',
    url: 'https://lh3.googleusercontent.com/d/1OytxlcxaHB0F3JJ07TW0DIs95GpS_FYq',
  },
  'turbo-pide-micomisariato': {
    familia: 'RappiTurbo',
    texto: 'Pide un RappiTurbo + MiComisariato',
    url: 'https://lh3.googleusercontent.com/d/16SwlZXMeKb5tek9u5-HxLlInIMhGupCX',
  },
  'turbo-pede-pt': {
    familia: 'RappiTurbo',
    texto: 'Pede um RappiTurbo',
    url: 'https://lh3.googleusercontent.com/d/1gekH3zsdMvSvW6VhQ4WTbdHqxnTlmmmL',
  },
}

/** Etiqueta del <option>: "Familia — texto", ej. "Rappi — Pide un Rappi". */
export const CIERRE_VARIANT_LABELS: Record<CierreVariant, string> = CIERRE_VARIANT_VALUES.reduce(
  (labels, variant) => {
    const { familia, texto } = CIERRE_VARIANT_INFO[variant]
    labels[variant] = `${familia} — ${texto}`
    return labels
  },
  {} as Record<CierreVariant, string>,
)

export const cierreSchema = z.object({
  variant: z.enum(CIERRE_VARIANT_VALUES).default('rappi-pide'),

  /**
   * Borrado manual desde el Viewport. Independiente de las reglas de
   * auto-ocultado (tema Pro/ProBlack, Footer RTS — ver render.ts): esas se
   * evalúan primero sin importar este flag; esto es solo "el usuario lo sacó
   * a mano" y se restaura arrastrando el componente desde el panel de
   * componentes (ver ui/LibraryPanel.tsx).
   */
  removed: z.boolean().default(false),
})

export type CierreFields = z.infer<typeof cierreSchema>

export const defaultCierreFields: CierreFields = cierreSchema.parse({})
