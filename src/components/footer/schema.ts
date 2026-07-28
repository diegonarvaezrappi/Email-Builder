import { z } from 'zod'

export const TIPO_FOOTER_VALUES = ['General', 'SinAmor', 'RTS'] as const

export type TipoFooter = (typeof TIPO_FOOTER_VALUES)[number]

// NOTA: "Tipo de Kv" ya no existe. El repo eliminó el concepto de KV
// (commit 68bc9a1 borró 04-variants/kv-types/, 3337719 reemplazó
// GUIA-DE-KVS.md por GUIA-DE-TEMAS.md) y lo sustituyó por el tema, que ahora
// es un ajuste global — ver src/global/schema.ts. El font_style_look del
// footer se deriva del tema, no de un campo propio del footer.
export const footerSchema = z.object({
  tipoFooter: z.enum(TIPO_FOOTER_VALUES).default('General'),
  legalesAdicionales: z.string().default(''),
  legalPromos: z.boolean().default(false),
  legalTurbo: z.boolean().default(false),
  legalLicores: z.boolean().default(false),
})

export type FooterFields = z.infer<typeof footerSchema>

export const defaultFooterFields: FooterFields = footerSchema.parse({})

export const TIPO_FOOTER_LABELS: Record<TipoFooter, string> = {
  General: 'General',
  SinAmor: 'Sin amor',
  RTS: 'RTS',
}
