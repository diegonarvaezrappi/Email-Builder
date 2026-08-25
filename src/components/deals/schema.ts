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
// Las 7 piezas FIJAS que trae cada tarjeta debajo de la imagen (líneas de
// texto, precio, rating, tags, CTA) sí tienen un orden propio e independiente
// (`fields.pieceOrder`, pedido explícito del usuario para poder reordenarlas
// arrastrando en el lienzo, igual que las piezas de banner) — pero siguen
// siendo campos individuales de `dealCardFieldsSchema`, no una colección de
// objetos tipados: ver DEAL_CARD_PIECE_TYPES más abajo.
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

/**
 * Las 7 "moléculas" fijas que van debajo de la imagen del producto, en el
 * orden LITERAL del maestro (deal_columnas.html) — este array ES el orden
 * natural/default, no uno separado. "precio" agrupa markdown/coronaPro/
 * complemento1/complemento2 en una sola pieza movible (esos 4 campos siguen
 * editándose por separado en el panel, solo su bloque de HTML se mueve como
 * unidad); "rating" agrupa categoria/rating/tiempo de la misma forma. Pedido
 * explícito del usuario: poder reordenar estas piezas arrastrando en el
 * lienzo, igual que las piezas de banner — ver components/deals/render.ts
 * para cómo se ubican los límites de cada una en el HTML real, y
 * ui/Viewport.tsx para el drag-and-drop. La fila de "Legales" queda AFUERA
 * de este reorden a propósito: es una fila del PAR (compartida entre las 2
 * tarjetas), no de una tarjeta individual como estas 7.
 */
export const DEAL_CARD_PIECE_TYPES = ['copy1', 'copy2', 'precio', 'rating', 'tag1', 'tag2', 'cta'] as const
export type DealCardPieceType = (typeof DEAL_CARD_PIECE_TYPES)[number]

/**
 * Devuelve una permutación válida de los 7 tipos: descarta duplicados/tipos
 * inválidos y agrega al final, en orden natural, los que falten. Defensivo
 * contra un `pieceOrder` corrupto (localStorage viejo editado a mano, o un
 * bug futuro en el reducer) — a propósito NO se valida esto con un
 * `.refine()` en el schema: si el parse fallara, persistence.ts descartaría
 * el DOCUMENTO ENTERO (ver loadDocument), no solo esta tarjeta. Mejor
 * degradar acá que resetear el mail completo.
 */
export function normalizePieceOrder(order: readonly DealCardPieceType[]): DealCardPieceType[] {
  const seen = new Set<DealCardPieceType>()
  const clean: DealCardPieceType[] = []
  for (const type of order) {
    if (DEAL_CARD_PIECE_TYPES.includes(type) && !seen.has(type)) {
      seen.add(type)
      clean.push(type)
    }
  }
  for (const type of DEAL_CARD_PIECE_TYPES) {
    if (!seen.has(type)) clean.push(type)
  }
  return clean
}

/**
 * El maestro trae 2 formas de logo por celda, "Logo 1:1" (cuadrado) y "Logo
 * pastilla" (píldora ancha) — mismo `role="molecula-iconoL"` en los 2 `<img>`,
 * agregada sin `{% if %}` por el pull `bd9f4a5` (2026-08-21, ver
 * components/deals/render.ts, LOGO_PASTILLA_PLACEHOLDER). Antes de este
 * selector la app la ocultaba siempre (pieza "flagueada, no construida" —
 * mismo bucket que molecula_texto_pastilla.html de banners); pedido explícito
 * del usuario 2026-08-25 de exponerla como una 2da forma elegible.
 *
 * Una sola URL (`logoUrl` abajo) para las 2 formas, no 2 campos de URL
 * independientes: es el mismo logo del comercio, solo cambia el contenedor
 * (cuadrado 50×50 vs. píldora 23px de alto × hasta 150px de ancho) — decisión
 * de producto, el maestro no lo especifica (ninguna de las 2 formas viene
 * documentada en 05-docs, es contenido nuevo del pull).
 */
export const DEAL_LOGO_SHAPE_VALUES = ['cuadrado', 'pastilla'] as const
export type DealLogoShape = (typeof DEAL_LOGO_SHAPE_VALUES)[number]
export const DEAL_LOGO_SHAPE_LABELS: Record<DealLogoShape, string> = {
  cuadrado: 'Cuadrado',
  pastilla: 'Pastilla',
}

export const dealCardFieldsSchema = z.object({
  /** Va dentro de `background-image: url(...)` de la celda de imagen (no en un
   *  atributo), así que el render lo pasa por cssUrlValue, no por escapeHtmlAttr. */
  productImageUrl: z.string().default('https://images.rappi.com/products/77c714d6-2d05-493e-8f33-c66711864ca7.png'),
  /** Cuál de las 2 formas de logo del maestro se muestra — ver el comentario
   *  grande de DEAL_LOGO_SHAPE_VALUES arriba. Default 'cuadrado': preserva el
   *  comportamiento de siempre para toda tarjeta/documento ya existente. */
  logoShape: z.enum(DEAL_LOGO_SHAPE_VALUES).default('cuadrado'),
  /** Vacío = se elimina la etiqueta `<img>` completa, como pide el comentario
   *  del maestro ("si no hay url se debe eliminar la etiqueta de imagen por completo").
   *  Aplica a la forma que esté activa (`logoShape`); la forma inactiva se
   *  descarta entera sin importar este valor. */
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
  /** LINEA 3, espacio 3. El maestro trae `| Antes <del>$999</del>` — el `| `
   *  que lo separa de COMPLEMENTO 1 sigue fijo, pero "Antes" pasó a ser
   *  parte de este campo (pedido explícito del usuario 2026-08-25, antes era
   *  un literal fijo del maestro y solo el monto era editable): TODO el
   *  texto entra dentro del `<del>` (tachado) — "Antes" queda tachado junto
   *  con el precio — ver components/deals/render.ts, complemento2Edits. */
  complemento2Enabled: z.boolean().default(true),
  complemento2Text: z.string().default('Antes $999'),

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

  /** Orden en que las 7 piezas de arriba se pintan en el lienzo (y en el HTML
   *  exportado) — arranca en el orden literal del maestro (DEAL_CARD_PIECE_TYPES).
   *  Se reordena arrastrando cada pieza en el lienzo (ui/Viewport.tsx), igual
   *  que las piezas de banner; no hay UI de reorden en este panel. Un
   *  documento viejo de localStorage sin este campo recibe este mismo default
   *  al parsear (zod), retrocompatible sin más cambios. */
  pieceOrder: z.array(z.enum(DEAL_CARD_PIECE_TYPES)).default([...DEAL_CARD_PIECE_TYPES]),

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

// ============================================================================
// Panel scoped por LÍNEA (pedido explícito del usuario, inspirado en cómo
// selecciona/edita/elimina una pieza de banner): tocar una de las 7 piezas de
// la tarjeta en el lienzo abre un panel con SOLO los campos de esa línea, no
// el mega-panel de la tarjeta entera. Las 3 funciones de abajo son la lógica
// de datos que ese panel scoped (components/deals/panels.tsx) y el catálogo de
// "piezas ocultas" del panel de la tarjeta necesitan — ninguna es una acción
// del store, devuelven el DealCardFields completo listo para
// updateDealCardFields, mismo criterio que cloneDealsFields de arriba.
// ============================================================================

/** Etiqueta legible de cada pieza — badge del lienzo (ui/Viewport.tsx) y
 *  título del panel scoped de esa pieza. */
export const DEAL_CARD_PIECE_LABELS: Record<DealCardPieceType, string> = {
  copy1: 'Línea 1',
  copy2: 'Línea 2',
  precio: 'Precio',
  rating: 'Categoría y rating',
  tag1: 'Tag 1',
  tag2: 'Tag 2',
  cta: 'Llamado a la acción',
}

/**
 * Si una pieza está oculta (no imprime nada en el HTML exportado) — mismo
 * criterio que components/deals/render.ts usa para cortar el elemento entero:
 * copy1/copy2 vacíos borran su `<h4>`, precio/rating desaparecen solo si
 * NINGUNO de sus sub-campos está prendido (agrupan varios toggles en una sola
 * pieza movible, ver el comentario de DEAL_CARD_PIECE_TYPES), tag1/tag2/cta
 * tienen su propio enabled. Usado por el catálogo de "piezas ocultas" del
 * panel de la tarjeta (mismo patrón que `hiddenItems` en
 * components/banner/PropertiesPanel.tsx) — si esta lógica se desincroniza de
 * render.ts el catálogo mentiría sobre qué está realmente oculto, así que
 * cualquier cambio ahí debe reflejarse acá también.
 */
export function isDealCardPieceHidden(fields: DealCardFields, type: DealCardPieceType): boolean {
  switch (type) {
    case 'copy1':
      return fields.copy1.trim() === ''
    case 'copy2':
      return fields.copy2.trim() === ''
    case 'precio':
      return !fields.markdownEnabled && !fields.complemento1Enabled && !fields.complemento2Enabled
    case 'rating':
      return !fields.categoriaEnabled && !fields.ratingEnabled && !fields.tiempoEnabled
    case 'tag1':
      return !fields.tag1Enabled
    case 'tag2':
      return !fields.tag2Enabled
    case 'cta':
      return !fields.ctaEnabled
  }
}

/** "Eliminar esta línea" del panel scoped — apaga/vacía la pieza sin tocar
 *  las demás. Cada tipo de pieza fija se apaga distinto (ver arriba), así que
 *  no hay un solo booleano `enabled` genérico que tocar. */
export function hideDealCardPiece(fields: DealCardFields, type: DealCardPieceType): DealCardFields {
  switch (type) {
    case 'copy1':
      return { ...fields, copy1: '' }
    case 'copy2':
      return { ...fields, copy2: '' }
    case 'precio':
      return { ...fields, markdownEnabled: false, complemento1Enabled: false, complemento2Enabled: false }
    case 'rating':
      return { ...fields, categoriaEnabled: false, ratingEnabled: false, tiempoEnabled: false }
    case 'tag1':
      return { ...fields, tag1Enabled: false }
    case 'tag2':
      return { ...fields, tag2Enabled: false }
    case 'cta':
      return { ...fields, ctaEnabled: false }
  }
}

/**
 * Contrario de hideDealCardPiece — "+ Restablecer" del catálogo de piezas
 * ocultas: vuelve la pieza a sus valores DE FÁBRICA (defaultDealCardFields),
 * no a lo que tenía antes de ocultarla (esa memoria no se conserva — mismo
 * criterio que arrastrar una pieza de banner nueva, que no recuerda una
 * anterior ya borrada).
 */
export function restoreDealCardPiece(fields: DealCardFields, type: DealCardPieceType): DealCardFields {
  const d = defaultDealCardFields
  switch (type) {
    case 'copy1':
      return { ...fields, copy1: d.copy1 }
    case 'copy2':
      return { ...fields, copy2: d.copy2 }
    case 'precio':
      return {
        ...fields,
        markdownEnabled: d.markdownEnabled,
        markdownText: d.markdownText,
        coronaProEnabled: d.coronaProEnabled,
        complemento1Enabled: d.complemento1Enabled,
        complemento1Text: d.complemento1Text,
        complemento2Enabled: d.complemento2Enabled,
        complemento2Text: d.complemento2Text,
      }
    case 'rating':
      return {
        ...fields,
        categoriaEnabled: d.categoriaEnabled,
        categoriaText: d.categoriaText,
        ratingEnabled: d.ratingEnabled,
        ratingText: d.ratingText,
        tiempoEnabled: d.tiempoEnabled,
        tiempoText: d.tiempoText,
      }
    case 'tag1':
      return { ...fields, tag1Enabled: d.tag1Enabled, tag1IconUrl: d.tag1IconUrl, tag1Text: d.tag1Text }
    case 'tag2':
      return { ...fields, tag2Enabled: d.tag2Enabled, tag2IconUrl: d.tag2IconUrl, tag2Text: d.tag2Text }
    case 'cta':
      return { ...fields, ctaEnabled: d.ctaEnabled, ctaText: d.ctaText }
  }
}
