import { z } from 'zod'

export const TIPO_FOOTER_VALUES = ['General', 'SinAmor', 'RTS'] as const

export type TipoFooter = (typeof TIPO_FOOTER_VALUES)[number]

/**
 * `firma` — footer_general.html/footer_sinamor.html (byte-idénticos en esta
 * sección) tienen su PROPIA variable `firma` (independiente de `font_style_look`,
 * y sin documentar en el archivo de referencia `06_footer/footer.html`, que
 * solo describe `cond`/`font_style_look`/`show_legal_*` — encontrada leyendo
 * el HTML real). Absorbe el rol que tenía la molécula de Cierre (retirada
 * 2026-09-07, pedido explícito del usuario: "elimina la molécula de cierre...
 * agrega un select Firma en el footer").
 *
 * Solo 3 valores reales — el resto de la resolución (CUÁL de las 4 variantes
 * "Rappi" o 6 "RappiTurbo" se muestra) la hace el propio content block según
 * `${user_id}` (Braze en un envío real; el selector "Vista previa (país)" de
 * la app en el preview) — no algo que la app pueda forzar, porque Footer es
 * un content block OPACO (nunca HTML inlineado como era Cierre): la app solo
 * puede influir vía los `{% assign %}` que emite, nunca reescribiendo su HTML:
 * - 'sin firma' (default): NO entra a ninguna rama de `firma` — el content
 *   block muestra su imagen por defecto (un bigote), salvo que
 *   `font_style_look == 'pro'` (Pro Y ProBlack, ver themes.ts#colorFooterForTheme),
 *   que la reemplaza por una corona.
 * - 'general': familia "Rappi" — 4 sub-variantes por país (AR/UY/CR, MX, BR,
 *   resto del mundo).
 * - 'turbo': familia "RappiTurbo" — 6 sub-variantes por país (CO con
 *   Carulla, EC con MiComisariato, MX, AR/UY/CR, BR, resto del mundo).
 *
 * `footer_rts.html` NO tiene esta variable en absoluto — el select se oculta
 * en el panel cuando Tipo de Footer = RTS, mismo criterio que los 3
 * checkboxes de legales.
 */
export const FOOTER_FIRMA_VALUES = ['sin firma', 'general', 'turbo'] as const

export type FooterFirma = (typeof FOOTER_FIRMA_VALUES)[number]

export const FOOTER_FIRMA_LABELS: Record<FooterFirma, string> = {
  'sin firma': 'Sin firma',
  general: 'Rappi',
  turbo: 'Turbo',
}

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
  firma: z.enum(FOOTER_FIRMA_VALUES).default('sin firma'),
})

export type FooterFields = z.infer<typeof footerSchema>

export const defaultFooterFields: FooterFields = footerSchema.parse({})

export const TIPO_FOOTER_LABELS: Record<TipoFooter, string> = {
  General: 'General',
  SinAmor: 'Sin amor',
  RTS: 'RTS',
}
