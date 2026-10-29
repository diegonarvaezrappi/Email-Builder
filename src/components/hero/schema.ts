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
// ============================================================================
import { z } from 'zod'
import { defaultHeaderFields, headerSchema, type HeaderFields } from '../header/schema'
import { bannerSchema, defaultBannerFields, type BannerFields, type BannerType } from '../banner/schema'
import type { BannerItem } from '../banner/items/schemas'
import { newId } from '../../ids'

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

/**
 * Documento guardado antes del 2026-10-28 (`header` + `banner` sueltos, sin
 * `hero`): se convierte a la lista con los ids por defecto, y sus
 * tropicalizaciones `slot:HEADER`/`slot:BANNER` pasan a apuntar a esas piezas
 * — así un mail viejo (localStorage o un JSON importado) se abre igual que
 * antes. Corre como `z.preprocess` del schema del documento (model.ts).
 */
export function migrateLegacyHero(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw
  const doc = raw as Record<string, unknown>
  if ('hero' in doc) return raw
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
  return { ...rest, hero }
}
