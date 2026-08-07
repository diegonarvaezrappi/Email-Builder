// ============================================================================
// Campos de una tarjeta de deal y del bloque DEALS que las contiene.
//
// El maestro (02-components/04_content-modules/deals/deal_columnas.html) arma
// los deals SIEMPRE de a dos, en una sola `<table role="module">` con 3 filas
// (imágenes / textos / legales) y 2 celdas por fila — una celda por tarjeta.
//
// Cada BLOQUE DEALS de CONTENIDOS es exactamente UNA fila (hasta 2 tarjetas) —
// no una lista libre de tarjetas como en un primer diseño de esto. Pedido
// explícito del usuario: poder arrastrar "Deals" desde la librería tantas
// veces como quiera, cada arrastre agrega una fila nueva e independiente, así
// se pueden intercalar otros bloques (ej. un CTA) ENTRE dos filas de deals —
// exactamente el mismo patrón repetible que ya tiene CTA (components/cta/),
// solo que acá una "instancia" son 2 tarjetas en vez de 1 texto. Reordenar
// FILAS usa el mecanismo genérico de bloques de CONTENIDOS que ya existe
// (CONTENT_BLOCK_REORDER_DRAG_TYPE); reordenar/editar/vaciar las 2 TARJETAS
// dentro de una fila usa las acciones dedicadas de abajo.
//
// 05-docs/USO-DE-CADA-PARTE.md §11 documenta "deals (max 4)" como tope
// recomendado por mail — ACÁ NO SE APLICA a propósito: el usuario pidió
// explícitamente levantar ese límite para poder diseñar layouts con varias
// filas de deals separadas por otros contenidos. Decisión de producto de este
// proyecto, no del maestro.
//
// A diferencia del banner, acá hay UN solo tipo de molécula (la tarjeta), así
// que no hay unión discriminada: `type` no existe, alcanza con `{ id, fields }`.
// ============================================================================
import { z } from 'zod'
import { newId } from '../../ids'

/** "los deeals vienen de a dos en celdas" (comentario de apertura del maestro):
 *  cada copia de deal_columnas.html renderiza 2 tarjetas, una por celda — y
 *  por lo mismo, cada bloque DEALS (una fila) nunca tiene más de 2. */
export const DEALS_CARDS_PER_PAIR = 2

/**
 * Tope POR BLOQUE (una fila = un par): coincide con DEALS_CARDS_PER_PAIR
 * porque un bloque ES una fila, nunca más. El botón "+ Agregar deal" del
 * panel solo tiene sentido para volver a llenar una celda vaciada — para más
 * FILAS, se arrastra "Deals" de nuevo desde la librería (ver el comentario
 * grande de arriba sobre por qué ya no hay un tope total por mail).
 */
export const DEALS_MAX_CARDS = DEALS_CARDS_PER_PAIR

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
 * defaultBannerFields: mantienen `defaultDealsFields` en sí determinista para
 * tests/documentación.
 *
 * OJO — este objeto NO es lo que usa la inserción real (ver
 * createDefaultDealsFields más abajo): como ahora se pueden arrastrar varias
 * filas de DEALS, reutilizar estos 2 ids fijos en cada fila nueva haría que 2
 * bloques compartieran cards con el MISMO id — y findDealsBlockByCard (y las
 * acciones de store.ts que dependen de ella) asumen que un id de tarjeta es
 * único en TODO el documento. `defaultDealsFields` queda solo como valor de
 * referencia (el `defaultFields` que pide ContentBlockDef); la inserción real
 * pasa por `createDefaultDealsFields()`, que genera 2 ids frescos cada vez.
 */
export const defaultDealsFields: DealsFields = {
  items: [
    { id: 'deals-card-1-default', fields: defaultDealCardFields },
    { id: 'deals-card-2-default', fields: defaultDealCardFields },
  ],
}

/** Usado por `insertContentBlock` (vía `ContentBlockDef.createDefaultFields`)
 *  para CADA fila nueva que se arrastra desde la librería — 2 ids frescos, así
 *  ninguna fila colisiona con otra ya existente en el documento. */
export function createDefaultDealsFields(): DealsFields {
  return {
    items: [
      { id: newId(), fields: defaultDealCardFields },
      { id: newId(), fields: defaultDealCardFields },
    ],
  }
}

/**
 * Usado por `duplicateContentBlock` (vía `ContentBlockDef.cloneFields`) para
 * duplicar una fila EXISTENTE: preserva los valores que el usuario ya cargó en
 * cada tarjeta, pero les asigna ids nuevos — mismo motivo que
 * createDefaultDealsFields, la copia no puede compartir ids con el original.
 */
export function cloneDealsFields(fields: DealsFields): DealsFields {
  return { items: fields.items.map((card) => ({ ...card, id: newId() })) }
}
