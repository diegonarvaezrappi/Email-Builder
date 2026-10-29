// ============================================================================
// El HERO como lista libre de piezas — pedido del usuario (2026-10-28):
// "que se pueda duplicar el header y el banner cuantas veces se requiera".
//
// Hasta entonces el documento tenía UN `header` y UN `banner` (singletons). El
// maestro sigue describiendo un solo header y un solo banner por mail (root
// CLAUDE.md §1.1), así que esto es una decisión de PRODUCTO de la app, no una
// regla del maestro. Dos decisiones explícitas del usuario:
//
//  - Lista libre: headers y banners se duplican por separado y quedan en UNA
//    sola lista ordenada del Hero (header, banner, banner, header, banner…).
//  - Un link por banner: con un solo banner el HTML queda igual que el maestro
//    (un <a> para todo el Hero); con varios, cada banner lleva su propio <a> y
//    los headers quedan sin link — ver template/assemble.ts#renderHero.
//
// Siempre queda al menos un header y un banner (el store no deja eliminar el
// último de cada tipo): el banner ya era "no removible" por decisión de
// producto (2026-08-03), y el maestro exige un header.
//
// 2026-10-29, segundo pedido: "los heros también deben poder duplicarse". El
// documento pasa a tener una LISTA de Heros (`doc.heroes`), cada uno con su
// propio fondo (decisión del usuario: "fondo propio por Hero") y su propia
// lista de piezas. Cada Hero es una copia entera de la sección
// `role="HERO-SECTION"` del maestro, con su `<a>`; la regla de links de
// arriba vale DENTRO de cada Hero. La regla "al menos un header y un banner"
// también es por Hero, y siempre queda al menos un Hero.
// ============================================================================
import { z } from 'zod'
import { defaultHeaderFields, headerSchema, type HeaderFields } from '../header/schema'
import { bannerSchema, defaultBannerFields, type BannerFields, type BannerType } from '../banner/schema'
import type { BannerItem } from '../banner/items/schemas'
import { newId } from '../../ids'
import {
  BACKGROUND_POSITION_VALUES,
  BACKGROUND_REPEAT_VALUES,
  BACKGROUND_SIZE_VALUES,
} from '../../global/background'

export interface HeroHeaderPiece {
  id: string
  type: 'HEADER'
  fields: HeaderFields
}

export interface HeroBannerPiece {
  id: string
  type: 'BANNER'
  fields: BannerFields
}

export type HeroPiece = HeroHeaderPiece | HeroBannerPiece
export type HeroPieceType = HeroPiece['type']

export const heroPieceSchema = z.discriminatedUnion('type', [
  z.object({ id: z.string(), type: z.literal('HEADER'), fields: headerSchema }),
  z.object({ id: z.string(), type: z.literal('BANNER'), fields: bannerSchema }),
])

export const HERO_PIECE_LABELS: Record<HeroPieceType, string> = {
  HEADER: 'Header',
  BANNER: 'Banner',
}

/** Ids fijos del Hero por defecto (no newId()), mismo motivo que
 *  'banner-tags-default': mantener defaultEmailDocument determinista para
 *  tests. También son los ids que recibe un documento viejo al migrarse. */
export const DEFAULT_HERO_HEADER_ID = 'hero-header-default'
export const DEFAULT_HERO_BANNER_ID = 'hero-banner-default'

export const defaultHero: HeroPiece[] = [
  { id: DEFAULT_HERO_HEADER_ID, type: 'HEADER', fields: defaultHeaderFields },
  { id: DEFAULT_HERO_BANNER_ID, type: 'BANNER', fields: defaultBannerFields },
]

/**
 * Las piezas de un banner llevan id propio, único en TODO el documento (las
 * acciones del store y los marcadores BITEM del lienzo buscan al dueño por
 * ese id). Un banner nuevo o duplicado necesita ids frescos: reusar los de
 * defaultBannerFields o los del original haría que 2 banners compartieran
 * piezas. Devuelve además el mapa viejo → nuevo, para copiar la
 * tropicalización de cada pieza al duplicar.
 */
export function cloneBannerFields(fields: BannerFields): { fields: BannerFields; idMap: Map<string, string> } {
  const idMap = new Map<string, string>()
  const items = fields.items.map((item): BannerItem => {
    const id = newId()
    idMap.set(item.id, id)
    return { ...item, id } as BannerItem
  })
  return { fields: { ...fields, items }, idMap }
}

/** Un banner nuevo: las piezas de ejemplo del banner por defecto, con ids
 *  propios, en la orientación pedida. */
export function createBannerFields(bannerType: BannerType): BannerFields {
  return { ...cloneBannerFields(defaultBannerFields).fields, bannerType }
}

export const heroHeaders = (hero: HeroPiece[]): HeroHeaderPiece[] =>
  hero.filter((p): p is HeroHeaderPiece => p.type === 'HEADER')

export const heroBanners = (hero: HeroPiece[]): HeroBannerPiece[] =>
  hero.filter((p): p is HeroBannerPiece => p.type === 'BANNER')

export const findHeroPiece = (hero: HeroPiece[], id: string): HeroPiece | undefined => hero.find((p) => p.id === id)

/** El banner que contiene una pieza — los ids de pieza son únicos en todo el
 *  documento, así que el dueño se BUSCA (mismo criterio que
 *  findDealsBlockByCard / findModuleBlockByItem). */
export function findBannerByItem(hero: HeroPiece[], itemId: string): { piece: HeroBannerPiece; index: number } | null {
  const index = hero.findIndex((p) => p.type === 'BANNER' && p.fields.items.some((it) => it.id === itemId))
  return index === -1 ? null : { piece: hero[index] as HeroBannerPiece, index }
}

/** Si eliminar esta pieza dejaría al Hero sin ningún header o sin ningún
 *  banner — el store no lo permite y la UI desactiva el botón. */
export function isLastOfType(hero: HeroPiece[], id: string): boolean {
  const piece = findHeroPiece(hero, id)
  if (!piece) return false
  return hero.filter((p) => p.type === piece.type).length <= 1
}

/**
 * "Header", "Banner 1", "Banner 2"… — numerado solo cuando el tipo se repite,
 * igual que los bloques de Contents (ui/componentTreeModel.ts#blockLabels).
 */
export function heroPieceLabels(hero: HeroPiece[]): Map<string, string> {
  const total = new Map<HeroPieceType, number>()
  for (const p of hero) total.set(p.type, (total.get(p.type) ?? 0) + 1)
  const seen = new Map<HeroPieceType, number>()
  const labels = new Map<string, string>()
  for (const p of hero) {
    const base = HERO_PIECE_LABELS[p.type]
    if ((total.get(p.type) ?? 0) < 2) {
      labels.set(p.id, base)
      continue
    }
    const position = (seen.get(p.type) ?? 0) + 1
    seen.set(p.type, position)
    labels.set(p.id, `${base} ${position}`)
  }
  return labels
}

export const heroPieceLabel = (hero: HeroPiece[], id: string): string =>
  heroPieceLabels(hero).get(id) ?? HERO_PIECE_LABELS[findHeroPiece(hero, id)?.type ?? 'HEADER']

// --- Los Heros (secciones) --------------------------------------------------

/**
 * El fondo de UN Hero. Mismos nombres de campo que los `heroBg*` de
 * global/schema.ts (donde vivía cuando había un solo Hero) a propósito: así
 * los paneles de fondo existentes (ui/BackgroundFields.tsx) se reusan tal
 * cual, dándoles `{ ...doc.global, ...hero.background }`.
 */
export const heroBackgroundSchema = z.object({
  heroBgUrl: z.string().default(''),
  heroBgAlt: z.string().default('Imagen de fondo'),
  heroBgSize: z.enum(BACKGROUND_SIZE_VALUES).default('100% auto'),
  heroBgPosition: z.enum(BACKGROUND_POSITION_VALUES).default('center top'),
  heroBgRepeat: z.enum(BACKGROUND_REPEAT_VALUES).default('repeat'),
})
export type HeroBackground = z.infer<typeof heroBackgroundSchema>
export const HERO_BACKGROUND_KEYS = Object.keys(heroBackgroundSchema.shape) as (keyof HeroBackground)[]

/** Solo los 5 campos de fondo de un objeto más grande (ej. el que devuelven
 *  los paneles de fondo, que trabajan sobre `{ ...global, ...background }`). */
export function pickHeroBackground(value: Partial<Record<keyof HeroBackground, unknown>>): HeroBackground {
  return heroBackgroundSchema.parse(Object.fromEntries(HERO_BACKGROUND_KEYS.map((k) => [k, value[k]])))
}

export interface HeroSection {
  id: string
  background: HeroBackground
  pieces: HeroPiece[]
}

export const heroSectionSchema = z.object({
  id: z.string(),
  background: heroBackgroundSchema.default({}),
  pieces: z.array(heroPieceSchema),
})

export const DEFAULT_HERO_SECTION_ID = 'hero-section-default'

export const defaultHeroSections: HeroSection[] = [
  { id: DEFAULT_HERO_SECTION_ID, background: heroBackgroundSchema.parse({}), pieces: defaultHero },
]

/** Todas las piezas de todos los Heros, en orden — para buscar por id (los ids
 *  son únicos en todo el documento) y para numerar ("Banner 3"). */
export const allHeroPieces = (heroes: HeroSection[]): HeroPiece[] => heroes.flatMap((h) => h.pieces)

export const findHeroSection = (heroes: HeroSection[], id: string): HeroSection | undefined => heroes.find((h) => h.id === id)

/** El Hero que contiene una pieza (header/banner) o una pieza de banner. */
export function findSectionByPiece(heroes: HeroSection[], pieceId: string): HeroSection | undefined {
  return heroes.find((h) => h.pieces.some((p) => p.id === pieceId))
}

export function findSectionByBannerItem(heroes: HeroSection[], itemId: string): HeroSection | undefined {
  return heroes.find((h) => h.pieces.some((p) => p.type === 'BANNER' && p.fields.items.some((it) => it.id === itemId)))
}

/** Si eliminar esta pieza dejaría a SU Hero sin header o sin banner. */
export function isLastOfTypeInSection(heroes: HeroSection[], pieceId: string): boolean {
  const section = findSectionByPiece(heroes, pieceId)
  return section ? isLastOfType(section.pieces, pieceId) : false
}

/** "Hero" con uno solo; "Hero 1", "Hero 2"… con varios. */
export function heroSectionLabel(heroes: HeroSection[], id: string): string {
  if (heroes.length < 2) return 'Hero'
  return `Hero ${heroes.findIndex((h) => h.id === id) + 1}`
}

/**
 * Copia profunda de un Hero con ids nuevos para él, sus piezas y las piezas
 * de sus banners (todos únicos en el documento). Devuelve los pares viejo →
 * nuevo de cada nivel, para copiar sus tropicalizaciones.
 */
export function cloneHeroSection(section: HeroSection): {
  section: HeroSection
  pieceIds: Map<string, string>
  itemIds: Map<string, string>
} {
  const pieceIds = new Map<string, string>()
  const itemIds = new Map<string, string>()
  const pieces = section.pieces.map((piece): HeroPiece => {
    const id = newId()
    pieceIds.set(piece.id, id)
    if (piece.type === 'HEADER') return { ...piece, id }
    const cloned = cloneBannerFields(piece.fields)
    for (const [from, to] of cloned.idMap) itemIds.set(from, to)
    return { id, type: 'BANNER', fields: cloned.fields }
  })
  return { section: { id: newId(), background: { ...section.background }, pieces }, pieceIds, itemIds }
}

/**
 * Documentos guardados con una forma anterior del Hero (localStorage o un JSON
 * importado) — corre como `z.preprocess` del schema del documento (model.ts):
 *
 *  - antes del 2026-10-28: `header` + `banner` sueltos. Pasan a ser las
 *    piezas por defecto, y sus tropicalizaciones `slot:HEADER`/`slot:BANNER`
 *    apuntan a esas piezas;
 *  - 2026-10-28: `hero` (una sola lista de piezas). Pasa a ser el único Hero.
 *
 * En los 2 casos el fondo del Hero sale de los `heroBg*` de `global`, donde
 * vivía cuando había un solo Hero. El mail se abre igual que antes.
 */
export function migrateLegacyHero(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw
  const doc = raw as Record<string, unknown>
  if ('heroes' in doc) return raw
  const asSection = (pieces: unknown, rest: Record<string, unknown>) => {
    const global = (rest.global && typeof rest.global === 'object' ? rest.global : {}) as Record<string, unknown>
    const background = Object.fromEntries(HERO_BACKGROUND_KEYS.filter((k) => k in global).map((k) => [k, global[k]]))
    return [{ id: DEFAULT_HERO_SECTION_ID, background, pieces }]
  }
  if ('hero' in doc) {
    const { hero, ...rest } = doc
    return { ...rest, heroes: asSection(hero, rest) }
  }
  if (!('header' in doc) && !('banner' in doc)) return raw

  const { header, banner, ...rest } = doc
  const hero = [
    { id: DEFAULT_HERO_HEADER_ID, type: 'HEADER', fields: header ?? defaultHeaderFields },
    { id: DEFAULT_HERO_BANNER_ID, type: 'BANNER', fields: banner ?? defaultBannerFields },
  ]

  const tropicalizations = rest.tropicalizations
  if (tropicalizations && typeof tropicalizations === 'object') {
    const renamed: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(tropicalizations as Record<string, unknown>)) {
      if (key === 'slot:HEADER') renamed[`header:${DEFAULT_HERO_HEADER_ID}`] = value
      else if (key === 'slot:BANNER') renamed[`banner:${DEFAULT_HERO_BANNER_ID}`] = value
      else renamed[key] = value
    }
    rest.tropicalizations = renamed
  }
  return { ...rest, heroes: asSection(hero, rest) }
}

/**
 * El Hero "activo" para lo que se agrega o edita desde la pestaña Hero (las
 * cards de agregar, la tarjeta de fondo): el que contiene lo seleccionado —el
 * Hero mismo, uno de sus headers/banners o una pieza de sus banners—; si la
 * selección no está en ningún Hero, el último.
 */
export function activeHeroSectionId(
  heroes: HeroSection[],
  selected: { heroSectionId?: string; heroId?: string; bannerItemId?: string } | null,
): string {
  const fromSelection =
    (selected?.heroSectionId && findHeroSection(heroes, selected.heroSectionId)) ||
    (selected?.heroId && findSectionByPiece(heroes, selected.heroId)) ||
    (selected?.bannerItemId && findSectionByBannerItem(heroes, selected.bannerItemId)) ||
    undefined
  return (fromSelection || heroes[heroes.length - 1]).id
}
