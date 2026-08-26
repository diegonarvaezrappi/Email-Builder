// ============================================================================
// Los 3 mecanismos que `_contenidos_wrapper.html` documenta como IDÉNTICOS
// (mismos tokens Liquid literales) en TODO módulo de body — ver el comentario
// grande de ese archivo, leído directamente para el plan de fase 2 (ver
// [[project_body_modules_plan_2026-08-26]]):
//   - Alineado: text-align: {{body_alineado_molecular}} / margin: {{alineado_molecular_mail_body}}
//   - Fondo: background:{{bg_contenedor1_mail_general}}; border-radius: {{body_container_background_radius}}; padding: {{body_container_background_padding}};
//   - Clickable: <a href="LINKMODULO">…</a>, apagado por defecto (unwrap, no wrap nuevo)
//
// `generalModuleFieldsSchema` se spreadea dentro del schema propio de cada
// módulo nuevo — EXCEPTO Cupones, cuyo maestro dice EXPLÍCITO Y DOS VECES que
// fondo/alineado NO son togglables ahí (ver el plan, riesgo #1): ese módulo,
// cuando exista, no la spreadea.
// ============================================================================
import { z } from 'zod'

export const MODULE_ALIGN_VALUES = ['left', 'center'] as const
export type ModuleAlign = (typeof MODULE_ALIGN_VALUES)[number]
export const MODULE_ALIGN_LABELS: Record<ModuleAlign, string> = {
  left: 'Izquierda',
  center: 'Centrado',
}

/**
 * `backgroundEnabled` NO tiene un default único razonable a nivel de schema:
 * el maestro documenta "por defecto sin fondo, con fondo solo en Pro/ProBlack"
 * (comentario literal de modulo-titulo.html, y por lo visto en head-meta-tags.html
 * el mecanismo es genérico a cualquier módulo que use body_container_background) —
 * mismo patrón que bannerSchema.backgroundEnabled, cuyo default real por tema
 * lo fija themeDefaults.ts (moduleBackgroundEnabledForTheme) vía el efecto de
 * cambio de tema en App.tsx, no acá. El default `false` de abajo es el que
 * corresponde a los 9 temas no-Pro/ProBlack — correcto para
 * defaultEmailDocument (que arranca en 'beige100').
 */
export const generalModuleFieldsSchema = z.object({
  linkEnabled: z.boolean().default(false),
  link: z.string().default(''),
  backgroundEnabled: z.boolean().default(false),
  align: z.enum(MODULE_ALIGN_VALUES).default('left'),
})
export type GeneralModuleFields = z.infer<typeof generalModuleFieldsSchema>
export const defaultGeneralModuleFields: GeneralModuleFields = generalModuleFieldsSchema.parse({})
