// ============================================================================
// Store principal (zustand + zundo). Mantiene el documento activo con
// undo/redo temporal y autosave (debounced) a localStorage.
// ============================================================================
import { create, useStore as useZustandStore } from 'zustand'
import { temporal } from 'zundo'
import type { BannerItem, ContentBlock, ContentBlockType, DealCard, DealsBlock, EmailDocument, HeroPiece, HeroPieceType, HeroSection } from '../model'
import type { BannerFields, BannerType } from '../components/banner/schema'
import type { HeaderFields } from '../components/header/schema'
import { defaultHeaderFields } from '../components/header/schema'
import {
  allHeroPieces,
  cloneBannerFields,
  cloneHeroSection,
  createBannerFields,
  findBannerByItem,
  isLastOfType,
  type HeroBackground,
} from '../components/hero/schema'
import { headerPatchForTheme, bannerBackgroundEnabledForTheme } from '../themeDefaults'
import type { BannerItemType } from '../components/banner/items/schemas'
import type { GlobalFields } from '../global/schema'
import { DEALS_MAX_CARDS, defaultDealCardFields, type DealCardFields, type DealCardPieceType } from '../components/deals/schema'
import { findDealsBlockByCard } from '../components/deals/blocks'
import { findModuleBlockByItem } from '../components/contentModules/blocks'
import { contentBlockRegistry } from '../contentBlockRegistry'
import { getBannerItemDef } from '../bannerItemRegistry'
import { getModuleItemDef } from '../bodyMoleculeRegistry'
import type { ModuleItem, ModuleItemType } from '../moduleItems/schemas'
import { applyImageModuleExclusivity, findImageModuleIndex, type ImageModuleType } from '../components/banner/exclusivity'
import { enforceHorizontalItemOrder } from '../components/banner/horizontalOrder'
import { bannerMoleculeAlignFor } from '../components/banner/schema'
import { newId } from '../ids'
import { loadDocument, saveDocument } from './persistence'
import { bannerItemKey, blockKey, dealCardKey, heroPieceKey, moduleItemKey } from '../tropicalize/keys'
import { copyTropicalization, diffShallow, pruneTropicalizations } from '../tropicalize/doc'
import { normalizeBranches, type TropicalizeBranch, type TropicalizeCountry } from '../tropicalize/schema'

interface BuilderState {
  document: EmailDocument
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  saveError: string | null
  /**
   * Escribe los campos de un slot por su `docKey` del registry. Genérico a
   * propósito: el panel de propiedades sale del registry, así que no puede
   * conocer un setter por slot. `unknown` porque el registry es dinámico —
   * lo que entra ya fue validado por el schema del slot.
   */
  setSlotFields: (docKey: keyof EmailDocument, fields: unknown) => void
  setGlobalFields: (fields: GlobalFields) => void

  /**
   * Operaciones sobre los Heros (doc.heroes, components/hero/schema.ts). Un
   * Hero entero se duplica, elimina y reordena, y tiene su propio fondo.
   * Siempre queda al menos uno: `removeHeroSection` no hace nada con el
   * último. `duplicateHeroSection` devuelve el id de la copia.
   */
  duplicateHeroSection: (id: string) => string | null
  removeHeroSection: (id: string) => void
  reorderHeroSection: (id: string, toIndex: number) => void
  updateHeroBackground: (id: string, background: HeroBackground) => void

  /**
   * Operaciones sobre las piezas de UN Hero (headers y banners, lista libre).
   * Mismo espíritu que las de contenidos. Cada Hero conserva al menos un
   * header y un banner: `removeHeroPiece` no hace nada si la pieza es la
   * última de su tipo en su Hero (la regla vive acá, no solo en el botón,
   * mismo criterio que DEALS_MAX_CARDS). Solo insertar recibe el Hero: las
   * demás lo buscan por el id de la pieza (único en todo el documento).
   *
   * `insertHeroPiece` devuelve el id de la pieza nueva, para seleccionarla.
   * Un banner nuevo lleva `bannerType` (default 'vertical').
   */
  insertHeroPiece: (sectionId: string, type: HeroPieceType, atIndex: number, bannerType?: BannerType) => string
  /** Devuelve el id de la copia (o null si no existe el original). */
  duplicateHeroPiece: (id: string) => string | null
  reorderHeroPiece: (id: string, toIndex: number) => void
  removeHeroPiece: (id: string) => void
  updateHeroPieceFields: (id: string, fields: unknown) => void

  /**
   * Operaciones sobre doc.contenidos (el array de bloques de CONTENIDOS, hoy
   * solo CTA). A diferencia de setSlotFields (un reemplazo de campo completo,
   * perfecto para un booleano simple como `removed` en un slot removable),
   * acá hay aritmética real de índices — vale una acción dedicada por
   * operación, testeable sola.
   */
  insertContentBlock: (type: ContentBlockType, atIndex: number) => void
  duplicateContentBlock: (id: string) => void
  reorderContentBlock: (id: string, toIndex: number) => void
  removeContentBlock: (id: string) => void
  updateContentBlockFields: (id: string, fields: unknown) => void

  /**
   * Mismo espíritu que las acciones de contenidos, un nivel más adentro (las
   * piezas de UN banner del Hero). Solo `insertBannerItem` y
   * `setBannerImageModule` reciben el banner: las demás lo buscan por el id
   * de la pieza (único en todo el documento, ver findBannerByItem). `insertBannerItem`/`duplicateBannerItem` aplican
   * además la única regla de exclusión dura del maestro (imagen fija vs.
   * automática, ver components/banner/exclusivity.ts) ANTES de calcular el
   * índice de inserción, para que `atIndex` se interprete contra la lista ya
   * filtrada.
   */
  insertBannerItem: (bannerId: string, type: BannerItemType, atIndex: number) => void
  duplicateBannerItem: (id: string) => void
  reorderBannerItem: (id: string, toIndex: number) => void
  removeBannerItem: (id: string) => void
  updateBannerItemFields: (id: string, fields: unknown) => void

  /**
   * Cambia (o agrega) el módulo de imagen del banner horizontal — IMG_FIJA e
   * IMG_AUTOMATICA_MODULO son mutuamente excluyentes (ver exclusivity.ts). A
   * diferencia de insertBannerItem, reemplaza en el MISMO índice si ya había
   * un módulo de imagen, en vez de sacarlo y agregar el nuevo al final — así
   * el selector de tipo de imagen del panel derecho no reordena el resto de
   * las piezas del banner.
   */
  setBannerImageModule: (bannerId: string, type: ImageModuleType) => void

  /**
   * Operaciones sobre las tarjetas de un bloque DEALS (doc.contenidos → el
   * bloque de tipo DEALS → fields.items). Mismo espíritu que las de banner, dos
   * niveles adentro, con 2 diferencias:
   *  - Solo `insert` recibe el id del bloque: los ids de tarjeta son únicos en
   *    todo el documento (newId()), así que las demás ubican su bloque dueño
   *    buscando quién contiene esa tarjeta. Es lo que permite que Viewport pase
   *    solo el cardId que leyó del marcador DCARD.
   *  - `insert`/`duplicate` no hacen nada si el bloque ya llegó a
   *    DEALS_MAX_CARDS. El tope va acá (no solo deshabilitando el botón) por el
   *    mismo motivo que la exclusividad de imagen del banner vive en el store:
   *    es una regla del maestro, no una decoración de la UI.
   */
  insertDealCard: (blockId: string, atIndex: number) => void
  duplicateDealCard: (cardId: string) => void
  reorderDealCard: (cardId: string, toIndex: number) => void
  removeDealCard: (cardId: string) => void
  updateDealCardFields: (cardId: string, fields: unknown) => void

  /**
   * Reordena las 7 piezas fijas de UNA tarjeta (fields.pieceOrder) — mismo
   * espíritu que reorderDealCard, un nivel más adentro. `pieceType` identifica
   * la pieza arrastrada (no tiene id propio, a diferencia de una tarjeta o de
   * una pieza de banner: son 7 tipos fijos, uno de cada por tarjeta).
   */
  reorderDealCardPiece: (cardId: string, pieceType: DealCardPieceType, toIndex: number) => void

  /**
   * Operaciones sobre las moléculas del ÁREA LIBRE de un módulo de body (hoy
   * TITLE, ver components/contentModules/blocks.ts) — mismo espíritu que las
   * de banner/deals, pero el bloque dueño se busca en vez de recibirse (mismo
   * criterio que las de tarjeta de deal: los ids de item son únicos en todo el
   * documento). `insertModuleItem` sí recibe `blockId` + `areaKey` porque para
   * INSERTAR hace falta saber DÓNDE — no hay ningún item existente del que
   * deducirlo. `atIndex`/`toIndex` se interpretan contra los items de esa
   * MISMA área (no contra la lista completa del bloque, que puede tener más de
   * un área en un módulo futuro).
   */
  insertModuleItem: (blockId: string, areaKey: string, type: ModuleItemType, atIndex: number) => void
  duplicateModuleItem: (itemId: string) => void
  reorderModuleItem: (itemId: string, toIndex: number) => void
  removeModuleItem: (itemId: string) => void
  updateModuleItemFields: (itemId: string, fields: unknown) => void

  /**
   * Reemplaza el documento ENTERO — usado por la pestaña "Importar" (subir un
   * .json exportado antes con "Descargar JSON", ver ui/ImportPanel.tsx). El
   * JSON ya llega VALIDADO por `emailDocumentSchema.safeParse` antes de
   * llamar acá (misma validación que loadDocument usa al leer localStorage);
   * esta acción no vuelve a parsear, solo pisa `document`. Un `set` más, así
   * que entra al historial de undo/redo igual que cualquier otro cambio — un
   * import accidental se deshace con "Deshacer", no hace falta un diálogo de
   * confirmación aparte.
   */
  setDocument: (doc: EmailDocument) => void

  /**
   * Operaciones sobre `doc.tropicalizations` (condicionales de país por
   * elemento, ver src/tropicalize/) — keyeadas por la clave plana de
   * tropicalize/keys.ts (`slot:HEADER`, `block:<id>`, `bitem:<id>`,
   * `dcard:<id>`, `mitem:<id>`), no por un id de rama: las ramas no tienen
   * id propio, se direccionan por índice (el orden ES la precedencia
   * if/elsif), mismo criterio que `pieceOrder` en components/deals/schema.ts.
   * Todas aplican `normalizeBranches` y BORRAN la clave del mapa cuando
   * queda sin ramas — así el camino rápido byte-idéntico de
   * tropicalize/render.ts vuelve a aplicar en cuanto no queda nada que
   * emitir.
   */
  addTropicalizeBranch: (key: string, countries: TropicalizeCountry[]) => void
  setTropicalizeBranchCountries: (key: string, index: number, countries: TropicalizeCountry[]) => void
  setTropicalizeBranchHidden: (key: string, index: number, hidden: boolean) => void
  /**
   * Recibe el objeto de fields COMPLETO que devolvió el `PropertiesPanel` de
   * la rama (`onChange`, mismo contrato que cualquier otro panel de la app)
   * y calcula el `diffShallow` contra `baseFields` acá adentro — así ningún
   * `PropertiesPanel` existente necesita saber que está editando una rama en
   * vez de la base.
   */
  setTropicalizeBranchFields: (key: string, index: number, baseFields: unknown, nextFields: unknown) => void
  removeTropicalizeBranch: (key: string, index: number) => void
  reorderTropicalizeBranch: (key: string, index: number, toIndex: number) => void
  /** "Quitar toda la tropicalización de este elemento" — borra la clave del
   *  mapa entera, todas sus ramas de una vez. */
  clearTropicalization: (key: string) => void
}

/** Reescribe la lista de tarjetas de un bloque DEALS dejando el resto del
 *  documento intacto — el patrón se repite en las 5 acciones. */
function withDealCards(document: EmailDocument, blockIndex: number, items: DealCard[]): EmailDocument {
  const block = document.contenidos[blockIndex] as DealsBlock
  const contenidos = [...document.contenidos]
  contenidos[blockIndex] = { ...block, fields: { ...block.fields, items } }
  return { ...document, contenidos }
}

/** Mismo patrón que withDealCards, un nivel más arriba: el bloque dueño puede
 *  ser cualquier tipo que marque `usesModuleItems` (hoy solo TITLE), no un
 *  único tipo fijo — por eso castea contra `ContentBlock` genérico en vez de
 *  un tipo de bloque puntual. */
function withModuleItems(document: EmailDocument, blockIndex: number, items: ModuleItem[]): EmailDocument {
  const block = document.contenidos[blockIndex]
  const contenidos = [...document.contenidos]
  contenidos[blockIndex] = { ...block, fields: { ...block.fields, items } } as ContentBlock
  return { ...document, contenidos }
}

/**
 * Reescribe las ramas de UNA tropicalización, dejando el resto del mapa
 * intacto — aplica `normalizeBranches` y BORRA la clave si queda sin ramas
 * (mismo motivo que documenta la interfaz `BuilderState` arriba). Patrón
 * análogo a withDealCards/withModuleItems, un mapa en vez de un array.
 */
function withTropicalizationBranches(document: EmailDocument, key: string, branches: TropicalizeBranch[]): EmailDocument {
  const normalized = normalizeBranches(branches)
  const tropicalizations = { ...document.tropicalizations }
  if (normalized.length === 0) {
    delete tropicalizations[key]
  } else {
    tropicalizations[key] = { branches: normalized }
  }
  return { ...document, tropicalizations }
}

/** Reescribe la lista de piezas del Hero que contiene `pieceId` (o el Hero
 *  `sectionId`) con `fn`, dejando el resto del documento intacto. */
function withSectionPieces(
  document: EmailDocument,
  match: { sectionId?: string; pieceId?: string },
  fn: (pieces: HeroPiece[]) => HeroPiece[],
): EmailDocument {
  const heroes = document.heroes.map((section): HeroSection => {
    const hit = match.sectionId ? section.id === match.sectionId : section.pieces.some((p) => p.id === match.pieceId)
    return hit ? { ...section, pieces: fn(section.pieces) } : section
  })
  return { ...document, heroes }
}

/** Reescribe los campos de UN banner (o header) por su id, en el Hero que sea. */
function withPieceFields(document: EmailDocument, pieceId: string, fields: unknown): EmailDocument {
  return withSectionPieces(document, { pieceId }, (pieces) =>
    pieces.map((p) => (p.id === pieceId ? ({ ...p, fields } as HeroPiece) : p)),
  )
}

const withBannerFields = (document: EmailDocument, bannerId: string, fields: BannerFields) =>
  withPieceFields(document, bannerId, fields)

/** Campos del banner `bannerId` (null si no es un banner). */
function bannerAt(document: EmailDocument, bannerId: string): { fields: BannerFields } | null {
  const piece = allHeroPieces(document.heroes).find((p) => p.id === bannerId && p.type === 'BANNER')
  return piece ? { fields: piece.fields as BannerFields } : null
}

/** Cambios más cercanos que esto entre sí se deshacen juntos (ver handleSet). */
export const HISTORY_BURST_MS = 500
let lastChangeAt = 0

/** El próximo cambio después de deshacer/rehacer siempre abre una entrada
 *  nueva, aunque llegue enseguida. */
export function undoOnce() {
  lastChangeAt = 0
  useBuilder.temporal.getState().undo()
}

export function redoOnce() {
  lastChangeAt = 0
  useBuilder.temporal.getState().redo()
}

export const useBuilder = create<BuilderState>()(
  temporal(
    (set) => ({
      document: loadDocument(),
      saveStatus: 'idle',
      saveError: null,
      setSlotFields: (docKey, fields) =>
        set((s) => ({ document: { ...s.document, [docKey]: fields } as EmailDocument })),
      setGlobalFields: (fields) => set((s) => ({ document: { ...s.document, global: fields } })),

      duplicateHeroSection: (id) => {
        let copyId: string | null = null
        set((s) => {
          const idx = s.document.heroes.findIndex((h) => h.id === id)
          if (idx === -1) return s
          const { section, pieceIds, itemIds } = cloneHeroSection(s.document.heroes[idx])
          // Cada pieza y cada pieza de banner se lleva la tropicalización de su original.
          let tropicalizations = s.document.tropicalizations
          for (const piece of s.document.heroes[idx].pieces) {
            tropicalizations = copyTropicalization(tropicalizations, heroPieceKey(piece.type, piece.id), heroPieceKey(piece.type, pieceIds.get(piece.id)!))
          }
          for (const [from, to] of itemIds) tropicalizations = copyTropicalization(tropicalizations, bannerItemKey(from), bannerItemKey(to))
          const heroes = [...s.document.heroes]
          heroes.splice(idx + 1, 0, section)
          copyId = section.id
          return { document: { ...s.document, heroes, tropicalizations } }
        })
        return copyId
      },

      removeHeroSection: (id) =>
        set((s) => {
          if (s.document.heroes.length <= 1 || !s.document.heroes.some((h) => h.id === id)) return s
          return { document: pruneTropicalizations({ ...s.document, heroes: s.document.heroes.filter((h) => h.id !== id) }) }
        }),

      reorderHeroSection: (id, toIndex) =>
        set((s) => {
          const from = s.document.heroes.findIndex((h) => h.id === id)
          if (from === -1) return s
          const adjusted = toIndex > from ? toIndex - 1 : toIndex
          const heroes = [...s.document.heroes]
          const [moved] = heroes.splice(from, 1)
          heroes.splice(Math.max(0, Math.min(adjusted, heroes.length)), 0, moved)
          return { document: { ...s.document, heroes } }
        }),

      updateHeroBackground: (id, background) =>
        set((s) => ({
          document: { ...s.document, heroes: s.document.heroes.map((h) => (h.id === id ? { ...h, background } : h)) },
        })),

      insertHeroPiece: (sectionId, type, atIndex, bannerType = 'vertical') => {
        const id = newId()
        set((s) => {
          if (!s.document.heroes.some((h) => h.id === sectionId)) return s
          const tema = s.document.global.tema
          // Una pieza nueva arranca ajustada al tema activo, igual que la que
          // ya estaba cuando se eligió el tema (App.tsx aplica estas mismas
          // reglas al cambiarlo, ver themeDefaults.ts).
          let piece: HeroPiece
          if (type === 'HEADER') {
            const fields: HeaderFields = { ...defaultHeaderFields, ...(headerPatchForTheme(defaultHeaderFields, tema, null) ?? {}) }
            piece = { id, type, fields }
          } else {
            const fields = createBannerFields(bannerType)
            const backgroundEnabled = bannerBackgroundEnabledForTheme(fields, tema, null)
            piece = { id, type, fields: backgroundEnabled === null ? fields : { ...fields, backgroundEnabled } }
          }
          const document = withSectionPieces(s.document, { sectionId }, (pieces) => {
            const next = [...pieces]
            next.splice(Math.max(0, Math.min(atIndex, next.length)), 0, piece)
            return next
          })
          return { document }
        })
        return id
      },

      duplicateHeroPiece: (id) => {
        const copyId = newId()
        let done = false
        set((s) => {
          const original = allHeroPieces(s.document.heroes).find((p) => p.id === id)
          if (!original) return s
          let tropicalizations = copyTropicalization(
            s.document.tropicalizations,
            heroPieceKey(original.type, id),
            heroPieceKey(original.type, copyId),
          )
          let copy: HeroPiece
          if (original.type === 'BANNER') {
            // Las piezas del banner necesitan ids nuevos (son únicos en todo el
            // documento) — y cada una se lleva la tropicalización de su original.
            const cloned = cloneBannerFields(original.fields)
            for (const [from, to] of cloned.idMap) {
              tropicalizations = copyTropicalization(tropicalizations, bannerItemKey(from), bannerItemKey(to))
            }
            copy = { id: copyId, type: 'BANNER', fields: cloned.fields }
          } else {
            copy = { ...original, id: copyId }
          }
          const document = withSectionPieces(s.document, { pieceId: id }, (pieces) => {
            const next = [...pieces]
            next.splice(pieces.findIndex((p) => p.id === id) + 1, 0, copy)
            return next
          })
          done = true
          return { document: { ...document, tropicalizations } }
        })
        return done ? copyId : null
      },

      /** `toIndex` se interpreta contra la lista de SU Hero, ANTES de sacar la
       *  pieza arrastrada — misma convención que reorderContentBlock. */
      reorderHeroPiece: (id, toIndex) =>
        set((s) => {
          if (!allHeroPieces(s.document.heroes).some((p) => p.id === id)) return s
          const document = withSectionPieces(s.document, { pieceId: id }, (pieces) => {
            const from = pieces.findIndex((p) => p.id === id)
            const adjusted = toIndex > from ? toIndex - 1 : toIndex
            const next = [...pieces]
            const [moved] = next.splice(from, 1)
            next.splice(Math.max(0, Math.min(adjusted, next.length)), 0, moved)
            return next
          })
          return { document }
        }),

      removeHeroPiece: (id) =>
        set((s) => {
          const section = s.document.heroes.find((h) => h.pieces.some((p) => p.id === id))
          if (!section || isLastOfType(section.pieces, id)) return s
          const document = withSectionPieces(s.document, { pieceId: id }, (pieces) => pieces.filter((p) => p.id !== id))
          return { document: pruneTropicalizations(document) }
        }),

      updateHeroPieceFields: (id, fields) => set((s) => ({ document: withPieceFields(s.document, id, fields) })),

      insertContentBlock: (type, atIndex) =>
        set((s) => {
          const def = contentBlockRegistry[type]
          if (!def) return s
          // createDefaultFields (si el tipo lo define, ver DEALS en
          // contentBlockRegistry.ts) fabrica un `fields` fresco por instancia
          // — necesario para tipos con ids propios adentro de `fields`, donde
          // reusar el mismo `defaultFields` en 2 inserciones haría que ambas
          // instancias compartieran esos ids.
          const fields = def.createDefaultFields ? def.createDefaultFields() : def.defaultFields
          const block = { id: newId(), type, fields } as ContentBlock
          const next = [...s.document.contenidos]
          next.splice(Math.max(0, Math.min(atIndex, next.length)), 0, block)
          return { document: { ...s.document, contenidos: next } }
        }),

      duplicateContentBlock: (id) =>
        set((s) => {
          const idx = s.document.contenidos.findIndex((b) => b.id === id)
          if (idx === -1) return s
          const original = s.document.contenidos[idx]
          const def = contentBlockRegistry[original.type]
          // cloneFields (ver nota de arriba) preserva los valores del usuario
          // pero regenera cualquier id propio adentro de `fields` — mismo
          // motivo que createDefaultFields, la copia no puede compartirlos
          // con el original.
          const fields = def?.cloneFields ? def.cloneFields(original.fields) : original.fields
          const copy = { ...original, id: newId(), fields } as ContentBlock
          const next = [...s.document.contenidos]
          next.splice(idx + 1, 0, copy)
          // La copia hereda la tropicalización del bloque ORIGINAL (exacta
          // para un bloque sin ids propios adentro de `fields`; para un
          // contenedor como TITLE/DEALS los hijos duplicados no heredan la
          // suya — ver la nota grande de tropicalize/doc.ts#copyTropicalization).
          const tropicalizations = copyTropicalization(s.document.tropicalizations, blockKey(id), blockKey(copy.id))
          return { document: { ...s.document, contenidos: next, tropicalizations } }
        }),

      /**
       * `toIndex` se interpreta contra el array ANTES de sacar el bloque
       * arrastrado (misma convención que produce resolveDropIndex en
       * ui/Viewport.tsx) — quien llama no tiene que restarle 1 por sí mismo.
       * El ajuste vive acá porque es el único lugar donde hace falta
       * acertarlo, y así se puede testear con un array fijo.
       */
      reorderContentBlock: (id, toIndex) =>
        set((s) => {
          const from = s.document.contenidos.findIndex((b) => b.id === id)
          if (from === -1) return s
          const adjusted = toIndex > from ? toIndex - 1 : toIndex
          const next = [...s.document.contenidos]
          const [moved] = next.splice(from, 1)
          next.splice(Math.max(0, Math.min(adjusted, next.length)), 0, moved)
          return { document: { ...s.document, contenidos: next } }
        }),

      removeContentBlock: (id) =>
        set((s) => ({
          document: pruneTropicalizations({ ...s.document, contenidos: s.document.contenidos.filter((b) => b.id !== id) }),
        })),

      updateContentBlockFields: (id, fields) =>
        set((s) => ({
          document: {
            ...s.document,
            contenidos: s.document.contenidos.map((b) => (b.id === id ? ({ ...b, fields } as ContentBlock) : b)),
          },
        })),

      insertBannerItem: (bannerId, type, atIndex) =>
        set((s) => {
          const def = getBannerItemDef(type)
          const banner = bannerAt(s.document, bannerId)
          if (!def || !banner) return s
          // Un CTA nuevo arranca alineado como el resto de piezas del banner.
          const fields = type === 'CTA_INTERNO' ? { ...def.defaultFields, align: bannerMoleculeAlignFor(banner.fields) } : def.defaultFields
          const item = { id: newId(), type, fields } as BannerItem
          const filtered = applyImageModuleExclusivity(banner.fields.items, type)
          const next = [...filtered]
          next.splice(Math.max(0, Math.min(atIndex, next.length)), 0, item)
          const ordered = enforceHorizontalItemOrder(next, banner.fields.bannerType)
          return { document: withBannerFields(s.document, bannerId, { ...banner.fields, items: ordered }) }
        }),

      duplicateBannerItem: (id) =>
        set((s) => {
          const owner = findBannerByItem(allHeroPieces(s.document.heroes), id)
          if (!owner) return s
          const banner = owner.piece.fields
          const idx = banner.items.findIndex((it) => it.id === id)
          const original = banner.items[idx]
          const copy = { ...original, id: newId() } as BannerItem
          // Si el propio original es un módulo de imagen, applyImageModuleExclusivity
          // lo saca de `filtered` (no puede convivir con su propia copia) — por
          // eso la posición de inserción se calcula contando cuántos items
          // ANTES del original sobrevivieron el filtro, no buscando el id del
          // original (que puede haber desaparecido). Si el original SÍ
          // sobrevive (caso normal, no es un módulo de imagen), la copia va
          // justo DESPUÉS de él (+1); si no sobrevive, la copia toma su lugar.
          const filtered = applyImageModuleExclusivity(banner.items, original.type)
          const originalSurvives = filtered.includes(original)
          const survivingBefore = banner.items.slice(0, idx).filter((it) => filtered.includes(it)).length
          const insertAt = survivingBefore + (originalSurvives ? 1 : 0)
          const next = [...filtered]
          next.splice(insertAt, 0, copy)
          const ordered = enforceHorizontalItemOrder(next, banner.bannerType)
          const document = withBannerFields(s.document, owner.piece.id, { ...banner, items: ordered })
          const tropicalizations = copyTropicalization(document.tropicalizations, bannerItemKey(id), bannerItemKey(copy.id))
          return { document: { ...document, tropicalizations } }
        }),

      reorderBannerItem: (id, toIndex) =>
        set((s) => {
          const owner = findBannerByItem(allHeroPieces(s.document.heroes), id)
          if (!owner) return s
          const banner = owner.piece.fields
          const from = banner.items.findIndex((it) => it.id === id)
          const adjusted = toIndex > from ? toIndex - 1 : toIndex
          const next = [...banner.items]
          const [moved] = next.splice(from, 1)
          next.splice(Math.max(0, Math.min(adjusted, next.length)), 0, moved)
          const ordered = enforceHorizontalItemOrder(next, banner.bannerType)
          return { document: withBannerFields(s.document, owner.piece.id, { ...banner, items: ordered }) }
        }),

      removeBannerItem: (id) =>
        set((s) => {
          const owner = findBannerByItem(allHeroPieces(s.document.heroes), id)
          if (!owner) return s
          const banner = owner.piece.fields
          const items = banner.items.filter((it) => it.id !== id)
          return { document: pruneTropicalizations(withBannerFields(s.document, owner.piece.id, { ...banner, items })) }
        }),

      updateBannerItemFields: (id, fields) =>
        set((s) => {
          const owner = findBannerByItem(allHeroPieces(s.document.heroes), id)
          if (!owner) return s
          const banner = owner.piece.fields
          const items = banner.items.map((it) => (it.id === id ? ({ ...it, fields } as BannerItem) : it))
          return { document: withBannerFields(s.document, owner.piece.id, { ...banner, items }) }
        }),

      setBannerImageModule: (bannerId, type) =>
        set((s) => {
          const def = getBannerItemDef(type)
          const banner = bannerAt(s.document, bannerId)
          if (!def || !banner) return s
          const items = banner.fields.items
          const idx = findImageModuleIndex(items)
          const newItem = { id: newId(), type, fields: def.defaultFields } as BannerItem
          const next = [...items]
          if (idx === -1) next.push(newItem)
          else next[idx] = newItem
          const ordered = enforceHorizontalItemOrder(next, banner.fields.bannerType)
          return { document: withBannerFields(s.document, bannerId, { ...banner.fields, items: ordered }) }
        }),

      insertDealCard: (blockId, atIndex) =>
        set((s) => {
          const index = s.document.contenidos.findIndex((b) => b.id === blockId && b.type === 'DEALS')
          if (index === -1) return s
          const block = s.document.contenidos[index] as DealsBlock
          if (block.fields.items.length >= DEALS_MAX_CARDS) return s
          const items = [...block.fields.items]
          items.splice(Math.max(0, Math.min(atIndex, items.length)), 0, { id: newId(), fields: defaultDealCardFields })
          return { document: withDealCards(s.document, index, items) }
        }),

      duplicateDealCard: (cardId) =>
        set((s) => {
          const found = findDealsBlockByCard(s.document.contenidos, cardId)
          if (!found) return s
          if (found.block.fields.items.length >= DEALS_MAX_CARDS) return s
          const cardIndex = found.block.fields.items.findIndex((c) => c.id === cardId)
          const newCardId = newId()
          const items = [...found.block.fields.items]
          items.splice(cardIndex + 1, 0, { ...items[cardIndex], id: newCardId })
          const document = withDealCards(s.document, found.index, items)
          const tropicalizations = copyTropicalization(document.tropicalizations, dealCardKey(cardId), dealCardKey(newCardId))
          return { document: { ...document, tropicalizations } }
        }),

      /** `toIndex` se interpreta contra el array ANTES de sacar la tarjeta
       *  arrastrada — misma convención que reorderContentBlock/reorderBannerItem. */
      reorderDealCard: (cardId, toIndex) =>
        set((s) => {
          const found = findDealsBlockByCard(s.document.contenidos, cardId)
          if (!found) return s
          const from = found.block.fields.items.findIndex((c) => c.id === cardId)
          const adjusted = toIndex > from ? toIndex - 1 : toIndex
          const items = [...found.block.fields.items]
          const [moved] = items.splice(from, 1)
          items.splice(Math.max(0, Math.min(adjusted, items.length)), 0, moved)
          return { document: withDealCards(s.document, found.index, items) }
        }),

      removeDealCard: (cardId) =>
        set((s) => {
          const found = findDealsBlockByCard(s.document.contenidos, cardId)
          if (!found) return s
          const items = found.block.fields.items.filter((c) => c.id !== cardId)
          return { document: pruneTropicalizations(withDealCards(s.document, found.index, items)) }
        }),

      updateDealCardFields: (cardId, fields) =>
        set((s) => {
          const found = findDealsBlockByCard(s.document.contenidos, cardId)
          if (!found) return s
          const items = found.block.fields.items.map((c) => (c.id === cardId ? { ...c, fields: fields as DealCardFields } : c))
          return { document: withDealCards(s.document, found.index, items) }
        }),

      /** `toIndex` se interpreta contra `pieceOrder` ANTES de sacar la pieza
       *  arrastrada — misma convención que reorderDealCard/reorderBannerItem. */
      reorderDealCardPiece: (cardId, pieceType, toIndex) =>
        set((s) => {
          const found = findDealsBlockByCard(s.document.contenidos, cardId)
          if (!found) return s
          const card = found.block.fields.items.find((c) => c.id === cardId)
          if (!card) return s
          const order = card.fields.pieceOrder
          const from = order.indexOf(pieceType)
          if (from === -1) return s
          const adjusted = toIndex > from ? toIndex - 1 : toIndex
          const nextOrder = [...order]
          const [moved] = nextOrder.splice(from, 1)
          nextOrder.splice(Math.max(0, Math.min(adjusted, nextOrder.length)), 0, moved)
          const items = found.block.fields.items.map((c) =>
            c.id === cardId ? { ...c, fields: { ...c.fields, pieceOrder: nextOrder } } : c,
          )
          return { document: withDealCards(s.document, found.index, items) }
        }),

      insertModuleItem: (blockId, areaKey, type, atIndex) =>
        set((s) => {
          const index = s.document.contenidos.findIndex((b) => b.id === blockId && contentBlockRegistry[b.type]?.usesModuleItems)
          if (index === -1) return s
          const def = getModuleItemDef(type)
          if (!def) return s
          const allItems = (s.document.contenidos[index].fields as { items: ModuleItem[] }).items
          const areaItems = allItems.filter((it) => it.areaKey === areaKey)
          const otherItems = allItems.filter((it) => it.areaKey !== areaKey)
          const newItem = { id: newId(), areaKey, type, fields: def.defaultFields } as ModuleItem
          const nextAreaItems = [...areaItems]
          nextAreaItems.splice(Math.max(0, Math.min(atIndex, nextAreaItems.length)), 0, newItem)
          return { document: withModuleItems(s.document, index, [...otherItems, ...nextAreaItems]) }
        }),

      duplicateModuleItem: (itemId) =>
        set((s) => {
          const found = findModuleBlockByItem(s.document.contenidos, itemId)
          if (!found) return s
          const itemIndex = found.items.findIndex((it) => it.id === itemId)
          const copy = { ...found.items[itemIndex], id: newId() } as ModuleItem
          const items = [...found.items]
          items.splice(itemIndex + 1, 0, copy)
          const document = withModuleItems(s.document, found.index, items)
          const tropicalizations = copyTropicalization(document.tropicalizations, moduleItemKey(itemId), moduleItemKey(copy.id))
          return { document: { ...document, tropicalizations } }
        }),

      /** `toIndex` se interpreta contra los items de la MISMA área que el item
       *  arrastrado (no toda la lista del bloque) — misma convención que
       *  reorderDealCardPiece acotado a las 7 piezas de su propia tarjeta. */
      reorderModuleItem: (itemId, toIndex) =>
        set((s) => {
          const found = findModuleBlockByItem(s.document.contenidos, itemId)
          if (!found) return s
          const item = found.items.find((it) => it.id === itemId)
          if (!item) return s
          const areaItems = found.items.filter((it) => it.areaKey === item.areaKey)
          const otherItems = found.items.filter((it) => it.areaKey !== item.areaKey)
          const from = areaItems.findIndex((it) => it.id === itemId)
          const adjusted = toIndex > from ? toIndex - 1 : toIndex
          const nextAreaItems = [...areaItems]
          const [moved] = nextAreaItems.splice(from, 1)
          nextAreaItems.splice(Math.max(0, Math.min(adjusted, nextAreaItems.length)), 0, moved)
          return { document: withModuleItems(s.document, found.index, [...otherItems, ...nextAreaItems]) }
        }),

      removeModuleItem: (itemId) =>
        set((s) => {
          const found = findModuleBlockByItem(s.document.contenidos, itemId)
          if (!found) return s
          return {
            document: pruneTropicalizations(withModuleItems(s.document, found.index, found.items.filter((it) => it.id !== itemId))),
          }
        }),

      updateModuleItemFields: (itemId, fields) =>
        set((s) => {
          const found = findModuleBlockByItem(s.document.contenidos, itemId)
          if (!found) return s
          const items = found.items.map((it) => (it.id === itemId ? ({ ...it, fields } as ModuleItem) : it))
          return { document: withModuleItems(s.document, found.index, items) }
        }),

      setDocument: (doc) => set(() => ({ document: pruneTropicalizations(doc) })),

      addTropicalizeBranch: (key, countries) =>
        set((s) => {
          const branches = [...(s.document.tropicalizations[key]?.branches ?? []), { countries, hidden: false, overrides: {} }]
          return { document: withTropicalizationBranches(s.document, key, branches) }
        }),

      setTropicalizeBranchCountries: (key, index, countries) =>
        set((s) => {
          const existing = s.document.tropicalizations[key]?.branches ?? []
          if (index < 0 || index >= existing.length) return s
          const branches = existing.map((b, i) => (i === index ? { ...b, countries } : b))
          return { document: withTropicalizationBranches(s.document, key, branches) }
        }),

      setTropicalizeBranchHidden: (key, index, hidden) =>
        set((s) => {
          const existing = s.document.tropicalizations[key]?.branches ?? []
          if (index < 0 || index >= existing.length) return s
          const branches = existing.map((b, i) => (i === index ? { ...b, hidden } : b))
          return { document: withTropicalizationBranches(s.document, key, branches) }
        }),

      setTropicalizeBranchFields: (key, index, baseFields, nextFields) =>
        set((s) => {
          const existing = s.document.tropicalizations[key]?.branches ?? []
          if (index < 0 || index >= existing.length) return s
          const overrides = diffShallow(baseFields as object, nextFields as object)
          const branches = existing.map((b, i) => (i === index ? { ...b, overrides } : b))
          return { document: withTropicalizationBranches(s.document, key, branches) }
        }),

      removeTropicalizeBranch: (key, index) =>
        set((s) => {
          const existing = s.document.tropicalizations[key]?.branches ?? []
          const branches = existing.filter((_, i) => i !== index)
          return { document: withTropicalizationBranches(s.document, key, branches) }
        }),

      /** `toIndex` se interpreta contra las ramas ANTES de sacar la
       *  arrastrada — misma convención que reorderContentBlock/reorderBannerItem. */
      reorderTropicalizeBranch: (key, index, toIndex) =>
        set((s) => {
          const existing = s.document.tropicalizations[key]?.branches ?? []
          if (index < 0 || index >= existing.length) return s
          const adjusted = toIndex > index ? toIndex - 1 : toIndex
          const branches = [...existing]
          const [moved] = branches.splice(index, 1)
          branches.splice(Math.max(0, Math.min(adjusted, branches.length)), 0, moved)
          return { document: withTropicalizationBranches(s.document, key, branches) }
        }),

      clearTropicalization: (key) =>
        set((s) => {
          if (!(key in s.document.tropicalizations)) return s
          const tropicalizations = { ...s.document.tropicalizations }
          delete tropicalizations[key]
          return { document: { ...s.document, tropicalizations } }
        }),
    }),
    {
      limit: 100,
      // Solo el documento entra al historial de undo/redo (no el saveStatus).
      partialize: (s) => ({ document: s.document }),
      // Sin esto, los setState del autosave ('saving' → 'saved') dejaban
      // entradas con el MISMO documento y Deshacer necesitaba varios clicks.
      equality: (past, current) => past.document === current.document,
      // Una ráfaga de cambios seguidos (tipear, o un cambio de tema más los
      // ajustes que App.tsx aplica en el acto) es UNA sola entrada. Se guarda
      // el estado de ANTES de la ráfaga y en el momento, sin temporizador: así
      // un Deshacer justo después de editar no pisa un registro pendiente.
      handleSet: (handleSet) => (pastState, replace) => {
        const now = Date.now()
        const inBurst = now - lastChangeAt < HISTORY_BURST_MS
        lastChangeAt = now
        if (!inBurst) handleSet(pastState, replace)
      },
    },
  ),
)

// --- Autosave (debounced) ----------------------------------------------------
let saveTimer: ReturnType<typeof setTimeout> | undefined
useBuilder.subscribe((state, prev) => {
  if (state.document === prev.document) return
  useBuilder.setState({ saveStatus: 'saving' })
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    const res = saveDocument(useBuilder.getState().document)
    useBuilder.setState(
      res.ok ? { saveStatus: 'saved', saveError: null } : { saveStatus: 'error', saveError: res.error },
    )
  }, 800)
})

// --- Hook reactivo para el estado de undo/redo -------------------------------
export function useTemporal() {
  const past = useZustandStore(useBuilder.temporal, (s) => s.pastStates.length)
  const future = useZustandStore(useBuilder.temporal, (s) => s.futureStates.length)
  return {
    canUndo: past > 0,
    canRedo: future > 0,
    undo: undoOnce,
    redo: redoOnce,
  }
}
