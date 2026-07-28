import { z } from 'zod'

export const TIPO_KV_VALUES = ['Generico', 'Turbo', 'TurboSelecto', 'Neutro', 'Pro', 'ProBlack'] as const
export const TIPO_FOOTER_VALUES = ['General', 'SinAmor', 'RTS'] as const

export type TipoKv = (typeof TIPO_KV_VALUES)[number]
export type TipoFooter = (typeof TIPO_FOOTER_VALUES)[number]

export const footerSchema = z.object({
  tipoKv: z.enum(TIPO_KV_VALUES).default('Generico'),
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

export const TIPO_KV_LABELS: Record<TipoKv, string> = {
  Generico: 'Genérico',
  Turbo: 'Turbo',
  TurboSelecto: 'Turbo Selecto',
  Neutro: 'Neutro',
  Pro: 'Pro',
  ProBlack: 'Pro Black',
}
