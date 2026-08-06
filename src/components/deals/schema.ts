// ============================================================================
// Campos de una tarjeta de deal y del bloque DEALS que las contiene.
//
// El maestro (02-components/04_content-modules/deals/deal_columnas.html) arma
// los deals SIEMPRE de a dos, en una sola `<table role="module">` con 3 filas
// (imágenes / textos / legales) y 2 celdas por fila — una celda por tarjeta.
// Acá el modelo NO es "un par": es una lista plana de tarjetas, y
// components/deals/render.ts las agrupa de a 2 al renderizar. Así una tarjeta
// se agrega/duplica/reordena/elimina sola, igual que una pieza de banner
// (doc.banner.items), en vez de tener que pensar en pares.
//
// A diferencia del banner, acá hay UN solo tipo de molécula, así que no hay
// unión discriminada: `type` no existe, alcanza con `{ id, fields }`.
// ============================================================================
import { z } from 'zod'

/** "los deeals vienen de a dos en celdas" (comentario de apertura del maestro):
 *  cada copia de deal_columnas.html renderiza 2 tarjetas, una por celda. */
export const DEALS_CARDS_PER_PAIR = 2

/**
 * Tope documentado: "deals (max 4)" (05-docs/USO-DE-CADA-PARTE.md §11, "Orden
 * recomendado de uso") — justo 2 pares completos. Es por MAIL, no por bloque:
 * el bloque lo aplica sobre su propia lista (store/store.ts) y
 * ui/LibraryPanel.tsx impide insertar un 2º bloque DEALS, que es lo que cierra
 * la puerta a superarlo por acumulación.
 */
export const DEALS_MAX_CARDS = DEALS_CARDS_PER_PAIR * 2

/**
 * Límite de 2 líneas por celda: cada celda mide ~50% de 480px (≈230px) y el
 * título va en h4 (14px/15px, bold), así que entran ~27-28 caracteres por
 * línea. El maestro lo resuelve con `| truncate: 50` en su propio ejemplo de
 * campos, pero ese ejemplo vive en head-meta-tags.html (fuera del archivo del
 * deal) y la app lo borra del HTML exportado junto con los `{% assign %}`
 * muertos — ver stripDealsFieldAssigns en components/deals/render.ts. Sin ese
 * truncate de Liquid, el corte tiene que estar acá.
 */
export const DEALS_COPY_MAX_LENGTH = 50

export const dealCardFieldsSchema = z.object({
  /** Va dentro de `background-image: url(...)` de la celda de imagen (no en un
   *  atributo), así que el render lo pasa por cssUrlValue, no por escapeHtmlAttr. */
  productImageUrl: z.string().default('https://images.rappi.com/products/77c714d6-2d05-493e-8f33-c66711864ca7.png'),
  /** Vacío = se elimina la etiqueta `<img>` completa, como pide el comentario
   *  del maestro ("si no hay url se debe eliminar la etiqueta de imagen por completo"). */
  logoUrl: z.string().default('https://lh3.googleusercontent.com/d/1ZYWddltBXkpcjXzkdlT2fqWSSR2HYB-j'),
  /** Reemplaza el token de relleno manual LINKDEAL de ESTA celda. Los deals son
   *  el único módulo de contenido que viene clickeable por defecto
   *  (02-components/04_content-modules/_contenidos_wrapper.html). */
  link: z.string().default(''),

  /** LINEA 1 del maestro — va en `<strong>`, negrita por estructura. Vacío =
   *  se elimina el `<h4>` entero. */
  copy1: z.string().max(DEALS_COPY_MAX_LENGTH).default('Promo especial'),
  /** LINEA 2 — mismo `<h4>` sin negrita. Vacío = se elimina la etiqueta. */
  copy2: z.string().max(DEALS_COPY_MAX_LENGTH).default('Descripción del deal'),

  /** LINEA 3, espacio 1: el badge de descuento (`role="MARKDOWN"`). */
  markdownEnabled: z.boolean().default(true),
  markdownText: z.string().default('$999'),
  /** La "Corona Pro" que va pegada al precio dentro del badge — el maestro pide
   *  explícitamente poder activarla y desactivarla sin tocar el resto. */
  coronaProEnabled: z.boolean().default(true),

  /** LINEA 3, espacio 2. */
  complemento1Enabled: z.boolean().default(true),
  complemento1Text: z.string().default('99% OFF'),
  /** LINEA 3, espacio 3. Solo el precio: el maestro trae `| Antes <del>$999</del>`
   *  y el `<del>` (tachado) + el prefijo "| Antes" quedan fijos — lo editable es
   *  el monto, que es lo que cambia por deal. */
  complemento2Enabled: z.boolean().default(true),
  complemento2Text: z.string().default('$999'),

  /** Fila TEXTOS RATING: categoría, rating (con su estrella) y tiempo (con su
   *  reloj). Los 2 íconos son fijos en el maestro — no hay campo para cambiarlos. */
  categoriaEnabled: z.boolean().default(true),
  categoriaText: z.string().default('Italiana'),
  ratingEnabled: z.boolean().default(true),
  ratingText: z.string().default('4.9'),
  tiempoEnabled: z.boolean().default(true),
  tiempoText: z.string().default('xx min.'),

  /**
   * TAG1 y TAG2 son 2 slots FIJOS, no una lista 0-2 como los TAGS del banner:
   * el maestro hardcodea 2 posiciones con 2 íconos distintos por defecto, no 2
   * copias intercambiables del mismo pill (y el render los desambigua justamente
   * por esos íconos). El toggle es la lectura literal del comentario del maestro
   * "se debe poder cambiar o quitar el ícono, si se quita, se elimina la div
   * completa": sin ícono no hay pill, así que apagar el tag borra el `<div>` entero.
   */
  tag1Enabled: z.boolean().default(true),
  tag1IconUrl: z.string().default('https://lh3.googleusercontent.com/d/1rofiEyeYdjqVsiEL3-NWsOfXOSMQRVNa'),
  tag1Text: z.string().default('tag 1'),
  tag2Enabled: z.boolean().default(true),
  tag2IconUrl: z.string().default('https://lh3.googleusercontent.com/d/19wcynrgz0OqdDt5S5fVf7yaSx7rAN4Fn'),
  tag2Text: z.string().default('tag 2'),

  /** LLAMADO A LA ACCION — texto plano dentro de un `<strong>`, sin botón. */
  ctaEnabled: z.boolean().default(true),
  ctaText: z.string().default('Pide ahora ⤍'),

  /**
   * Fila de legales: "viene desactivada por defecto" (maestro), de ahí el
   * `false`. El toggle es POR TARJETA pero la fila es del PAR: si cualquiera de
   * las 2 tarjetas del par lo activa, la fila aparece para ambas celdas y la
   * que no lo activó queda con el texto vacío (nunca se borra la celda) — ver
   * components/deals/render.ts.
   */
  legalEnabled: z.boolean().default(false),
  legalText: z.string().default('Aplican términos y condiciones |'),
})
export type DealCardFields = z.infer<typeof dealCardFieldsSchema>
export const defaultDealCardFields: DealCardFields = dealCardFieldsSchema.parse({})

export const dealCardSchema = z.object({
  id: z.string(),
  fields: dealCardFieldsSchema,
})
export type DealCard = z.infer<typeof dealCardSchema>

export const dealsFieldsSchema = z.object({
  items: z.array(dealCardSchema).max(DEALS_MAX_CARDS).default([]),
})
export type DealsFields = z.infer<typeof dealsFieldsSchema>

/**
 * El `items: []` del schema queda puro/determinista; qué trae un bloque DEALS
 * recién insertado vive acá — mismo reparto que bannerSchema/defaultBannerFields.
 * Arranca con 2 tarjetas (un par completo) en vez de 1: el maestro renderiza de
 * a dos, así que con una sola el usuario vería media fila y una celda vacía sin
 * entender por qué. Ids fijos (no newId()) a propósito, igual que
 * defaultBannerFields: mantienen los tests deterministas, y duplicar una
 * tarjeta siempre genera un id nuevo.
 */
export const defaultDealsFields: DealsFields = {
  items: [
    { id: 'deals-card-1-default', fields: defaultDealCardFields },
    { id: 'deals-card-2-default', fields: defaultDealCardFields },
  ],
}
