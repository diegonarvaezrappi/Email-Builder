import { z } from 'zod'

export const TIPO_FOOTER_VALUES = ['General', 'SinAmor', 'RTS'] as const

export type TipoFooter = (typeof TIPO_FOOTER_VALUES)[number]

/**
 * `firma` — footer_general.html/footer_sinamor.html (byte-idénticos en esta
 * sección) tienen su PROPIA variable `firma` (independiente de `font_style_look`).
 * Cuando se agregó este campo (2026-09-07) el archivo de referencia
 * `06_footer/footer.html` todavía no la documentaba (solo describía
 * `cond`/`font_style_look`/`show_legal_*`) — se encontró leyendo el HTML real
 * de footer_general/footer_sinamor. El pull del 2026-09-08 (commit `42ff0b2`,
 * "liquid del footer") por fin la documentó ahí, confirmando el diseño de
 * acá tal cual (los 3 valores + "para temas pro y problack" en el caso sin
 * firma), salvo por un detalle: el maestro documenta el literal como
 * `'sinfirma'` (sin espacio) — footer_general/footer_sinamor.html en sí
 * siguen con `| default: 'sin firma'` (CON espacio, un `{% assign %}` de
 * ejemplo que la app nunca usa: la app siempre emite un valor propio, nunca
 * deja `firma` sin asignar) — inconsistencia del propio maestro entre su
 * doc y su default de ejemplo, no algo para "corregir" ahí. Acá se sigue el
 * valor DOCUMENTADO ('sinfirma'), no el del `default:` de ejemplo.
 *
 * Absorbe el rol que tenía la molécula de Cierre (retirada 2026-09-07,
 * pedido explícito del usuario: "elimina la molécula de cierre... agrega un
 * select Firma en el footer").
 *
 * Solo 3 valores reales — el resto de la resolución (CUÁL de las 4 variantes
 * "Rappi" o 6 "RappiTurbo" se muestra) la hace el propio content block según
 * `${user_id}` (Braze en un envío real; el selector "Vista previa (país)" de
 * la app en el preview) — no algo que la app pueda forzar, porque Footer es
 * un content block OPACO (nunca HTML inlineado como era Cierre): la app solo
 * puede influir vía los `{% assign %}` que emite, nunca reescribiendo su HTML:
 * - 'sinfirma' (default): NO entra a ninguna rama de `firma` — el content
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
export const FOOTER_FIRMA_VALUES = ['sinfirma', 'general', 'turbo'] as const

export type FooterFirma = (typeof FOOTER_FIRMA_VALUES)[number]

export const FOOTER_FIRMA_LABELS: Record<FooterFirma, string> = {
  sinfirma: 'Sin firma',
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
  /**
   * `z.preprocess` en vez de un `z.enum` liso — mismo motivo que
   * `global/schema.ts`'s `ctaStyle`: el valor real cambió de `'sin firma'`
   * a `'sinfirma'` (2026-09-09, al alinear con el literal que el maestro
   * documentó en `42ff0b2`) DESPUÉS de que este campo ya se había shippeado
   * (`5b5e866`, 2026-09-07) — un documento guardado en localStorage con el
   * valor viejo no debe hacer que `safeParse` (persistence.ts) descarte el
   * documento COMPLETO al recargar, solo este campo puntual cae al default.
   */
  firma: z.preprocess(
    (v) => ((FOOTER_FIRMA_VALUES as readonly unknown[]).includes(v) ? v : 'sinfirma'),
    z.enum(FOOTER_FIRMA_VALUES),
  ).default('sinfirma'),
})

export type FooterFields = z.infer<typeof footerSchema>

export const defaultFooterFields: FooterFields = footerSchema.parse({})

export const TIPO_FOOTER_LABELS: Record<TipoFooter, string> = {
  General: 'General',
  SinAmor: 'Sin amor',
  RTS: 'RTS',
}
