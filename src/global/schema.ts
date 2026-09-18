import { z } from 'zod'
import { DEFAULT_THEME, THEME_SLUGS } from '../themes/themes'
import { BACKGROUND_POSITION_VALUES, BACKGROUND_REPEAT_VALUES, BACKGROUND_SIZE_VALUES } from './background'

/**
 * Los 15 valores reales de `style_Look` en 02-components/03_ctas/cta-template.html
 * (leído del `{% if/elsif %}` completo). Nota: 'blanconeon' y 'blanco' son
 * ramas byte-idénticas en el archivo real (mismo color/imagen) — no es un bug
 * de esta app, se exponen ambas igual, como ya se hizo con las 10 variantes
 * de Cierre. Las últimas 6 (gris100…celeste100) se agregaron en el pull del
 * 2026-09-02 ("actualización del cta") — coinciden 1:1 con el slug de 6 de
 * los 7 temas pastel (todos menos verde100, que no tiene variante propia de
 * `style_Look` — ver STYLE_LOOK_FOR_THEME en themeDefaults.ts).
 */
export const CTA_STYLE_VALUES = [
  'neon',
  'blanconeon',
  'blanco',
  'negroneon',
  'verde',
  'problack',
  'pro',
  'blancogris',
  'negrogris',
  'gris100',
  'beige100',
  'beige150',
  'rosa100',
  'purpura100',
  'celeste100',
] as const

export type CtaStyle = (typeof CTA_STYLE_VALUES)[number]

export const CTA_STYLE_LABELS: Record<CtaStyle, string> = {
  neon: 'Neon (rojo Rappi)',
  blanconeon: 'Blanco neon',
  blanco: 'Blanco',
  negroneon: 'Negro neon',
  verde: 'Verde',
  problack: 'ProBlack',
  pro: 'Pro',
  blancogris: 'Blanco gris',
  negrogris: 'Negro gris',
  gris100: 'Gris 100',
  beige100: 'Beige 100',
  beige150: 'Beige 150',
  rosa100: 'Rosa 100',
  purpura100: 'Púrpura 100',
  celeste100: 'Celeste 100',
}

/**
 * Valores elegibles a mano desde el select de color de CTA — el sentinel
 * `'default'` (ver más abajo) + un subconjunto reducido de 4 colores reales
 * (pedido explícito del usuario, 2026-09-03: "limita el select... a Default,
 * Neon, Blanco, Negro Gris, Verde"). El resto de CTA_STYLE_VALUES (pro,
 * problack, gris100, beige100, beige150, rosa100, purpura100, celeste100,
 * blanconeon, negroneon, blancogris) SIGUE existiendo como salida real de
 * `style_Look` — STYLE_LOOK_FOR_THEME (themeDefaults.ts) los sigue usando
 * para resolver 'default' en esos temas — solo dejan de ser elegibles a
 * mano acá.
 *
 * `'default'` NO es un `style_Look` que exista en cta-template.html —
 * significa "seguir al tema actual", resuelto recién al renderizar (ver
 * themeDefaults.ts#resolveCtaStyle). Reemplaza el mecanismo anterior de
 * "pisar mientras el usuario no lo haya tocado a mano": ahora es un valor
 * EXPLÍCITO que el usuario puede volver a elegir en cualquier momento, y
 * cualquier otro valor del select queda fijo pase lo que pase con el tema.
 */
export const CTA_STYLE_SELECT_VALUES = ['default', 'neon', 'blanco', 'negrogris', 'verde'] as const

export type CtaStyleSelect = (typeof CTA_STYLE_SELECT_VALUES)[number]

export const CTA_STYLE_SELECT_LABELS: Record<CtaStyleSelect, string> = {
  default: 'Default',
  neon: 'Neon',
  blanco: 'Blanco',
  negrogris: 'Negro Gris',
  verde: 'Verde',
}

/**
 * Ajustes que afectan a TODO el email (no a un componente puntual). Hoy solo
 * el tema; acá entrarán los demás globales cuando se implementen más slots.
 *
 * `tema` se valida contra los temas que realmente existen en el repo (no una
 * lista fija): así un documento guardado en localStorage que apunte a un tema
 * que David borró se descarta al cargar en vez de generar Liquid roto.
 */
export const globalSchema = z.object({
  tema: z
    .string()
    .refine((s) => THEME_SLUGS.includes(s), { message: 'Tema desconocido (no existe en head-meta-tags.html)' })
    .default(DEFAULT_THEME),

  /**
   * Imagen de fondo del mail: alimenta `bg_imgevento_mail_general`, la variable
   * del `<td class="fondomobile">` del maestro. Es la única variable
   * `_mail_general` que el repo referencia pero ningún tema asigna, así que sin
   * esto siempre sale vacía. Vacío = sin fondo (el comportamiento de hoy).
   *
   * Se acepta cualquier texto (una URL, o Liquid como
   * `{{content_blocks.${...}}}`); lo que rompería el `url(...)` se escapa al
   * generar — ver cssUrlValue en global/vars.ts.
   */
  fondoUrl: z.string().default(''),

  /**
   * Alt de fondoUrl — pinta un `background-image: url(...)` (el `<td
   * class="fondomobile">` de arriba), sin un atributo `alt` nativo, así que se
   * expone como `role="img" aria-label="..."` en ese mismo `<td>` (ver
   * template/assemble.ts), solo cuando hay imagen — vacío = sin fondo = sin
   * aria-label tampoco, mismo criterio que fondoUrl. Sin valor de fábrica que
   * reproducir (ningún tema asigna esta variable), default elegido por la
   * app. Pedido explícito del usuario 2026-09-09: "para todas las imagenes
   * que son agregadas como fondo, tambien agregales un campo ALT".
   */
  fondoAlt: z.string().default('Imagen de fondo'),

  /**
   * Tamaño/posición/repeat del `background-image` de arriba (fondoUrl) —
   * pedido explícito del usuario (2026-09-16), aplicado a los 3 fondos del
   * mail (General acá, HERO/CONTENTS más abajo). Defaults = el CSS que el
   * maestro ya trae hardcodeado en el `<td class="fondomobile">`
   * (template_base.html): así un documento que nunca toque estos 3 campos
   * exporta el mismo HTML que antes de que existieran. Ver global/background.ts
   * y template/assemble.ts (la sección "fondo general").
   */
  fondoSize: z.enum(BACKGROUND_SIZE_VALUES).default('100% auto'),
  fondoPosition: z.enum(BACKGROUND_POSITION_VALUES).default('center top'),
  fondoRepeat: z.enum(BACKGROUND_REPEAT_VALUES).default('no-repeat'),

  /**
   * Fondo de HERO-SECTION (header + banner + imagen full width) y de
   * CONTENTS-SECTION (los módulos de body) — hasta acá una imagen fija del
   * maestro (siempre `DEFAULT_HERO_CONTENTS_BG_URL` de global/background.ts,
   * sin campo editable en la app), pedido explícito del usuario (2026-09-16)
   * para poder reemplazarla y controlar su tamaño/posición/repeat, igual que
   * fondoUrl. Quedan independientes entre sí (2 pares de campos, no 1
   * compartido).
   *
   * Default de URL/alt es VACÍO (pedido explícito del usuario, 2026-09-18,
   * que reemplaza la decisión anterior de arrancar con la imagen del
   * maestro): un documento nuevo sale sin esa imagen — mismo criterio de
   * "vacío = sin fondo" que fondoUrl. La imagen del maestro sigue
   * disponible como opción manual, no como default.
   *
   * Default de tamaño/posición = el mismo `100% auto` / `center top` que el
   * maestro ya trae en ambos `<td>`. Default de REPEAT es `'repeat'` (no
   * `'no-repeat'` como General): ninguno de los 2 `<td>` del maestro declara
   * `background-repeat`, así que el valor real vigente hoy es el inicial de
   * CSS — `repeat` en los 2 ejes — no lo que uno intuitivamente asumiría.
   */
  heroBgUrl: z.string().default(''),
  heroBgAlt: z.string().default('Imagen de fondo'),
  heroBgSize: z.enum(BACKGROUND_SIZE_VALUES).default('100% auto'),
  heroBgPosition: z.enum(BACKGROUND_POSITION_VALUES).default('center top'),
  heroBgRepeat: z.enum(BACKGROUND_REPEAT_VALUES).default('repeat'),

  /** Análogo a heroBg* — ver el comentario grande de arriba. */
  contentsBgUrl: z.string().default(''),
  contentsBgAlt: z.string().default('Imagen de fondo'),
  contentsBgSize: z.enum(BACKGROUND_SIZE_VALUES).default('100% auto'),
  contentsBgPosition: z.enum(BACKGROUND_POSITION_VALUES).default('center top'),
  contentsBgRepeat: z.enum(BACKGROUND_REPEAT_VALUES).default('repeat'),

  /**
   * `style_Look` del content block CTA-template — GLOBAL a propósito (pedido
   * explícito del usuario): un solo control, todas las instancias de CTA lo
   * leen al renderizar, así que cambiar el estilo en cualquier lado cambia
   * TODOS los CTA del mail a la vez. Ver components/cta/render.ts.
   *
   * Default es `'default'` (no un `style_Look` real): así el CTA sigue al
   * tema general hasta que el usuario elija un color específico a mano — ver
   * themeDefaults.ts#resolveCtaStyle, que resuelve el sentinel al momento de
   * renderizar.
   *
   * `z.preprocess` en vez de un `z.enum` liso: el select se redujo (ver
   * CTA_STYLE_SELECT_VALUES) DESPUÉS de que ya existían documentos guardados
   * en localStorage con un `ctaStyle` de los 11 valores retirados (ej. 'pro',
   * 'gris100', 'blanconeon') — sin este preprocess, `safeParse` (persistence.ts)
   * descartaría el documento COMPLETO al recargar, no solo este campo. Mismo
   * patrón que la migración de tags legacy (ver items/schemas.ts) — cualquier
   * valor que ya no sea elegible cae a 'default' en vez de tirar el documento.
   */
  ctaStyle: z.preprocess(
    (v) => ((CTA_STYLE_SELECT_VALUES as readonly unknown[]).includes(v) ? v : 'default'),
    z.enum(CTA_STYLE_SELECT_VALUES),
  ).default('default'),
})

export type GlobalFields = z.infer<typeof globalSchema>

export const defaultGlobalFields: GlobalFields = globalSchema.parse({})
