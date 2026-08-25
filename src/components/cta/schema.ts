import { z } from 'zod'

/**
 * cta-template.html resuelve la alineación con `{% if 'left' %}…{% elsif
 * 'center' %}…{% else %}…{% endif %}` — la rama `{% else %}` trae EXACTAMENTE
 * el mismo `style="margin: 0 auto; ..."` que la rama `'center'`, así que
 * cualquier valor que no sea 'left' se ve idéntico a 'center'. No existe un
 * 'right' visualmente distinto — ofrecerlo sería engañoso.
 */
export const CTA_ALIGN_VALUES = ['left', 'center'] as const

export type CtaAlign = (typeof CTA_ALIGN_VALUES)[number]

export const CTA_ALIGN_LABELS: Record<CtaAlign, string> = {
  left: 'Izquierda',
  center: 'Centrado',
}

/**
 * Campos por instancia de CTA. El color/estilo del botón NO vive acá — es
 * `global.ctaStyle` (ver global/schema.ts), compartido por todas las
 * instancias a la vez (pedido explícito del usuario).
 *
 * `text_cta` se trunca a 35 caracteres DENTRO del content block
 * (`{% assign text_cta = text_cta | truncate: 35 %}` en cta-template.html) —
 * Liquid lo hace solo, tanto en Braze real como en el preview de la app (que
 * infla ese mismo content block). No se duplica esa lógica acá.
 */
export const ctaFieldsSchema = z.object({
  text: z.string().default('Pide ahora'),
  deeplink: z.string().default(''),
  align: z.enum(CTA_ALIGN_VALUES).default('center'),
})

export type CtaFields = z.infer<typeof ctaFieldsSchema>

export const defaultCtaFields: CtaFields = ctaFieldsSchema.parse({})
