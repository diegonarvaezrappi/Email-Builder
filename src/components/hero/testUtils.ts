// ============================================================================
// Ayudas para tests que hablan del "header" o del "banner" de un documento
// como cuando eran singletons (antes del 2026-10-28, ver ./schema.ts). Los
// tests de render/store de UN banner siguen teniendo sentido tal cual: operan
// sobre el primer banner (y el primer header) del primer Hero.
// ============================================================================
import type { EmailDocument } from '../../model'
import type { BannerFields } from '../banner/schema'
import type { HeaderFields } from '../header/schema'
import { allHeroPieces, heroBanners, heroHeaders, type HeroPiece, type HeroSection } from './schema'

type WithHeroes = Pick<EmailDocument, 'heroes'>

export const bannerPieceOf = (doc: WithHeroes) => {
  const banner = heroBanners(allHeroPieces(doc.heroes))[0]
  if (!banner) throw new Error('el documento no tiene banners')
  return banner
}

export const headerPieceOf = (doc: WithHeroes) => {
  const header = heroHeaders(allHeroPieces(doc.heroes))[0]
  if (!header) throw new Error('el documento no tiene headers')
  return header
}

/** Los campos del primer banner del Hero. */
export const bannerOf = (doc: WithHeroes): BannerFields => bannerPieceOf(doc).fields

/** Los campos del primer header del Hero. */
export const headerOf = (doc: WithHeroes): HeaderFields => headerPieceOf(doc).fields

/** El documento con UN Hero (el primero, con su fondo) cuyas piezas son `pieces`. */
export function withPieces(doc: EmailDocument, pieces: HeroPiece[]): EmailDocument {
  const [first] = doc.heroes
  return { ...doc, heroes: [{ ...first, pieces }] }
}

type LegacyDoc = Omit<EmailDocument, 'heroes'> & { heroes?: HeroSection[]; banner?: BannerFields; header?: HeaderFields }

/**
 * Un documento armado a la manera de antes (`{ ...doc, banner: {...} }`): el
 * `banner`/`header` sueltos reemplazan los campos del primer banner/header.
 */
export function legacy(input: LegacyDoc): EmailDocument {
  const { banner, header, heroes, ...rest } = input
  if (!heroes) throw new Error('legacy(): faltan los heroes de base (spreadear un documento real)')
  const firstBanner = bannerPieceOf({ heroes }).id
  const firstHeader = headerPieceOf({ heroes }).id
  const replaced = heroes.map((section) => ({
    ...section,
    pieces: section.pieces.map((p): HeroPiece => {
      if (banner && p.id === firstBanner) return { ...p, type: 'BANNER', fields: banner } as HeroPiece
      if (header && p.id === firstHeader) return { ...p, type: 'HEADER', fields: header } as HeroPiece
      return p
    }),
  }))
  return { ...rest, heroes: replaced } as EmailDocument
}
